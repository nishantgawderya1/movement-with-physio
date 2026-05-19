'use strict';

/**
 * StorageAdapter interface.
 * Implementations must provide: putPdf(buffer, key, opts), getSignedUrl(key, opts), exists(key).
 */
class StorageAdapter {
  async putPdf(_buffer, _key, _opts) { throw new Error('not implemented'); }
  async getSignedUrl(_key, _opts) { throw new Error('not implemented'); }
  async exists(_key) { throw new Error('not implemented'); }
}

module.exports = StorageAdapter;
