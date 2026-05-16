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

module.exports = { updateProfile, listTherapists };
