'use strict';

/**
 * VideoProvider interface.
 * All video adapters must implement these methods.
 */
class VideoProvider {
  /**
   * Generate TURN/STUN credentials for a client.
   * @returns {Promise<{ iceServers: Array }>}
   */
  async getTurnCredentials() {
    throw new Error('VideoProvider.getTurnCredentials() not implemented');
  }
}

module.exports = VideoProvider;
