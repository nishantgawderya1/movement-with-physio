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
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code;
  let message = isProduction && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  // Mongo duplicate-key (E11000) backstop. Reachable when an explicit guard
  // upstream (Redis lock, findOne pre-check, etc.) races past or is absent.
  // Map to a clean 409 with an actionable code per known unique index so the
  // client sees a sensible shape instead of the raw Mongo error string.
  if (statusCode === 500 && err.code === 11000) {
    const kp = err.keyPattern || {};
    statusCode = 409;
    if (kp.slotStart) {
      code = 'BOOKING_SLOT_TAKEN';
      message = 'This slot is already booked.';
    } else if (kp.email) {
      code = 'USER_EMAIL_TAKEN';
      message = 'This email is already registered.';
    } else {
      code = 'DUPLICATE_KEY';
      message = 'Duplicate value';
    }
  }

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

  if (code !== undefined) {
    payload.code = code;
  }

  if (!isProduction) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
