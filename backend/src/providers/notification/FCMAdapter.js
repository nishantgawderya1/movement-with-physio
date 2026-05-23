'use strict';

const admin = require('firebase-admin');
const NotificationProvider = require('../interfaces/NotificationProvider');
const logger = require('../../core/utils/logger');

let initialized = false;

class FCMAdapter extends NotificationProvider {
  constructor(serviceAccount) {
    super();
    if (!initialized) {
      const parsed = typeof serviceAccount === 'string'
        ? JSON.parse(serviceAccount)
        : serviceAccount;

      if (parsed && parsed.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(parsed),
        });
        initialized = true;
        logger.info({ event: 'FCM_INITIALIZED', project: parsed.project_id });
      } else {
        logger.warn({ event: 'FCM_INIT_SKIPPED', reason: 'No valid service account' });
      }
    }
    this.messaging = initialized ? admin.messaging() : null;
  }

  /**
   * Send a FCM push notification to a user.
   * Requires User model to be queried for fcmToken before calling.
   * @param {string} fcmToken - device FCM token
   * @param {{ title: string, body: string, data?: object, category?: string }} payload
   *   `category` (optional) — iOS UNNotificationCategory id; surfaced as
   *   apns.payload.aps.category so iOS renders action buttons. Empty/absent
   *   → no apns block (Android receives unchanged payload).
   */
  async sendPush(fcmToken, payload) {
    if (!this.messaging) {
      logger.warn({ event: 'FCM_SKIP', reason: 'Not initialized' });
      return;
    }

    const message = {
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data
        ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)]))
        : {},
    };

    // iOS action-button surface. Only emitted when caller supplied a
    // non-empty string — Android receivers ignore the apns block, so
    // this is additive across platforms.
    if (payload.category && typeof payload.category === 'string' && payload.category.length > 0) {
      message.apns = { payload: { aps: { category: payload.category } } };
    }

    try {
      const response = await this.messaging.send(message);
      logger.info({ event: 'FCM_SENT', response });
    } catch (err) {
      logger.error({ event: 'FCM_SEND_FAILED', err: err.message });
      throw err;
    }
  }
}

module.exports = FCMAdapter;
