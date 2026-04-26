'use strict';

const { Resend } = require('resend');
const EmailProvider = require('../interfaces/EmailProvider');
const logger = require('../../core/utils/logger');

class ResendAdapter extends EmailProvider {
  constructor({ apiKey, from }) {
    super();
    this.client = new Resend(apiKey);
    this.from = from;
  }

  /**
   * Send a single transactional email.
   * @param {string} to
   * @param {{ subject: string, templateId: string, variables: object }} options
   */
  async sendTransactional(to, { subject, templateId, variables }) {
    try {
      const html = this._renderTemplate(templateId, variables);
      await this.client.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });
      logger.info({ event: 'EMAIL_SENT', to, templateId });
    } catch (err) {
      logger.error({ event: 'EMAIL_FAILED', to, templateId, err: err.message });
      throw err;
    }
  }

  /**
   * Send bulk email to multiple recipients.
   * @param {string[]} recipients
   * @param {{ subject: string, templateId: string, variables: object }} options
   */
  async sendBulk(recipients, { subject, templateId, variables }) {
    await Promise.allSettled(
      recipients.map((to) => this.sendTransactional(to, { subject, templateId, variables }))
    );
  }

  /**
   * Simple inline template renderer.
   * In production, swap with a proper template engine or Resend templates.
   * @param {string} templateId
   * @param {object} variables
   * @returns {string} HTML string
   */
  _renderTemplate(templateId, variables) {
    const v = variables || {};
    const templates = {
      booking_confirmed: `<h2>Booking Confirmed</h2><p>Your session is confirmed${v.slot ? ` for ${v.slot}` : ''}.</p>`,
      booking_cancelled: `<h2>Booking Cancelled</h2><p>Your booking has been cancelled.</p>`,
      session_reminder: `<h2>Session Reminder</h2><p>Your session is coming up${v.slot ? ` at ${v.slot}` : ''}.</p>`,
      therapist_verified: `<h2>Account Verified</h2><p>Congratulations! Your therapist account has been verified.</p>`,
      account_deleted: `<h2>Account Deleted</h2><p>Your MWP account has been permanently deleted.</p>`,
    };
    return templates[templateId] || `<p>${JSON.stringify(v)}</p>`;
  }
}

module.exports = ResendAdapter;
