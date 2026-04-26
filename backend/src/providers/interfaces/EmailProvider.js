'use strict';

/**
 * EmailProvider interface.
 */
class EmailProvider {
  /**
   * Send a transactional (1:1) email.
   * @param {string} to
   * @param {{ subject: string, templateId: string, variables: object }} options
   * @returns {Promise<void>}
   */
  async sendTransactional(to, { subject, templateId, variables }) {
    throw new Error('EmailProvider.sendTransactional() not implemented');
  }

  /**
   * Send a bulk email to multiple recipients.
   * @param {string[]} recipients
   * @param {{ subject: string, templateId: string, variables: object }} options
   * @returns {Promise<void>}
   */
  async sendBulk(recipients, { subject, templateId, variables }) {
    throw new Error('EmailProvider.sendBulk() not implemented');
  }
}

module.exports = EmailProvider;
