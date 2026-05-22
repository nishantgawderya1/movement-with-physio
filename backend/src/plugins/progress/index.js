'use strict';

const { Router } = require('express');
const { createController } = require('./progress.controller');
const { createTherapistController } = require('./therapistProgress.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const PluginBase = require('../../core/plugins/PluginBase');
const { ROLES } = require('../../core/utils/constants');

class ProgressPlugin extends PluginBase {
  get name() { return 'progress'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const progressService = require('./progress.service')(container);
    const controller = createController(progressService);
    const therapistController = createTherapistController(progressService);

    // Patient-facing routes — strictly self-scoped. Reads only req.user.id;
    // no client-supplied target id is accepted. Therapist visibility on a
    // patient's progress is served by the separate therapist sub-router
    // below, gated on the booking relationship.
    const patientRouter = Router();
    patientRouter.use(authMiddleware);

    /**
     * @openapi
     * /api/v1/progress/summary:
     *   get:
     *     tags: [Progress]
     *     summary: The authenticated patient's progress summary
     *     security:
     *       - BearerAuth: []
     */
    patientRouter.get('/summary', controller.getSummary);

    /**
     * @openapi
     * /api/v1/progress/exercises:
     *   get:
     *     tags: [Progress]
     *     summary: The authenticated patient's per-exercise completion stats
     *     security:
     *       - BearerAuth: []
     */
    patientRouter.get('/exercises', controller.getExerciseStats);

    /**
     * @openapi
     * /api/v1/progress/trends:
     *   get:
     *     tags: [Progress]
     *     summary: The authenticated patient's weekly trend data (last 12 weeks)
     *     security:
     *       - BearerAuth: []
     */
    patientRouter.get('/trends', controller.getTrends);

    /**
     * @openapi
     * /api/v1/progress/export:
     *   get:
     *     tags: [Progress]
     *     summary: Export the authenticated patient's full progress as JSON
     *     security:
     *       - BearerAuth: []
     */
    patientRouter.get('/export', controller.exportProgress);

    app.use('/api/v1/progress', patientRouter);

    // Therapist-facing routes — read another user's progress, gated on a
    // CONFIRMED/COMPLETED Booking relationship between the therapist and
    // the target patient. URL shape encodes the authorization model so the
    // gate is harder to accidentally forget when adding new endpoints.
    const therapistRouter = Router({ mergeParams: true });
    therapistRouter.use(authMiddleware);
    therapistRouter.use(rbac(ROLES.THERAPIST));

    /**
     * @openapi
     * /api/v1/therapists/me/patients/{patientId}/progress/summary:
     *   get:
     *     tags: [Progress]
     *     summary: A patient's progress summary (therapist view, relationship-gated)
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: patientId
     *         required: true
     *         schema:
     *           type: string
     *         description: Patient Clerk ID
     */
    therapistRouter.get('/summary', therapistController.getSummary);
    therapistRouter.get('/exercises', therapistController.getExerciseStats);
    therapistRouter.get('/trends', therapistController.getTrends);
    therapistRouter.get('/export', therapistController.exportProgress);

    app.use('/api/v1/therapists/me/patients/:patientId/progress', therapistRouter);
  }
}

module.exports = ProgressPlugin;
