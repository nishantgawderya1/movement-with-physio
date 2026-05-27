'use strict';

const { Router } = require('express');
const authMiddleware = require('../../core/middleware/authMiddleware');
const validate = require('../../core/middleware/validate');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');
const { setFcmTokenSchema } = require('./users.validation');
const usersController = require('./users.controller');

const router = Router();

// Cross-role: any authenticated user (patient or therapist) registers
// their own device token. No rbac() gate — fcmToken is per-user, not
// per-role. Audit emission lives inside the controller (diff-write only),
// so the auditLog middleware is intentionally NOT chained here.
router.use(authMiddleware);

/**
 * @openapi
 * /api/v1/users/me/fcm-token:
 *   patch:
 *     tags: [Users]
 *     summary: Register or clear the caller's device FCM/expo push token
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 nullable: true
 *                 description: Opaque token; null clears the stored token for sign-out flows.
 */
router.patch(
  '/me/fcm-token',
  defaultLimiter,
  validate(setFcmTokenSchema),
  usersController.setFcmToken
);

module.exports = router;
