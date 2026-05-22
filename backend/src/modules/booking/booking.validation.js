'use strict';

const Joi = require('joi');
const { MEETING_TYPE, INSTANT_DELAY_MINUTES } = require('../../core/utils/constants');

const IANA_TIMEZONE_PATTERN = /^[A-Za-z]+\/[A-Za-z_]+$/;

const listSlotsSchema = Joi.object({
  therapistId: Joi.string().required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'date must be YYYY-MM-DD' }),
  timezone: Joi.string().default('Asia/Kolkata'),
  durationMinutes: Joi.number().valid(30, 60).default(60),
});

const createBookingSchema = Joi.object({
  therapistId: Joi.string().required(),
  slotStart: Joi.string().isoDate().required(),
  timezone: Joi.string().default('Asia/Kolkata'),
  durationMinutes: Joi.number().valid(30, 60).default(60),
  notes: Joi.string().max(500).allow('', null),
  // Phase 2 — additive. Default preserved server-side as in_person.
  meetingType: Joi.string().valid(...Object.values(MEETING_TYPE)).optional(),
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null),
});

const requestInstantBookingSchema = Joi.object({
  therapistId: Joi.string().required(),
  instantDelayMinutes: Joi.number().valid(...INSTANT_DELAY_MINUTES).required(),
});

module.exports = {
  listSlotsSchema,
  createBookingSchema,
  cancelBookingSchema,
  requestInstantBookingSchema,
};
