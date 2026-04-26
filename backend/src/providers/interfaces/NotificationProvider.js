'use strict';

/**
 * NotificationProvider interface.
 */
class NotificationProvider {
  /**
   * Send a push notification to a user.
   * @param {string} userId
   * @param {{ title: string, body: string, data?: object }} payload
   * @returns {Promise<void>}
   */
  async sendPush(userId, payload) {
    throw new Error('NotificationProvider.sendPush() not implemented');
  }
}

module.exports = NotificationProvider;
