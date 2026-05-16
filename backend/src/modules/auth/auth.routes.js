'use strict';

const { Router } = require('express');
const controller = require('./auth.controller');
const { authLimiter } = require('../../core/middleware/rateLimiter');
const authMiddleware = require('../../core/middleware/authMiddleware');
const validate = require('../../core/middleware/validate');
const { sendOTPSchema, verifyOTPSchema, initMeSchema, emailStatusSchema } = require('./auth.validation');

const router = Router();

/**
 * @openapi
 * /api/v1/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to phone number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP sent
 *       429:
 *         description: Too many requests (brute force locked)
 */
router.post('/send-otp', authLimiter, validate(sendOTPSchema), controller.sendOTP);

/**
 * @openapi
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and return user profile
 */
router.post('/verify-otp', authLimiter, validate(verifyOTPSchema), controller.verifyOTP);

/**
 * @openapi
 * /api/v1/auth/me/init:
 *   post:
 *     tags: [Auth]
 *     summary: Provision (or fetch) the Mongo User doc after Clerk sign-in
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [patient, therapist]
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created or returned
 *       409:
 *         description: Existing account has a different role
 */
router.post('/me/init', authMiddleware, validate(initMeSchema), controller.initMe);

/**
 * @openapi
 * /api/v1/auth/email-status:
 *   post:
 *     tags: [Auth]
 *     summary: Pre-flight check — is this email available for the calling app's role?
 *     description: |
 *       Public endpoint used by both apps before kicking off Clerk OTP, so we
 *       can block "this email is registered in the other app" before the user
 *       ever enters a Clerk session.
 */
router.post('/email-status', authLimiter, validate(emailStatusSchema), controller.emailStatus);

/**
 * @openapi
 * /api/v1/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get authenticated user profile
 *     security:
 *       - BearerAuth: []
 */
router.get('/profile', authMiddleware, controller.getProfile);

/**
 * @openapi
 * /api/v1/auth/profile:
 *   delete:
 *     tags: [Auth]
 *     summary: Soft delete account
 *     security:
 *       - BearerAuth: []
 */
router.delete('/profile', authMiddleware, controller.deleteAccount);

/**
 * @openapi
 * /api/v1/auth/webhook/clerk:
 *   post:
 *     tags: [Auth]
 *     summary: Clerk webhook handler (Svix signature verified)
 */
router.post('/webhook/clerk', controller.clerkWebhook);

module.exports = router;
