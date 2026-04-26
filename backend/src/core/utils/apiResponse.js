'use strict';

/**
 * Standard API response helpers.
 * All responses follow { success, data?, error?, correlationId? }
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} statusCode
 */
function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

/**
 * Send a paginated success response.
 * @param {import('express').Response} res
 * @param {Array} data
 * @param {{ hasNext: boolean, cursor: string|null }} pagination
 */
function paginated(res, data, pagination) {
  return res.status(200).json({ success: true, data, pagination });
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {string} [correlationId]
 */
function error(res, message, statusCode = 500, correlationId) {
  const payload = { success: false, error: message };
  if (correlationId) payload.correlationId = correlationId;
  return res.status(statusCode).json(payload);
}

module.exports = { success, paginated, error };
