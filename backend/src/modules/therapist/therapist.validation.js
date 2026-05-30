'use strict';

const Joi = require('joi');

/**
 * Joi validation schemas for therapist module.
 */

const updateProfile = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/),
  specialty: Joi.string().trim().min(1).max(100),
  bio: Joi.string().max(2000),
  qualifications: Joi.array().items(Joi.string().trim().max(200)),
  experienceYears: Joi.number().integer().min(0).max(60),
}).min(1);

const listTherapists = Joi.object({
  specialty: Joi.string().trim().max(100),
  cursor: Joi.string(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  includeUnverified: Joi.string().valid('true', 'false'),
});

// Recurring weekly availability window. Minutes-from-midnight in the
// therapist's local timezone; endMinute must be strictly after startMinute.
const availabilityWindow = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  startMinute: Joi.number().integer().min(0).max(1439).required(),
  endMinute: Joi.number().integer().min(0).max(1439).greater(Joi.ref('startMinute')).required(),
});

const updateAvailability = Joi.object({
  windows: Joi.array().items(availabilityWindow).max(20).required(),
  timezone: Joi.string().min(1).max(64).default('Asia/Kolkata'),
}).custom((value, helpers) => {
  const byDay = {};
  // Forbid overlapping windows within the same dayOfWeek.
  for (const w of value.windows) {
    if (!byDay[w.dayOfWeek]) byDay[w.dayOfWeek] = [];
    byDay[w.dayOfWeek].push(w);
  }
  for (const day of Object.keys(byDay)) {
    const sorted = byDay[day].slice().sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinute < sorted[i - 1].endMinute) {
        return helpers.message(`Overlapping windows on dayOfWeek ${day}`);
      }
    }
  }
  return value;
}, 'cross-window overlap check');

module.exports = { updateProfile, listTherapists, updateAvailability };
