'use strict';

const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Centralized error handler.
 *
 * Catches all errors forwarded via next(err).
 * In production: sanitized message only.
 * In development: full stack trace.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = isProduction && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  logger.error({
    event: 'UNHANDLED_ERROR',
    correlationId: req.correlationId,
    statusCode,
    err: err.message,
    stack: isProduction ? undefined : err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  const payload = {
    success: false,
    error: message,
    correlationId: req.correlationId,
  };

  if (!isProduction) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
