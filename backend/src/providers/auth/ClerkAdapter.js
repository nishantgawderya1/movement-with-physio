'use strict';

const { createClerkClient } = require('@clerk/express');
// `verifyToken` cryptographically validates a Clerk session JWT against
// Clerk's JWKS and returns the JWT claims (including `sub` = Clerk user id).
// This is the correct API for server-side token validation; the older
// `clerk.sessions.verifySession(sessionId, token)` requires a real session
// id (sess_...), NOT the JWT itself, and rejects every call when the JWT
// is passed for both arguments.
const { verifyToken: verifyClerkJwt } = require('@clerk/backend');
const AuthProvider = require('../interfaces/AuthProvider');
const logger = require('../../core/utils/logger');

class ClerkAdapter extends AuthProvider {
  constructor(secretKey) {
    super();
    if (!secretKey) {
      throw new Error('ClerkAdapter requires CLERK_SECRET_KEY');
    }
    this.secretKey = secretKey;
    this.clerk = createClerkClient({ secretKey });
  }

  /**
   * Verify a Clerk session JWT and return the canonical user shape used by
   * downstream middleware.
   *
   * The JWT's `sub` claim is the Clerk user id (e.g. "user_2a..."). After
   * verifying signature + expiry we fetch the full user record from Clerk
   * to derive email + role (role is best-effort from public/private
   * metadata; authMiddleware enriches this further from the Mongo User doc).
   *
   * @param {string} token - the Clerk session JWT from the Authorization header
   * @returns {Promise<{ id: string, email: string, role: string }>}
   */
  async verifyToken(token) {
    try {
      const claims = await verifyClerkJwt(token, { secretKey: this.secretKey });
      const userId = claims.sub;
      if (!userId) throw new Error('JWT has no sub claim');

      const user = await this.clerk.users.getUser(userId);

      const role =
        user.publicMetadata?.role ||
        user.privateMetadata?.role ||
        'patient';

      const email = user.emailAddresses?.[0]?.emailAddress || '';

      return { id: userId, email, role };
    } catch (err) {
      logger.warn({ event: 'CLERK_TOKEN_INVALID', err: err.message });
      throw new Error('Invalid session token');
    }
  }

  /**
   * Retrieve full user profile from Clerk.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getUser(userId) {
    return this.clerk.users.getUser(userId);
  }
}

module.exports = ClerkAdapter;
