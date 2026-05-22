'use strict';

/**
 * Sanitize a user-supplied display name for safe embedding into
 * server-controlled surfaces (push notification bodies, email subjects, etc.).
 *
 * Pipeline: strip control & zero-width characters -> HTML-escape -> trim -> cap.
 * Returns null for empty / non-string / whitespace-only inputs so callers can
 * branch on a falsy return and fall back to a generic message.
 *
 * Defense-in-depth: even when the name source is gated server-side (Clerk
 * init), an attacker who controls their own profile could inject zero-width
 * characters, control chars, or HTML payloads that would render unexpectedly
 * in the OS notification shade or email client. This neutralizes all three.
 */
function sanitizeDisplayName(name, { maxLength = 50 } = {}) {
  if (!name || typeof name !== 'string') return null;

  // Strip C0/C1 control characters, DEL, and zero-width / bidi-override codepoints.
  // eslint-disable-next-line no-control-regex
  const stripped = name.replace(/[\x00-\x1f\x7f​-‏‪-‮]/g, '');

  // HTML-escape — safe for notification surfaces that may pass through
  // email HTML or in-app HTML renderers downstream.
  const escaped = stripped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  const trimmed = escaped.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength).trimEnd();
}

module.exports = sanitizeDisplayName;
