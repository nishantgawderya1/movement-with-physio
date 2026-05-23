'use strict';

const { Router } = require('express');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const idempotency = require('../../core/middleware/idempotency');
const validate = require('../../core/middleware/validate');
const auditLog = require('../../core/middleware/auditLog');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');
const { createProposalSchema } = require('./proposal.validation');
const proposalController = require('./proposal.controller');

const router = Router();

/**
 * @openapi
 * /api/v1/bookings/proposals:
 *   post:
 *     tags: [Booking]
 *     summary: Therapist creates a pending session proposal for a patient
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 */
router.post(
  '/proposals',
  authMiddleware,
  rbac('therapist'),
  idempotency,
  validate(createProposalSchema),
  auditLog('CREATE_PROPOSAL', 'proposal'),
  defaultLimiter,
  proposalController.createProposal
);

/**
 * @openapi
 * /api/v1/bookings/proposals/{id}/accept:
 *   post:
 *     tags: [Booking]
 *     summary: Patient accepts a pending session proposal (creates a Booking)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
router.post(
  '/proposals/:id/accept',
  authMiddleware,
  rbac('patient'),
  idempotency,
  auditLog('ACCEPT_PROPOSAL', 'proposal'),
  defaultLimiter,
  proposalController.acceptProposal
);

module.exports = router;
