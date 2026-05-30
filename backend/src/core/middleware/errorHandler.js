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

  // Mongo duplicate-key (E11000). Reachable as a backstop when the
  // booking.service Redis lock + DB findOne layers both race past
  // (extreme: lock TTL'd between findOne and create, or Redis unavailable).
  // Map to a clean 409 so the client sees the same shape as the explicit
  // BOOKING_SLOT_TAKEN guard. For non-booking unique indexes (e.g. the
  // sparse idempotencyKey index on Booking), use a generic DUPLICATE_KEY.
  if (statusCode === 500 && err.code === 11000) {
    const isSlotIndex = err.keyPattern && err.keyPattern.slotStart;
    statusCode = 409;
    code = isSlotIndex ? 'BOOKING_SLOT_TAKEN' : 'DUPLICATE_KEY';
    message = isSlotIndex ? 'This slot is already booked.' : 'Duplicate value';
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
