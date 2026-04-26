'use strict';

const { createClerkClient } = require('@clerk/express');
const AuthProvider = require('../interfaces/AuthProvider');
const logger = require('../../core/utils/logger');

class ClerkAdapter extends AuthProvider {
  constructor(secretKey) {
    super();
    this.clerk = createClerkClient({ secretKey });
  }

  /**
   * Verify a Clerk session token.
   * Returns { id, email, role } extracted from the session claims.
   * @param {string} token
   * @returns {Promise<{ id: string, email: string, role: string }>}
   */
  async verifyToken(token) {
    try {
      const session = await this.clerk.sessions.verifySession(token, token);
      const user = await this.clerk.users.getUser(session.userId);

      const role =
        user.publicMetadata?.role ||
        user.privateMetadata?.role ||
        'patient';

      const email =
        user.emailAddresses?.[0]?.emailAddress || '';

      return { id: session.userId, email, role };
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
