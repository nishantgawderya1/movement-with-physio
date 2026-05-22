'use strict';

const { Resend } = require('resend');
const EmailProvider = require('../interfaces/EmailProvider');
const ApiError = require('../../core/utils/ApiError');
const logger = require('../../core/utils/logger');
const EMAIL_TEMPLATES = require('./emailTemplates');

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
   * Render a templated email body. Throws on unknown templateId rather than
   * falling back to raw HTML — the previous fallback JSON-stringified
   * variables into `<p>${JSON.stringify(v)}</p>`, an XSS-in-email surface
   * the moment templateId became attacker-controllable. See S-followup-12.
   * @param {string} templateId
   * @param {object} variables
   * @returns {string} HTML string
   */
  _renderTemplate(templateId, variables) {
    const renderer = EMAIL_TEMPLATES[templateId];
    if (!renderer) {
      throw new ApiError(500, `Unknown email templateId: ${templateId}`, {
        code: 'INVALID_TEMPLATE_ID',
        details: { templateId },
      });
    }
    return renderer(variables || {});
  }
}

module.exports = ResendAdapter;
