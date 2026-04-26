'use strict';

const { container } = require('../../container');
const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');

/**
 * HTTP auth middleware — validates Clerk session tokens.
 *
 * Expects: Authorization: Bearer <session_token>
 * Sets:    req.user = { id, email, role }
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiResponse.error(res, 'Missing or malformed Authorization header', 401, req.correlationId);
  }

  const token = authHeader.slice(7);

  try {
    const user = await container.auth.verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    logger.warn({
      event: 'AUTH_FAILED',
      correlationId: req.correlationId,
      err: err.message,
    });
    return apiResponse.error(res, 'Unauthorized', 401, req.correlationId);
  }
}

module.exports = authMiddleware;
