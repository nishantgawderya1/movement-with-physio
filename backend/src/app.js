'use strict';

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const env = require('./config/env'); // Validate env on startup

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const corsOptions = require('./config/cors');
const swaggerSpec = require('./config/swagger');
const requestLogger = require('./core/middleware/requestLogger');
const correlationId = require('./core/middleware/correlationId');
const responseTimer = require('./core/middleware/responseTimer');
const { defaultLimiter } = require('./core/middleware/rateLimiter');
const errorHandler = require('./core/middleware/errorHandler');

// Module routes
const authRoutes = require('./modules/auth/auth.routes');
const patientRoutes = require('./modules/patient/patient.routes');
const therapistRoutes = require('./modules/therapist/therapist.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const bookingRoutes = require('./modules/booking/booking.routes');
const assessmentRoutes = require('./modules/assessment/assessment.routes');

const PluginManager = require('./core/plugins/PluginManager');

/**
 * Build the Express app.
 * Separated from server.js for testability.
 * @param {object} container - DI container with all providers
 * @returns {express.Application}
 */
function createApp(container) {
  const app = express();

  // ── Security headers ────────────────────────────────────────
  app.use(helmet());
  app.use(cors(corsOptions));

  // ── Body parsing ─────────────────────────────────────────────
  // Webhook route needs raw body for Svix signature verification
  app.use('/api/v1/auth/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── NoSQL injection sanitization ────────────────────────────
  app.use(mongoSanitize());

  // ── Correlation ID + timing ─────────────────────────────────
  app.use(correlationId);
  app.use(responseTimer);

  // ── Logging ──────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Health check (no auth, no logging) ──────────────────────
  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [System]
   *     summary: Health check
   *     security: []
   */
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV,
      ts: new Date().toISOString(),
    });
  });

  // ── API docs (dev/staging only) ──────────────────────────────
  if (['development', 'staging'].includes(process.env.NODE_ENV)) {
    const swaggerUi = require('swagger-ui-express');
    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  // ── Integration diagnostics (dev only) ───────────────────────
  if (['development', 'staging'].includes(process.env.NODE_ENV)) {
    app.get('/api/v1/diag', async (req, res) => {
      const { createClerkClient } = require('@clerk/express');
      const adminSdk = require('firebase-admin');
      const { Resend } = require('resend');
      const results = {};

      // ── Clerk ────────────────────────────────────────────────
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const { totalCount } = await clerk.users.getUserList({ limit: 1 });
        results.clerk = { ok: true, totalUsers: totalCount, key: process.env.CLERK_SECRET_KEY?.slice(0, 14) + '...' };
      } catch (e) {
        results.clerk = { ok: false, error: e.message };
      }

      // ── Firebase Admin SDK ───────────────────────────────────
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        const sa = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const appName = 'diag-' + Date.now();
        const diagApp = adminSdk.initializeApp({ credential: adminSdk.credential.cert(sa) }, appName);
        const auth = adminSdk.auth(diagApp);
        // verifyIdToken on a garbage token → Firebase-specific error code means we reached Google
        let fbStatus = 'connected';
        try { await auth.verifyIdToken('test'); } catch (e2) {
          fbStatus = e2.code || e2.message;
        }
        await diagApp.delete();
        results.firebase = { ok: true, project: sa.project_id, status: fbStatus };
      } catch (e) {
        results.firebase = { ok: false, error: e.message };
      }

      // ── Resend ───────────────────────────────────────────────
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const domains = await resend.domains.list();
        const list = (domains?.data || []).map(d => ({ name: d.name, status: d.status }));
        results.resend = {
          ok: true,
          key: process.env.RESEND_API_KEY?.slice(0, 8) + '...',
          from: process.env.EMAIL_FROM,
          domains: list,
          fromDomainVerified: list.some(d => d.name === (process.env.EMAIL_FROM || '').split('@')[1] && d.status === 'verified'),
        };
      } catch (e) {
        results.resend = { ok: false, error: e.message };
      }

      const allOk = Object.values(results).every(r => r.ok);
      res.status(allOk ? 200 : 207).json({
        summary: allOk ? 'ALL_OK' : 'SOME_FAILED',
        ts: new Date().toISOString(),
        results,
      });
    });
  }

  // ── Static (auth-gated) for local-disk storage driver ───────
  // Only mounted when STORAGE_DRIVER=local so generated PDFs and other
  // private artifacts aren't served from an open path in production
  // (where STORAGE_DRIVER=s3 and signed URLs are used instead).
  if (env.STORAGE_DRIVER === 'local') {
    const authMiddleware = require('./core/middleware/authMiddleware');
    app.use(
      '/static',
      authMiddleware,
      express.static(path.resolve(env.STORAGE_LOCAL_DIR))
    );
  }

  // ── Module routes ────────────────────────────────────────────
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/patient', patientRoutes);
  app.use('/api/v1/therapists', therapistRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/assessments', assessmentRoutes);

  // ── Plugin auto-discovery ────────────────────────────────────
  // Routes are registered later via pluginManager.registerAll() in server.js
  // (after Socket.IO + container are wired). The 404 and error handlers are
  // intentionally NOT mounted here — mountFinalHandlers() does that AFTER
  // plugin routes are in place, otherwise the catch-all 404 would shadow
  // every plugin route.
  const pluginManager = new PluginManager();
  pluginManager.discover(path.join(__dirname, 'plugins'));
  app._pluginManager = pluginManager;
  app._container = container;

  return app;
}

/**
 * Mount the 404 catch-all and the error handler. MUST be called after
 * pluginManager.registerAll() so plugin routes get a chance to match first.
 * @param {import('express').Application} app
 */
function mountFinalHandlers(app) {
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
      correlationId: req.correlationId,
    });
  });
  app.use(errorHandler);
}

module.exports = createApp;
module.exports.mountFinalHandlers = mountFinalHandlers;
