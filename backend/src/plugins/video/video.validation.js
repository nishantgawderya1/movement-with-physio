'use strict';

const Joi = require('joi');

const createCall = {
  body: Joi.object().keys({
    participantIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
    roomId: Joi.string().hex().length(24),
  }),
};

const getCall = {
  params: Joi.object().keys({
    callId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createCall,
  getCall,
};
