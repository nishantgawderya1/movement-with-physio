'use strict';

const { Router } = require('express');
const controller = require('./therapist.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');
const auditLog = require('../../core/middleware/auditLog');
const validate = require('../../core/middleware/validate');
const { updateProfile, listTherapists } = require('./therapist.validation');

const router = Router();

// ─── Authenticated therapist routes (must be BEFORE /:id wildcard) ────────

/**
 * @openapi
 * /api/v1/therapists/me/profile:
 *   get:
 *     tags: [Therapist]
 *     summary: Get own therapist profile
 *     security:
 *       - BearerAuth: []
 */
router.get('/me/profile', authMiddleware, rbac('therapist'), controller.getProfile);

/**
 * @openapi
 * /api/v1/therapists/me/profile:
 *   patch:
 *     tags: [Therapist]
 *     summary: Update own therapist profile
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/me/profile',
  authMiddleware,
  rbac('therapist'),
  validate(updateProfile),
  auditLog('UPDATE_THERAPIST_PROFILE', 'therapist'),
  controller.updateProfile
);

/**
 * @openapi
 * /api/v1/therapists/me/clients:
 *   get:
 *     tags: [Therapist]
 *     summary: List therapist's assigned clients (paginated)
 *     security:
 *       - BearerAuth: []
 */
router.get('/me/clients', authMiddleware, rbac('therapist'), controller.getMyClients);

/**
 * @openapi
 * /api/v1/therapists/me/availability:
 *   get:
 *     tags: [Therapist]
 *     summary: Get therapist availability slots
 *     security:
 *       - BearerAuth: []
 */
router.get('/me/availability', authMiddleware, rbac('therapist'), controller.getAvailability);

/**
 * @openapi
 * /api/v1/therapists/me/availability:
 *   put:
 *     tags: [Therapist]
 *     summary: Update therapist availability slots
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/me/availability',
  authMiddleware,
  rbac('therapist'),
  auditLog('UPDATE_AVAILABILITY', 'therapist'),
  controller.updateAvailability
);

/**
 * @openapi
 * /api/v1/therapists/me/instant-availability:
 *   patch:
 *     tags: [Therapist]
 *     summary: Toggle instant-call availability (separate from slot scheduling)
 *     description: |
 *       Sets the therapist's `availableNow` flag. Turning ON also enqueues
 *       a 2-hour auto-clear job to flip the flag back off if the therapist
 *       forgets. Different concern from PUT /me/availability (slot schedule).
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/me/instant-availability',
  authMiddleware,
  rbac('therapist'),
  auditLog('SET_INSTANT_AVAILABILITY', 'therapist'),
  controller.setInstantAvailability
);

/**
 * @openapi
 * /api/v1/therapists/me/dashboard:
 *   get:
 *     tags: [Therapist]
 *     summary: Get therapist dashboard data
 *     security:
 *       - BearerAuth: []
 */
router.get('/me/dashboard', authMiddleware, rbac('therapist'), controller.getDashboard);

/**
 * @openapi
 * /api/v1/therapists/me/account:
 *   delete:
 *     tags: [Therapist]
 *     summary: Delete therapist account (DPDP — anonymizes PII, retains medical records)
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/me/account',
  authMiddleware,
  rbac('therapist'),
  auditLog('DELETE_THERAPIST_ACCOUNT', 'therapist'),
  controller.deleteTherapistAccount
);

// ─── Public routes ────────────────────────────────────────────────────────

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
router.get('/', defaultLimiter, validate(listTherapists, { source: 'query' }), controller.listTherapists);

/**
 * @openapi
 * /api/v1/therapists/search:
 *   get:
 *     tags: [Therapist]
 *     summary: Search therapists by specialty, rating, verified status
 */
router.get('/search', defaultLimiter, controller.searchTherapists);

/**
 * @openapi
 * /api/v1/therapists/{id}:
 *   get:
 *     tags: [Therapist]
 *     summary: Get therapist by ID
 */
router.get('/:id', defaultLimiter, controller.getTherapistById);

// ─── Admin route ──────────────────────────────────────────────────────────

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
