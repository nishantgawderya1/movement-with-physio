'use strict';

const SMSProvider = require('../interfaces/SMSProvider');
const logger = require('../../core/utils/logger');

class MSG91Adapter extends SMSProvider {
  constructor({ authKey, templateId, senderId }) {
    super();
    this.authKey = authKey;
    this.templateId = templateId;
    this.senderId = senderId;
  }

  /**
   * Send an OTP or generic SMS via MSG91 REST API.
   * @param {string} to - mobile number (digits only or E.164)
   * @param {string} message - OTP or text
   */
  async sendSMS(to, message) {
    // Normalize: strip leading + and country code if needed
    const mobile = to.replace(/^\+/, '');

    const url = 'https://api.msg91.com/api/v5/otp';
    const payload = {
      template_id: this.templateId,
      mobile,
      authkey: this.authKey,
      otp: message,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok || body.type === 'error') {
      logger.error({ event: 'MSG91_SEND_FAILED', mobile, body });
      throw new Error(`MSG91 error: ${body.message || 'unknown'}`);
    }

    logger.info({ event: 'MSG91_SENT', mobile });
  }
}

module.exports = MSG91Adapter;
