'use strict';

const fs = require('fs');
const path = require('path');
const StorageAdapter = require('./StorageAdapter');

class LocalDiskStorage extends StorageAdapter {
  constructor({ baseDir, publicBaseUrl }) {
    super();
    this.baseDir = path.resolve(baseDir);
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  _full(key) {
    // prevent path traversal
    const safe = key.replace(/^\/+/, '').replace(/\.\.\//g, '');
    return path.join(this.baseDir, safe);
  }

  async putPdf(buffer, key) {
    const full = this._full(key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, buffer);
    return { key, url: `${this.publicBaseUrl}/static/${key}`, driver: 'local' };
  }

  async getSignedUrl(key /* , opts */) {
    // local: no signing, just return the static URL
    const safeKey = key.replace(/^\/+/, '');
    return `${this.publicBaseUrl}/static/${safeKey}`;
  }

  async exists(key) {
    try { await fs.promises.access(this._full(key)); return true; }
    catch { return false; }
  }
}

module.exports = LocalDiskStorage;
