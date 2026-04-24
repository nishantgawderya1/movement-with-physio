// backend/routes/therapistRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Defines all therapist onboarding and profile API routes.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import { savePersonalInfo, getProfile } from '../controllers/therapistController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/therapist/personal-info — requires valid JWT
router.post('/personal-info', authMiddleware, savePersonalInfo);

// GET /api/therapist/profile — requires valid JWT
router.get('/profile', authMiddleware, getProfile);

export default router;
