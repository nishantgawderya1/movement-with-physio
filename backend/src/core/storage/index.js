'use strict';

const env = require('../../config/env');
const LocalDiskStorage = require('./LocalDiskStorage');
const S3CompatibleStorage = require('./S3CompatibleStorage');

let _instance = null;

/**
 * Lazy-singleton storage accessor. Selected by env.STORAGE_DRIVER.
 * Used by the assessment PDF worker and any future feature that needs
 * to persist generated documents.
 *
 * @returns {import('./StorageAdapter')}
 */
function getStorage() {
  if (_instance) return _instance;
  if (env.STORAGE_DRIVER === 's3') {
    _instance = new S3CompatibleStorage({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
    });
  } else {
    _instance = new LocalDiskStorage({
      baseDir: env.STORAGE_LOCAL_DIR,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
    });
  }
  return _instance;
}

module.exports = { getStorage };
