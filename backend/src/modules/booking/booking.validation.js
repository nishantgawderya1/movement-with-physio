'use strict';

const Joi = require('joi');

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
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null),
});

module.exports = { listSlotsSchema, createBookingSchema, cancelBookingSchema };
