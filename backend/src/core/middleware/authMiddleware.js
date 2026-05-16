'use strict';

const { container } = require('../../container');
const User = require('../../models/User.model');
const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');

/**
 * HTTP auth middleware — validates Clerk session tokens, then enriches
 * req.user with the role + Mongo _id from the persisted User doc.
 *
 * Why both lookups:
 *   - Clerk verifies the session JWT (auth identity).
 *   - The Mongo User doc holds the authoritative role (set by /auth/me/init
 *     when the app first signs in). Clerk's publicMetadata.role is never
 *     written by this codebase, so trusting it produces wrong roles.
 *
 * Result on req.user:
 *   { id: clerkId, email, role, mongoId? }
 *
 *   `role` falls back to the value derived from Clerk metadata when no
 *   Mongo doc exists yet — that's fine for /auth/me/init itself (which
 *   only needs authentication, not authorization).
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

    // Enrich from Mongo. Best-effort: if the lookup fails or no doc exists,
    // keep the Clerk-derived role so /auth/me/init (which creates the doc)
    // can still run as an authenticated request.
    try {
      const dbUser = await User.findOne({ clerkId: user.id })
        .select('_id role onboardingCompleted')
        .lean();
      if (dbUser) {
        req.user.role = dbUser.role;
        req.user.mongoId = String(dbUser._id);
        req.user.onboardingCompleted = !!dbUser.onboardingCompleted;
      }
    } catch (dbErr) {
      logger.warn({
        event: 'AUTH_USER_LOOKUP_FAILED',
        clerkId: user.id,
        err: dbErr.message,
      });
    }

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
