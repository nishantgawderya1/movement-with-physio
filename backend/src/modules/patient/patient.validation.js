'use strict';

const Joi = require('joi');

/**
 * Joi validation schemas for patient module.
 */

const updateProfile = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/),
  onboardingCompleted: Joi.boolean(),
}).min(1);

const completeOnboarding = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/).required(),
  dateOfBirth: Joi.date().iso().max('now'),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
  medicalHistory: Joi.string().max(5000),
  emergencyContact: Joi.object({
    name: Joi.string().trim().max(100),
    phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/),
    relationship: Joi.string().trim().max(50),
  }),
});

module.exports = { updateProfile, completeOnboarding };
