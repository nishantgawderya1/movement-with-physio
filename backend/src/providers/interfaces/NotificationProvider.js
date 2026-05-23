'use strict';

/**
 * NotificationProvider interface.
 */
class NotificationProvider {
  /**
   * Send a push notification to a user.
   * @param {string} userId
   * @param {{ title: string, body: string, data?: object, category?: string }} payload
   *   `category` (optional) — iOS UNNotificationCategory identifier; when present
   *   and non-empty, the adapter surfaces it as apns.payload.aps.category so
   *   iOS renders the registered action buttons (e.g. Accept/Decline).
   *   Empty/absent → no apns block (preserves Android default).
   * @returns {Promise<void>}
   */
  async sendPush(userId, payload) {
    throw new Error('NotificationProvider.sendPush() not implemented');
  }
}

module.exports = NotificationProvider;
