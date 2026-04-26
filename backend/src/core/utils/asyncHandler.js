'use strict';

/**
 * Wraps an async route handler and forwards errors to Express error handler.
 * Eliminates try/catch boilerplate in controllers.
 *
 * @param {Function} fn - async (req, res, next) => void
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
