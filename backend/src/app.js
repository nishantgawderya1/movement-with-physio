'use strict';

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
require('./config/env'); // Validate env on startup

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

  // ── Module routes ────────────────────────────────────────────
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/patient', patientRoutes);
  app.use('/api/v1/therapists', therapistRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/assessments', assessmentRoutes);

  // ── Plugin auto-discovery ────────────────────────────────────
  const pluginManager = new PluginManager();
  pluginManager.discover(path.join(__dirname, 'plugins'));
  // Register is async; caller must await pluginManager.registerAll(app, container)
  app._pluginManager = pluginManager;
  app._container = container;

  // ── 404 handler ──────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
      correlationId: req.correlationId,
    });
  });

  // ── Error handler (must be last) ────────────────────────────
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
