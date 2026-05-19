'use strict';

/**
 * Operational error used by services to signal an HTTP-status-mapped failure
 * to the controller layer. Centralized error handler middleware reads
 * `statusCode` (preferred) or `status` to pick the response code.
 *
 * Created retroactively to unblock the video plugin which references this
 * file but it was missing on disk — see Phase 2A foundation work.
 */
class ApiError extends Error {
  constructor(statusCode, message, { isOperational = true, details, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isOperational = isOperational;
    if (details !== undefined) this.details = details;
    if (cause !== undefined) this.cause = cause;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = ApiError;
