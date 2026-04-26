'use strict';

const crypto = require('crypto');
const VideoProvider = require('../interfaces/VideoProvider');

/**
 * WebRTC adapter — generates TURN/STUN credentials using HMAC-SHA1.
 * Compatible with standard Coturn time-limited credentials.
 */
class WebRTCAdapter extends VideoProvider {
  constructor({ turnServerUrl, turnSecret, turnTtl = 86400 }) {
    super();
    this.turnServerUrl = turnServerUrl;
    this.turnSecret = turnSecret;
    this.turnTtl = parseInt(turnTtl, 10);
  }

  /**
   * Generate time-limited TURN credentials.
   * @returns {Promise<{ iceServers: Array }>}
   */
  async getTurnCredentials() {
    const timestamp = Math.floor(Date.now() / 1000) + this.turnTtl;
    const username = `${timestamp}:mwp`;
    const credential = crypto
      .createHmac('sha1', this.turnSecret)
      .update(username)
      .digest('base64');

    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: this.turnServerUrl,
          username,
          credential,
        },
      ],
      ttl: this.turnTtl,
    };
  }
}

module.exports = WebRTCAdapter;
