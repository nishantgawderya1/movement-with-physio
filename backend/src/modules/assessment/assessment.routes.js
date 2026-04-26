'use strict';

const { Router } = require('express');
const controller = require('./assessment.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');

const router = Router();
const auth = [authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter];
const patientOnly = [authMiddleware, rbac('patient'), defaultLimiter];

/**
 * @openapi
 * /api/v1/assessments/body-parts:
 *   get:
 *     tags: [Assessment]
 *     summary: Get list of supported body parts
 *     security: []
 */
router.get('/body-parts', defaultLimiter, controller.getBodyParts);

/**
 * @openapi
 * /api/v1/assessments/questions/{bodyPart}:
 *   get:
 *     tags: [Assessment]
 *     summary: Get questionnaire for a body part
 */
router.get('/questions/:bodyPart', defaultLimiter, controller.getQuestions);

/**
 * @openapi
 * /api/v1/assessments/history:
 *   get:
 *     tags: [Assessment]
 *     summary: Get completed assessment history for authenticated patient
 */
router.get('/history', ...patientOnly, controller.getHistory);

/**
 * @openapi
 * /api/v1/assessments:
 *   post:
 *     tags: [Assessment]
 *     summary: Start a new assessment session
 */
router.post('/', ...patientOnly, controller.createAssessment);

/**
 * @openapi
 * /api/v1/assessments:
 *   get:
 *     tags: [Assessment]
 *     summary: List assessments for authenticated user
 */
router.get('/', ...auth, controller.listAssessments);

/**
 * @openapi
 * /api/v1/assessments/{id}:
 *   get:
 *     tags: [Assessment]
 *     summary: Get assessment by ID
 */
router.get('/:id', ...auth, controller.getAssessment);

/**
 * @openapi
 * /api/v1/assessments/{id}/respond:
 *   post:
 *     tags: [Assessment]
 *     summary: Submit an answer to a question
 */
router.post('/:id/respond', ...patientOnly, controller.respondToQuestion);

/**
 * @openapi
 * /api/v1/assessments/{id}/complete:
 *   patch:
 *     tags: [Assessment]
 *     summary: Complete an assessment
 */
router.patch('/:id/complete', ...patientOnly, controller.completeAssessment);

// ── Tracking Sessions ─────────────────────────────────────────

/**
 * @openapi
 * /api/v1/assessments/tracking:
 *   get:
 *     tags: [Assessment]
 *     summary: List tracking sessions for authenticated patient
 */
router.get('/tracking/sessions', ...patientOnly, controller.listTrackingSessions);

/**
 * @openapi
 * /api/v1/assessments/tracking:
 *   post:
 *     tags: [Assessment]
 *     summary: Create a new tracking session
 */
router.post('/tracking/sessions', ...patientOnly, controller.createTrackingSession);

/**
 * @openapi
 * /api/v1/assessments/tracking/{id}/complete:
 *   patch:
 *     tags: [Assessment]
 *     summary: Complete a tracking session
 */
router.patch('/tracking/sessions/:id/complete', ...patientOnly, controller.completeTrackingSession);

module.exports = router;
