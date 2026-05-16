'use strict';

const Joi = require('joi');

/**
 * Joi validation schemas for assessment module.
 */

const createSession = Joi.object({
  patientId: Joi.string().trim().required(),
  bodyParts: Joi.array().items(Joi.string().trim()).min(1).required(),
  notes: Joi.string().max(5000),
});

const respondToQuestion = Joi.object({
  questionId: Joi.string().trim().required(),
  answer: Joi.alternatives().try(
    Joi.string().max(2000),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.string()),
  ).required(),
  notes: Joi.string().max(2000),
});

const completeSession = Joi.object({
  summary: Joi.string().max(5000),
});

const listHistory = Joi.object({
  patientId: Joi.string().trim(),
  cursor: Joi.string(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { createSession, respondToQuestion, completeSession, listHistory };
