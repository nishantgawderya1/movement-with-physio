'use strict';

const Joi = require('joi');

const createNote = Joi.object({
  bookingId: Joi.string().required(),
  patientId: Joi.string().required(),
  notes: Joi.string().min(1).max(10000).required(),
  painLevel: Joi.number().min(0).max(10).optional(),
  mobility: Joi.string().valid('poor', 'fair', 'good', 'excellent').optional(),
  nextSteps: Joi.string().max(2000).optional(),
});

const updateNote = Joi.object({
  notes: Joi.string().min(1).max(10000).optional(),
  painLevel: Joi.number().min(0).max(10).optional(),
  mobility: Joi.string().valid('poor', 'fair', 'good', 'excellent').optional(),
  nextSteps: Joi.string().max(2000).optional(),
}).min(1);

const listNotes = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
});

module.exports = { createNote, updateNote, listNotes };
