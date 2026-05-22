'use strict';

const { Router } = require('express');
const controller = require('./assessment.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');

const router = Router();
const auth = [authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter];
const patientOnly = [authMiddleware, rbac('patient'), defaultLimiter];
// Phase 2 — respond/complete now allows therapist (for therapist_driven mode).
// Service-layer authorizeAssessmentAction enforces the actual rule based on
// the assessment's `mode`, so patient_self assessments still reject therapist.
const respondOrComplete = [authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter];

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
 *     description: |
 *       For patient_self assessments only the patient can respond.
 *       For therapist_driven assessments only the assigned therapist can
 *       respond; patient calls return 403 THERAPIST_ONLY. Enforced by the
 *       service-level authorizeAssessmentAction.
 */
router.post('/:id/respond', ...respondOrComplete, controller.respondToQuestion);

/**
 * @openapi
 * /api/v1/assessments/{id}/complete:
 *   patch:
 *     tags: [Assessment]
 *     summary: Complete an assessment
 *     description: |
 *       therapist_driven mode → therapist completes; PDF worker is enqueued.
 *       patient_self mode → patient completes (legacy behavior preserved).
 */
router.patch('/:id/complete', ...respondOrComplete, controller.completeAssessment);

/**
 * @openapi
 * /api/v1/assessments/{id}/pdf:
 *   get:
 *     tags: [Assessment]
 *     summary: Get a signed URL for the completed assessment PDF
 *     description: |
 *       Returns 202 { status: 'generating' } while the PDF worker hasn't
 *       finished; 200 { status: 'ready', url } when available (5-min signed URL).
 *       Patient role on a therapist_driven assessment → 403.
 */
router.get('/:id/pdf', ...auth, controller.getAssessmentPdf);

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
