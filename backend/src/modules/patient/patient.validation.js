'use strict';

const Joi = require('joi');

/**
 * Joi validation schemas for patient module.
 */

// Phase 3 — must match User.model.js painLocation enum AND
// AssessmentQuestionTemplate.bodyPart distinct values.
const PAIN_LOCATIONS = ['leg', 'knee', 'back', 'neck', 'shoulder', 'ankle', 'general'];

const updateProfile = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/),
  onboardingCompleted: Joi.boolean(),
  // Phase 3 — primary body part. null clears the field; valid enum updates it.
  painLocation: Joi.string().lowercase().valid(...PAIN_LOCATIONS).allow(null),
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
  // Phase 3 — optional during initial onboarding; populated later via PATCH
  // /patient/profile from the app's onboarding submit handler.
  painLocation: Joi.string().lowercase().valid(...PAIN_LOCATIONS).allow(null),
});

module.exports = { updateProfile, completeOnboarding, PAIN_LOCATIONS };
