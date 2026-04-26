'use strict';

/**
 * AuthProvider interface.
 * All auth adapters must implement these methods.
 */
class AuthProvider {
  /**
   * Verify a session token and return the user object.
   * @param {string} token
   * @returns {Promise<{ id: string, email: string, role: string }>}
   */
  async verifyToken(token) {
    throw new Error('AuthProvider.verifyToken() not implemented');
  }

  /**
   * Retrieve full user info from the auth provider.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getUser(userId) {
    throw new Error('AuthProvider.getUser() not implemented');
  }
}

module.exports = AuthProvider;
