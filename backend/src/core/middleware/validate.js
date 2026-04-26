'use strict';

const apiResponse = require('../utils/apiResponse');

/**
 * Joi schema validation middleware.
 *
 * Usage: validate(schema) where schema is a Joi object schema.
 * Validates req.body (for mutations) or req.query (pass { query: true }).
 *
 * @param {import('joi').ObjectSchema} schema
 * @param {{ source?: 'body' | 'query' | 'params' }} [options]
 * @returns {Function} Express middleware
 */
function validate(schema, options = {}) {
  const source = options.source || 'body';
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message).join('; ');
      return apiResponse.error(res, `Validation error: ${details}`, 422, req.correlationId);
    }

    req[source] = value; // replace with sanitized/coerced value
    next();
  };
}

module.exports = validate;
