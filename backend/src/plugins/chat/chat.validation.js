'use strict';

const Joi = require('joi');

// Flat Joi schemas — the shared `validate(schema, { source })` middleware in
// core/middleware/validate.js calls schema.validate() directly, so each export
// MUST be a Joi schema (not a { body, params, query } wrapper).

const createRoom = Joi.object({
  participantIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  type: Joi.string().valid('direct', 'group').default('direct'),
});

const getMessages = Joi.object({
  afterSeq: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const sendMessage = Joi.object({
  text: Joi.string().trim().min(1).required(),
});

module.exports = {
  createRoom,
  getMessages,
  sendMessage,
};
