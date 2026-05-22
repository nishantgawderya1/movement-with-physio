'use strict';

const fs = require('fs');
const path = require('path');
const StorageAdapter = require('./StorageAdapter');
const { signStaticToken } = require('./staticUrlToken');

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

  async getSignedUrl(key, { expiresInSeconds = 300 } = {}) {
    // Local-disk: mint a short-lived HMAC token bound to this key so the
    // /static route can serve the file to browser clients (who can't carry
    // the Clerk session token). Same risk profile as an S3 presigned URL —
    // see staticUrlToken.js for the format.
    const safeKey = key.replace(/^\/+/, '');
    const token = signStaticToken(safeKey, expiresInSeconds);
    return `${this.publicBaseUrl}/static/${safeKey}?token=${token}`;
  }

  async exists(key) {
    try { await fs.promises.access(this._full(key)); return true; }
    catch { return false; }
  }
}

module.exports = LocalDiskStorage;
