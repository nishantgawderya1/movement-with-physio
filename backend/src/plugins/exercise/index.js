'use strict';

const { Router } = require('express');
const { createController } = require('./exercise.controller');
const authMiddleware = require('../../../core/middleware/authMiddleware');
const rbac = require('../../../core/middleware/rbac');
const { defaultLimiter } = require('../../../core/middleware/rateLimiter');
const auditLog = require('../../../core/middleware/auditLog');
const PluginBase = require('../../../core/plugins/PluginBase');

/**
 * ExercisePlugin — auto-registered by PluginManager.
 * Mounts at /api/v1/exercises
 */
class ExercisePlugin extends PluginBase {
  get name() { return 'exercise'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const controller = createController(container);
    const router = Router();

    const adminOrTherapist = [authMiddleware, rbac('admin', 'therapist'), defaultLimiter];
    const anyAuth = [authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter];

    // Public listing
    /**
     * @openapi
     * /api/v1/exercises:
     *   get:
     *     tags: [Exercise]
     *     summary: List exercises (optionally filtered by bodyPart, difficulty)
     */
    router.get('/', defaultLimiter, controller.listExercises);

    /**
     * @openapi
     * /api/v1/exercises/body-part/{bodyPart}:
     *   get:
     *     tags: [Exercise]
     *     summary: List exercises by body part (cached 1hr)
     */
    router.get('/body-part/:bodyPart', defaultLimiter, controller.getByBodyPart);

    /**
     * @openapi
     * /api/v1/exercises/{id}:
     *   get:
     *     tags: [Exercise]
     *     summary: Get exercise by ID (includes 12hr signed video URL)
     */
    router.get('/:id', defaultLimiter, controller.getExercise);

    /**
     * @openapi
     * /api/v1/exercises/{id}/video-url:
     *   get:
     *     tags: [Exercise]
     *     summary: Refresh signed video URL (12hr)
     */
    router.get('/:id/video-url', ...anyAuth, controller.refreshVideoUrl);

    // Therapist/Admin mutations
    /**
     * @openapi
     * /api/v1/exercises:
     *   post:
     *     tags: [Exercise]
     *     summary: Create a new exercise (therapist/admin)
     */
    router.post('/', ...adminOrTherapist, auditLog('CREATE_EXERCISE', 'exercise'), controller.createExercise);

    /**
     * @openapi
     * /api/v1/exercises/{id}:
     *   patch:
     *     tags: [Exercise]
     *     summary: Update an exercise (therapist/admin)
     */
    router.patch('/:id', ...adminOrTherapist, auditLog('UPDATE_EXERCISE', 'exercise'), controller.updateExercise);

    /**
     * @openapi
     * /api/v1/exercises/{id}:
     *   delete:
     *     tags: [Exercise]
     *     summary: Delete an exercise (soft delete, admin only)
     */
    router.delete('/:id', authMiddleware, rbac('admin'), defaultLimiter, auditLog('DELETE_EXERCISE', 'exercise'), controller.deleteExercise);

    /**
     * @openapi
     * /api/v1/exercises/{id}/assign:
     *   post:
     *     tags: [Exercise]
     *     summary: Assign exercise to a patient (therapist only)
     */
    router.post('/:id/assign', authMiddleware, rbac('therapist'), defaultLimiter, controller.assignExercise);

    /**
     * @openapi
     * /api/v1/exercises/{id}/complete:
     *   post:
     *     tags: [Exercise]
     *     summary: Mark exercise as completed in a tracking session
     */
    router.post('/:id/complete', ...anyAuth, controller.completeExercise);

    app.use('/api/v1/exercises', router);
  }
}

module.exports = ExercisePlugin;
