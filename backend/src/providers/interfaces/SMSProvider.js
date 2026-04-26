'use strict';

/**
 * SMSProvider interface.
 */
class SMSProvider {
  /**
   * Send an SMS message.
   * @param {string} to - E.164 phone number e.g. "+919876543210"
   * @param {string} message
   * @returns {Promise<void>}
   */
  async sendSMS(to, message) {
    throw new Error('SMSProvider.sendSMS() not implemented');
  }
}

module.exports = SMSProvider;
