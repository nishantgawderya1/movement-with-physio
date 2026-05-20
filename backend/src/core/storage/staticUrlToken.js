'use strict';

/**
 * Short-lived signed-URL tokens for the auth-gate-free `/static` route used
 * by the local-disk storage driver.
 *
 * Why this exists: the local-disk PDF URLs are opened in the device's
 * default browser (via Linking.openURL). Browsers don't carry the Clerk
 * session, so an auth-gated /static returns 401. Replacing the auth gate
 * with a query-param HMAC token gives us per-URL, time-boxed access —
 * same risk profile as an S3 presigned URL.
 *
 * Token format: `<exp>.<base64url-hmac>` where the HMAC is over
 * `<key>|<exp>` (so the token is bound to the file path; an attacker
 * can't reuse it to fetch a different file).
 *
 * Signing key: derived from FIELD_ENCRYPTION_KEY via an HMAC with a
 * domain-separation tag, so we never reuse the encryption key directly
 * for two purposes. Constant once env validation runs at boot.
 */

const crypto = require('crypto');

const TOKEN_SEP = '.';
const PAYLOAD_SEP = '|';
const DOMAIN_TAG = 'static-url-signing-v1';

let _signingKey = null;

function getSigningKey() {
  if (_signingKey) return _signingKey;
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) throw new Error('FIELD_ENCRYPTION_KEY missing — required to derive static-URL signing key');
  if (hex.length !== 64) throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  const root = Buffer.from(hex, 'hex');
  _signingKey = crypto.createHmac('sha256', root).update(DOMAIN_TAG).digest();
  return _signingKey;
}

/**
 * Sign a token for the given key with `expiresInSeconds` TTL.
 *
 * @param {string} key - the storage key (e.g. 'assessments/abc.pdf') —
 *   should be the same shape the verifier will see in `req.path`.
 * @param {number} [expiresInSeconds=300]
 * @returns {string} `<exp>.<sig>`
 */
function signStaticToken(key, expiresInSeconds = 300) {
  const exp = Math.floor(Date.now() / 1000) + Number(expiresInSeconds);
  const payload = `${key}${PAYLOAD_SEP}${exp}`;
  const sig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
  return `${exp}${TOKEN_SEP}${sig}`;
}

/**
 * Verify a token against a key. Returns `{ ok: true, exp }` on success or
 * `{ ok: false, reason }` on any failure. Reasons:
 *   - 'missing'    — no token
 *   - 'malformed'  — token didn't split cleanly
 *   - 'bad-exp'    — expiry isn't a finite number
 *   - 'expired'    — exp is in the past
 *   - 'sig'        — HMAC mismatch (tampered key OR wrong signing key)
 *
 * Uses crypto.timingSafeEqual to avoid timing oracles on the signature
 * comparison.
 *
 * @param {string} key
 * @param {string|undefined} token
 * @returns {{ ok: boolean, exp?: number, reason?: string }}
 */
function verifyStaticToken(key, token) {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing' };
  const idx = token.indexOf(TOKEN_SEP);
  if (idx <= 0 || idx === token.length - 1) return { ok: false, reason: 'malformed' };
  const expStr = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return { ok: false, reason: 'bad-exp' };
  if (exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' };

  const payload = `${key}${PAYLOAD_SEP}${exp}`;
  const expected = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('base64url');

  // timingSafeEqual requires equal-length buffers. Length mismatch =
  // structural mismatch and we can bail without leaking timing info.
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return { ok: false, reason: 'sig' };
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { ok: false, reason: 'sig' };

  return { ok: true, exp };
}

module.exports = { signStaticToken, verifyStaticToken };
