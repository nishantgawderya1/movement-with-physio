'use strict';

const Joi = require('joi');
const { MEETING_TYPE } = require('../../core/utils/constants');

// Mirrors booking.validation.js conventions:
//   - ObjectId fields: Joi.string().required() (no hex/length check at Joi
//     layer; Mongoose CastError surfaces malformed IDs as 500/400 from the
//     service layer's downstream query, with consistent behavior across the
//     booking module).
//   - Date fields: Joi.string().isoDate().required() — kept as a string in
//     req.body; the service does `new Date(slotStart)`.
const createProposalSchema = Joi.object({
  patientId: Joi.string().required(),
  slotStart: Joi.string().isoDate().required(),
  durationMinutes: Joi.number().integer().valid(30, 60).default(60),
  timezone: Joi.string().trim().default('Asia/Kolkata'),
  meetingType: Joi.string().valid(...Object.values(MEETING_TYPE)).required(),
  notes: Joi.string().trim().max(500).allow(null, '').optional(),
});

// Decline reason: optional free text capped at 500 chars (matches
// cancelBookingSchema convention). Persists on proposal.declineReason;
// never echoed in push body (S-followup-6 sanitization).
const declineProposalSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, '').optional(),
});

// Query params for GET /api/v1/bookings/proposals. status enum mirrors
// PROPOSAL_STATUS — kept as literals here to avoid a circular import
// (validation file is tiny; constants file pulls a lot of unrelated state).
const listProposalsSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'accepted', 'declined', 'expired', 'cancelled_by_therapist')
    .optional(),
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

module.exports = {
  createProposalSchema,
  declineProposalSchema,
  listProposalsSchema,
};
