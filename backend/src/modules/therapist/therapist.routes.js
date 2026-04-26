'use strict';

const { Router } = require('express');
const controller = require('./therapist.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');

const router = Router();

// Public: list therapists (no auth required for discovery)
/**
 * @openapi
 * /api/v1/therapists:
 *   get:
 *     tags: [Therapist]
 *     summary: List verified therapists (paginated)
 *     parameters:
 *       - in: query
 *         name: specialty
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 */
router.get('/', defaultLimiter, controller.listTherapists);

/**
 * @openapi
 * /api/v1/therapists/{id}:
 *   get:
 *     tags: [Therapist]
 *     summary: Get therapist by ID
 */
router.get('/:id', defaultLimiter, controller.getTherapistById);

// Authenticated therapist routes
router.get('/me/profile', authMiddleware, rbac('therapist'), controller.getProfile);
router.patch('/me/profile', authMiddleware, rbac('therapist'), controller.updateProfile);

// Admin route
/**
 * @openapi
 * /api/v1/therapists/{id}/verify:
 *   post:
 *     tags: [Therapist]
 *     summary: Verify a therapist (admin only)
 *     security:
 *       - BearerAuth: []
 */
router.post('/:id/verify', authMiddleware, rbac('admin'), controller.verifyTherapist);

module.exports = router;
