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

module.exports = { createProposal, acceptProposal };
