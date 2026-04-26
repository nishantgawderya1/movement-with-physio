'use strict';

const { Router } = require('express');
const controller = require('./patient.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');

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
router.patch('/profile', controller.updateProfile);

/**
 * @openapi
 * /api/v1/patient/onboarding:
 *   post:
 *     tags: [Patient]
 *     summary: Complete patient onboarding
 *     security:
 *       - BearerAuth: []
 */
router.post('/onboarding', controller.completeOnboarding);

module.exports = router;
