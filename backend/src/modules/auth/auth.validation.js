'use strict';

const Joi = require('joi');

const sendOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be a valid international number',
    }),
});

const verifyOTPSchema = Joi.object({
  phone: Joi.string().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must be numeric',
  }),
  clerkId: Joi.string().required(),
});

module.exports = { sendOTPSchema, verifyOTPSchema };
