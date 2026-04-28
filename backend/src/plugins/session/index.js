'use strict';

const { Router } = require('express');
const { createController } = require('./session.controller');
const authMiddleware = require('../../../core/middleware/authMiddleware');
const validate = require('../../../core/middleware/validate');
const sessionValidation = require('./session.validation');
const PluginBase = require('../../../core/plugins/PluginBase');
const auditLog = require('../../../core/middleware/auditLog');
const rbac = require('../../../core/middleware/rbac');

class SessionPlugin extends PluginBase {
  get name() { return 'session'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const sessionService = require('./session.service')(container);
    const controller = createController(sessionService);
    const router = Router();

    /**
     * @openapi
     * /api/v1/session/notes:
     *   post:
     *     tags: [Session]
     *     summary: Create session notes (therapist only)
     *     security:
     *       - BearerAuth: []
     */
    router.post(
      '/notes',
      authMiddleware,
      rbac('therapist'),
      auditLog('CREATE_SESSION_NOTE', 'session'),
      validate(sessionValidation.createNote),
      controller.createNote
    );

    /**
     * @openapi
     * /api/v1/session/notes:
     *   get:
     *     tags: [Session]
     *     summary: List session notes for the authenticated user (paginated)
     *     security:
     *       - BearerAuth: []
     */
    router.get(
      '/notes',
      authMiddleware,
      validate(sessionValidation.listNotes, { source: 'query' }),
      controller.listNotes
    );

    /**
     * @openapi
     * /api/v1/session/notes/booking/{bookingId}:
     *   get:
     *     tags: [Session]
     *     summary: Get notes for a specific booking
     *     security:
     *       - BearerAuth: []
     */
    router.get(
      '/notes/booking/:bookingId',
      authMiddleware,
      controller.getNoteByBooking
    );

    /**
     * @openapi
     * /api/v1/session/notes/{noteId}:
     *   patch:
     *     tags: [Session]
     *     summary: Update session notes (therapist only)
     *     security:
     *       - BearerAuth: []
     */
    router.patch(
      '/notes/:noteId',
      authMiddleware,
      rbac('therapist'),
      auditLog('UPDATE_SESSION_NOTE', 'session'),
      validate(sessionValidation.updateNote),
      controller.updateNote
    );

    app.use('/api/v1/session', router);
  }
}

module.exports = SessionPlugin;
