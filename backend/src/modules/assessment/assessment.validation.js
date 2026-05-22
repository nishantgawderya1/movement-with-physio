'use strict';

const Joi = require('joi');

/**
 * Joi validation schemas for assessment module.
 *
 * ObjectId convention: Joi.string().hex().length(24) — chosen for the
 * assessment module per S-followup-16 decision (strict, catches typos at
 * Joi level so callers get 422 instead of a 500 mongoose cast error).
 * Booking module uses plain Joi.string().required() and defers to mongoose
 * casting — both conventions coexist in this codebase.
 *
 * Field shapes mirror what the controller + service actually consume from
 * req.body. Server-resolved identifiers (patientId via resolveMongoUserId)
 * are deliberately NOT in any schema — including them would force callers
 * to send a useless field that the controller already overrides.
 */

const objectIdString = () => Joi.string().hex().length(24);

const createAssessment = Joi.object({
  bodyParts: Joi.array().items(Joi.string().trim()).min(1).required(),
  therapistId: objectIdString().allow(null).optional(),
});

const respondToQuestion = Joi.object({
  questionId: Joi.string().trim().required(),
  answer: Joi.alternatives().try(
    Joi.string().max(2000),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.string()),
  ).required(),
});

const completeAssessment = Joi.object({
  painScore: Joi.number().min(0).max(10).allow(null).optional(),
  notes: Joi.string().max(5000).allow('', null).optional(),
});

const trackingExercise = Joi.object({
  exerciseId: objectIdString().required(),
  completedSets: Joi.number().integer().min(0).default(0),
  completedReps: Joi.number().integer().min(0).default(0),
  durationSeconds: Joi.number().integer().min(0).default(0),
  painBefore: Joi.number().min(0).max(10).allow(null).optional(),
  painAfter: Joi.number().min(0).max(10).allow(null).optional(),
  completedAt: Joi.date().allow(null).optional(),
});

const createTrackingSession = Joi.object({
  bookingId: objectIdString().optional(),
  assessmentId: objectIdString().optional(),
  exercises: Joi.array().items(trackingExercise).default([]),
  painScoreBefore: Joi.number().min(0).max(10).allow(null).optional(),
});

const completeTrackingSession = Joi.object({
  exercises: Joi.array().items(trackingExercise).default([]),
  painScoreAfter: Joi.number().min(0).max(10).allow(null).optional(),
  notes: Joi.string().max(5000).allow('', null).optional(),
});

// Note: listHistory (query-side validation) is intentionally not wired here —
// query-side validation is a separate concern and the controller already
// number-coerces limit. Tracked as a future followup if needed.

module.exports = {
  createAssessment,
  respondToQuestion,
  completeAssessment,
  createTrackingSession,
  completeTrackingSession,
};
