'use strict';

// Ensure the env key is present before requiring the helper (it reads
// process.env.FIELD_ENCRYPTION_KEY lazily inside encrypt/decrypt, so this
// must happen before the first call — not before the require itself).
require('dotenv').config({ path: '.env.local' });

const { encrypt, decrypt, isEncrypted, CURRENT_VERSION } = require('../fieldCrypto');

describe('fieldCrypto AES-GCM helper', () => {
  test('encrypt then decrypt round-trips a phone number', () => {
    const plain = '+919876543210';
    const ct = encrypt(plain);
    expect(ct).not.toBe(plain);
    expect(decrypt(ct)).toBe(plain);
  });

  test('encrypt twice on the same plaintext produces different ciphertext (IV randomized)', () => {
    const plain = '+919876543210';
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    // Both still decrypt to the same plaintext
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  test('decrypt rejects tampered ciphertext', () => {
    const ct = encrypt('+919876543210');
    const parts = ct.split(':');
    // Flip one byte in the ciphertext segment (index 3 of v1:iv:tag:ct)
    const ctBytes = Buffer.from(parts[3], 'base64');
    ctBytes[0] ^= 0x01;
    parts[3] = ctBytes.toString('base64');
    const tampered = parts.join(':');
    expect(() => decrypt(tampered)).toThrow();
  });

  test('decrypt passes through plaintext unchanged (handles legacy data)', () => {
    expect(decrypt('+919876543210')).toBe('+919876543210');
    expect(decrypt('not-encrypted-value')).toBe('not-encrypted-value');
  });

  test('encrypt with null / undefined / empty returns the input unchanged', () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeUndefined();
    expect(encrypt('')).toBe('');
  });

  test('decrypt with null / undefined / empty returns the input unchanged', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeUndefined();
    expect(decrypt('')).toBe('');
  });

  test('isEncrypted identifies encrypted vs plaintext strings', () => {
    const ct = encrypt('+919876543210');
    expect(isEncrypted(ct)).toBe(true);
    expect(isEncrypted('+919876543210')).toBe(false);
    expect(isEncrypted('v1:notbase64')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(123)).toBe(false);
  });

  test('encrypted format starts with the current version prefix', () => {
    const ct = encrypt('hello');
    expect(ct.startsWith(`v${CURRENT_VERSION}:`)).toBe(true);
  });

  test('unknown version on decrypt throws', () => {
    // Forge a v999: payload — getKey() should reject it.
    expect(() => decrypt('v999:AAAA:BBBB:CCCC')).toThrow(/Unknown field-crypto version/);
  });
});
