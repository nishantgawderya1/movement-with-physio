'use strict';

const Joi = require('joi');
const { toZonedTime, format } = require('date-fns-tz');
const {
  MEETING_TYPE,
  INSTANT_DELAY_MINUTES,
  BOOKING_WINDOW_DAYS,
  SLOT_DURATION_MINUTES,
  MIN_LEAD_TIME_MINUTES,
} = require('../../core/utils/constants');

const IANA_TIMEZONE_PATTERN = /^[A-Za-z]+\/[A-Za-z_]+$/;

const listSlotsSchema = Joi.object({
  therapistId: Joi.string().hex().length(24).required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'date must be YYYY-MM-DD' }),
  timezone: Joi.string().default('Asia/Kolkata'),
  durationMinutes: Joi.number().integer().optional(), // accepted, silently ignored (30-min fixed)
}).custom((value, helpers) => {
  // Reject dates beyond the forward booking window (BOOKING_WINDOW_DAYS from
  // today inclusive), measured in IST (system default tz). Past dates pass —
  // listSlots returns [] for them.
  const tz = 'Asia/Kolkata';
  const maxDate = new Date(Date.now() + (BOOKING_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);
  const maxStr = format(toZonedTime(maxDate, tz), 'yyyy-MM-dd', { timeZone: tz });
  if (value.date && value.date > maxStr) {
    return helpers.message(`date must be within ${BOOKING_WINDOW_DAYS} days from today`);
  }
  return value;
}, 'booking window check');

const createBookingSchema = Joi.object({
  therapistId: Joi.string().hex().length(24).required(),
  slotStart: Joi.string().isoDate().required(),
  timezone: Joi.string().default('Asia/Kolkata'),
  durationMinutes: Joi.number().valid(30, 60).default(60),
  notes: Joi.string().max(500).allow('', null),
  // Phase 2 — additive. Default preserved server-side as in_person.
  meetingType: Joi.string().valid(...Object.values(MEETING_TYPE)).optional(),
}).custom((value, helpers) => {
  // Defense-in-depth: rejects slotStarts that listSlots would never emit.
  // Catches stale UI state (slot picked, sat past lead time), malicious
  // clients, and device clock skew.
  const slot = new Date(value.slotStart);
  if (isNaN(slot.getTime())) {
    return helpers.message('slotStart must be a valid ISO 8601 instant');
  }
  // IST 30-min grid maps to UTC 30-min grid (offset +05:30 is itself a
  // 30-min multiple), so a UTC-minute alignment check covers IST callers.
  if (slot.getUTCMinutes() % SLOT_DURATION_MINUTES !== 0) {
    return helpers.message(`slotStart must be aligned to a ${SLOT_DURATION_MINUTES}-minute boundary`);
  }
  if (slot.getUTCSeconds() !== 0 || slot.getUTCMilliseconds() !== 0) {
    return helpers.message('slotStart must have zero seconds and milliseconds');
  }
  const now = Date.now();
  if (slot.getTime() < now + MIN_LEAD_TIME_MINUTES * 60 * 1000) {
    return helpers.message(`slotStart must be at least ${MIN_LEAD_TIME_MINUTES} minutes in the future`);
  }
  if (slot.getTime() > now + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return helpers.message(`slotStart must be within the ${BOOKING_WINDOW_DAYS}-day booking window`);
  }
  return value;
}, 'createBooking grid+window check');

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
