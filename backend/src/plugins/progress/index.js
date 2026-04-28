'use strict';

const { Router } = require('express');
const { createController } = require('./progress.controller');
const authMiddleware = require('../../../core/middleware/authMiddleware');
const PluginBase = require('../../../core/plugins/PluginBase');

class ProgressPlugin extends PluginBase {
  get name() { return 'progress'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const progressService = require('./progress.service')(container);
    const controller = createController(progressService);
    const router = Router();

    // All progress routes require authentication
    router.use(authMiddleware);

    /**
     * @openapi
     * /api/v1/progress/summary:
     *   get:
     *     tags: [Progress]
     *     summary: Get patient progress summary
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: patientId
     *         schema:
     *           type: string
     *         description: Patient Clerk ID (therapists only — omit to use own ID)
     */
    router.get('/summary', controller.getSummary);

    /**
     * @openapi
     * /api/v1/progress/exercises:
     *   get:
     *     tags: [Progress]
     *     summary: Per-exercise completion statistics
     *     security:
     *       - BearerAuth: []
     */
    router.get('/exercises', controller.getExerciseStats);

    /**
     * @openapi
     * /api/v1/progress/trends:
     *   get:
     *     tags: [Progress]
     *     summary: Weekly trend data (last 12 weeks)
     *     security:
     *       - BearerAuth: []
     */
    router.get('/trends', controller.getTrends);

    /**
     * @openapi
     * /api/v1/progress/export:
     *   get:
     *     tags: [Progress]
     *     summary: Export full progress report as JSON
     *     security:
     *       - BearerAuth: []
     */
    router.get('/export', controller.exportProgress);

    app.use('/api/v1/progress', router);
  }
}

module.exports = ProgressPlugin;
