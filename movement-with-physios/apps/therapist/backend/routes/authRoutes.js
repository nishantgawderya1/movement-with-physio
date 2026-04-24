// backend/routes/authRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Defines all authentication API routes.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import { sendOtp, verifyOtp } from '../controllers/authController.js';
import { otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/send-otp
// Rate limited: max 3 requests per phone per 10 minutes
router.post('/send-otp', otpRateLimiter, sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyOtp);

export default router;
