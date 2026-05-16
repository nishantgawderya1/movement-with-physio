'use strict';

const { Router } = require('express');
const controller = require('./patient.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');
const auditLog = require('../../core/middleware/auditLog');
const validate = require('../../core/middleware/validate');
const { updateProfile, completeOnboarding } = require('./patient.validation');

const router = Router();

// All patient routes require auth + patient role
router.use(authMiddleware, rbac('patient'), defaultLimiter);

/**
 * @openapi
 * /api/v1/patient/profile:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient profile
 *     security:
 *       - BearerAuth: []
 */
router.get('/profile', controller.getProfile);

/**
 * @openapi
 * /api/v1/patient/profile:
 *   patch:
 *     tags: [Patient]
 *     summary: Update patient profile
 *     security:
 *       - BearerAuth: []
 */
router.patch('/profile', validate(updateProfile), auditLog('UPDATE_PATIENT_PROFILE', 'patient'), controller.updateProfile);

/**
 * @openapi
 * /api/v1/patient/onboarding:
 *   post:
 *     tags: [Patient]
 *     summary: Complete patient onboarding
 *     security:
 *       - BearerAuth: []
 */
router.post('/onboarding', validate(completeOnboarding), auditLog('PATIENT_ONBOARDING', 'patient'), controller.completeOnboarding);

/**
 * @openapi
 * /api/v1/patient/dashboard:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient dashboard data
 *     security:
 *       - BearerAuth: []
 */
router.get('/dashboard', controller.getDashboard);

/**
 * @openapi
 * /api/v1/patient/assigned-therapist:
 *   get:
 *     tags: [Patient]
 *     summary: Get assigned therapist details
 *     security:
 *       - BearerAuth: []
 */
router.get('/assigned-therapist', controller.getAssignedTherapist);

/**
 * @openapi
 * /api/v1/patient/account:
 *   delete:
 *     tags: [Patient]
 *     summary: Delete patient account (DPDP — anonymizes PII, retains medical records)
 *     security:
 *       - BearerAuth: []
 */
router.delete('/account', auditLog('DELETE_PATIENT_ACCOUNT', 'patient'), controller.deletePatientAccount);

module.exports = router;

