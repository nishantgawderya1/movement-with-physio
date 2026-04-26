'use strict';

/**
 * StorageProvider interface.
 * All storage adapters must implement these methods.
 */
class StorageProvider {
  /**
   * Upload a buffer to storage.
   * @param {Buffer} buffer
   * @param {string} key
   * @param {string} mimeType
   * @returns {Promise<{ key: string, url: string }>}
   */
  async upload(buffer, key, mimeType) {
    throw new Error('StorageProvider.upload() not implemented');
  }

  /**
   * Stream-upload large files without buffering in RAM.
   * @param {import('stream').Readable} fileStream
   * @param {string} key
   * @param {string} mimeType
   * @returns {Promise<{ key: string, url: string }>}
   */
  async streamUpload(fileStream, key, mimeType) {
    throw new Error('StorageProvider.streamUpload() not implemented');
  }

  /**
   * Generate a presigned URL valid for a limited time.
   * @param {string} key
   * @param {number} expiresInSeconds
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresInSeconds) {
    throw new Error('StorageProvider.getSignedUrl() not implemented');
  }
}

module.exports = StorageProvider;
