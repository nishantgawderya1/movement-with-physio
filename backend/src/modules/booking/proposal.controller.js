'use strict';

const proposalService = require('./proposal.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { resolveActor } = require('../../core/utils/resolveMongoUserId');

/**
 * POST /api/v1/bookings/proposals
 * Therapist-initiated session proposal. Route is gated by rbac('therapist');
 * service layer also asserts actor.role and throws PROPOSAL_ROLE_REQUIRED
 * as defense-in-depth.
 */
const createProposal = asyncHandler(async (req, res) => {
  const actor = await resolveActor(req);
  const result = await proposalService.createProposal(actor, req.body);
  return apiResponse.success(res, result, 201);
});

/**
 * POST /api/v1/bookings/proposals/:id/accept
 * Patient accepts a pending proposal. Service-layer atomic claim handles
 * the race; controller is a thin pass-through.
 */
const acceptProposal = asyncHandler(async (req, res) => {
  const actor = await resolveActor(req);
  const result = await proposalService.acceptProposal(actor, req.params.id);
  return apiResponse.success(res, result, 201);
});

/**
 * POST /api/v1/bookings/proposals/:id/decline
 * Patient declines a pending proposal with optional reason.
 */
const declineProposal = asyncHandler(async (req, res) => {
  const actor = await resolveActor(req);
  const result = await proposalService.declineProposal(actor, req.params.id, req.body || {});
  return apiResponse.success(res, result);
});

/**
 * GET /api/v1/bookings/proposals
 * Role-scoped proposal list with cursor pagination. Returns the paginated
 * envelope shape (data + pagination) matching listBookings.
 */
const listProposals = asyncHandler(async (req, res) => {
  const actor = await resolveActor(req);
  const result = await proposalService.listProposals(actor, req.query);
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * DELETE /api/v1/bookings/proposals/:id
 * Therapist cancels their own pending proposal. Status flips to
 * cancelled_by_therapist (not hard-deleted). No notification to patient.
 */
const deleteProposal = asyncHandler(async (req, res) => {
  const actor = await resolveActor(req);
  const result = await proposalService.deleteProposal(actor, req.params.id);
  return apiResponse.success(res, result);
});

module.exports = {
  createProposal,
  acceptProposal,
  declineProposal,
  listProposals,
  deleteProposal,
};
