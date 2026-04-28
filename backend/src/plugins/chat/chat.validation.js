'use strict';

const Joi = require('joi');

const createRoom = {
  body: Joi.object().keys({
    participantIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
    type: Joi.string().valid('direct', 'group').default('direct'),
  }),
};

const getMessages = {
  params: Joi.object().keys({
    roomId: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object().keys({
    afterSeq: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

const sendMessage = {
  params: Joi.object().keys({
    roomId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    text: Joi.string().trim().min(1).required(),
  }),
};

module.exports = {
  createRoom,
  getMessages,
  sendMessage,
};
