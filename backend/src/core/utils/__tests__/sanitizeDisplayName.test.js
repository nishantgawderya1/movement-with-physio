'use strict';

const sanitizeDisplayName = require('../sanitizeDisplayName');

describe('sanitizeDisplayName', () => {
  test('passes through benign ASCII names unchanged', () => {
    expect(sanitizeDisplayName('Alice Smith')).toBe('Alice Smith');
    expect(sanitizeDisplayName('Dr. Bob')).toBe('Dr. Bob');
  });

  test('returns null for empty / null / undefined / non-string', () => {
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(undefined)).toBeNull();
    expect(sanitizeDisplayName('')).toBeNull();
    expect(sanitizeDisplayName('   ')).toBeNull();
    expect(sanitizeDisplayName(123)).toBeNull();
    expect(sanitizeDisplayName({})).toBeNull();
  });

  test('HTML-escapes angle brackets, quotes, ampersands', () => {
    expect(sanitizeDisplayName('<script>')).toBe('&lt;script&gt;');
    expect(sanitizeDisplayName('a & b')).toBe('a &amp; b');
    expect(sanitizeDisplayName('Say "hi"')).toBe('Say &quot;hi&quot;');
    expect(sanitizeDisplayName("O'Brien")).toBe('O&#x27;Brien');
  });

  test('strips control characters', () => {
    expect(sanitizeDisplayName('Alice\x00Smith')).toBe('AliceSmith');
    expect(sanitizeDisplayName('Bob\nNewline')).toBe('BobNewline');
    expect(sanitizeDisplayName('Tab\there')).toBe('Tabhere');
  });

  test('strips zero-width and bidi-override codepoints', () => {
    // U+200B zero-width space, U+200E LTR mark, U+202E RTL override
    expect(sanitizeDisplayName('Ali​ce')).toBe('Alice');
    expect(sanitizeDisplayName('‮evil')).toBe('evil');
  });

  test('caps at maxLength (default 50)', () => {
    const long = 'a'.repeat(100);
    const result = sanitizeDisplayName(long);
    expect(result.length).toBe(50);
  });

  test('respects custom maxLength', () => {
    expect(sanitizeDisplayName('abcdefghij', { maxLength: 5 })).toBe('abcde');
  });

  test('trims trailing whitespace after cap', () => {
    const result = sanitizeDisplayName('Alice           extra', { maxLength: 8 });
    expect(result).toBe('Alice');
  });

  test('escape happens BEFORE cap (one escape entity can outweigh original char)', () => {
    // "a<b" -> "a&lt;b" (6 chars); with maxLength=4 should be "a&lt" then trimEnd -> "a&lt"
    const result = sanitizeDisplayName('a<b', { maxLength: 4 });
    expect(result).toBe('a&lt');
  });
});
