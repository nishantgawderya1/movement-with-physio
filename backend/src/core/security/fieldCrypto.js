'use strict';

const crypto = require('crypto');

/**
 * AES-256-GCM field encryption helper.
 *
 * Format: `v<version>:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>`
 *
 * Why GCM: AEAD (authenticated encryption with associated data). The authTag
 *   detects tampering — if anyone modifies the ciphertext in the DB,
 *   decryption throws on `decipher.final()`.
 *
 * Why a version prefix: lets us rotate keys later without re-encrypting
 *   everything in one migration. New writes use the latest version; old
 *   reads still resolve via the version-keyed registry in `getKey()`.
 *
 * Key requirement: 32 bytes (64 hex chars). Validated at app boot via Joi in
 *   src/config/env.js (FIELD_ENCRYPTION_KEY).
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;          // GCM standard / recommended
const AUTH_TAG_BYTES = 16;    // length included for clarity; setAuthTag reads it from buffer
const CURRENT_VERSION = 1;

/**
 * Resolve the 32-byte key for a given format version.
 * Phase 3A.1: single key. Future: load from a per-version registry.
 *
 * @param {number} version
 * @returns {Buffer}
 */
function getKey(version) {
  if (version !== 1) {
    throw new Error(`Unknown field-crypto version: v${version}`);
  }
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) throw new Error('FIELD_ENCRYPTION_KEY env var missing');
  if (hex.length !== 64) throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(hex, 'hex');
}

/**
 * Detect whether a string is already in our encrypted format.
 * Used to make encrypt() idempotent and let post('init') skip plaintext
 * values during migrations.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  if (typeof value !== 'string') return false;
  return /^v\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Encrypt a value with the current key/version. Pass-through for nullish or empty.
 *
 * @param {string|null|undefined} plaintext
 * @returns {string|null|undefined}
 */
function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return plaintext;
  const value = String(plaintext);
  const key = getKey(CURRENT_VERSION);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    `v${CURRENT_VERSION}`,
    iv.toString('base64'),
    authTag.toString('base64'),
    ct.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a value previously produced by encrypt(). Pass-through for plaintext
 * or nullish input (so reads of pre-migration documents don't throw).
 *
 * Throws if the value claims to be encrypted (matches format) but the authTag
 * doesn't validate (tampering or key mismatch).
 *
 * @param {string|null|undefined} encryptedString
 * @returns {string|null|undefined}
 */
function decrypt(encryptedString) {
  if (encryptedString == null || encryptedString === '') return encryptedString;
  if (!isEncrypted(encryptedString)) return encryptedString;
  const [vPart, ivB64, tagB64, ctB64] = encryptedString.split(':');
  const version = Number(vPart.slice(1));
  const key = getKey(version);
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

module.exports = { encrypt, decrypt, isEncrypted, CURRENT_VERSION };
