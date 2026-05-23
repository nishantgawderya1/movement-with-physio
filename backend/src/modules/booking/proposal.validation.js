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

module.exports = { createProposalSchema };
