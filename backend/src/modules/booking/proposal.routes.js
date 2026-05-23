'use strict';

const { Router } = require('express');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const idempotency = require('../../core/middleware/idempotency');
const validate = require('../../core/middleware/validate');
const auditLog = require('../../core/middleware/auditLog');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');
const {
  createProposalSchema,
  declineProposalSchema,
  listProposalsSchema,
} = require('./proposal.validation');
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

/**
 * @openapi
 * /api/v1/bookings/proposals/{id}/decline:
 *   post:
 *     tags: [Booking]
 *     summary: Patient declines a pending session proposal (optional reason)
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
  '/proposals/:id/decline',
  authMiddleware,
  rbac('patient'),
  idempotency,
  validate(declineProposalSchema),
  auditLog('DECLINE_PROPOSAL', 'proposal'),
  defaultLimiter,
  proposalController.declineProposal
);

/**
 * @openapi
 * /api/v1/bookings/proposals:
 *   get:
 *     tags: [Booking]
 *     summary: List proposals (patient sees own pending; therapist sees own pending + recent declined; admin sees all)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 */
router.get(
  '/proposals',
  authMiddleware,
  rbac('patient', 'therapist', 'admin'),
  defaultLimiter,
  validate(listProposalsSchema, { source: 'query' }),
  proposalController.listProposals
);

/**
 * @openapi
 * /api/v1/bookings/proposals/{id}:
 *   delete:
 *     tags: [Booking]
 *     summary: Therapist cancels their own pending proposal (no patient notification)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
router.delete(
  '/proposals/:id',
  authMiddleware,
  rbac('therapist'),
  auditLog('CANCEL_PROPOSAL', 'proposal'),
  defaultLimiter,
  proposalController.deleteProposal
);

module.exports = router;
