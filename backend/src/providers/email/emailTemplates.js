'use strict';

/**
 * Inline HTML email templates keyed by NOTIFICATION_TYPES.* values.
 *
 * Each template is a function (variables) => htmlString.
 *
 * INVARIANT: every value in core.utils.constants.CRITICAL_NOTIFICATION_TYPES
 * MUST have a matching key here. The drift-guard test in
 * __tests__/ResendAdapter.security.test.js enforces this at CI time so we
 * cannot silently degrade to the dropped raw-HTML fallback (which previously
 * JSON-stringified user-supplied variables into raw HTML — XSS-in-email
 * surface).
 *
 * To add a new critical notification type:
 *   1. Add the constant in core/utils/constants.js NOTIFICATION_TYPES
 *   2. Add the constant to CRITICAL_NOTIFICATION_TYPES if it should fall
 *      back to email when FCM fails
 *   3. Add the template here — the drift-guard test will fail until you do
 *   4. Lift to a real template engine / Resend templates when this map grows
 *      past ~10 entries
 */
const EMAIL_TEMPLATES = Object.freeze({
  booking_confirmed: (v) =>
    `<h2>Booking Confirmed</h2><p>Your session is confirmed${v.slot ? ` for ${v.slot}` : ''}.</p>`,
  booking_cancelled: () =>
    `<h2>Booking Cancelled</h2><p>Your booking has been cancelled.</p>`,
  session_reminder: (v) =>
    `<h2>Session Reminder</h2><p>Your session is coming up${v.slot ? ` at ${v.slot}` : ''}.</p>`,
  therapist_verified: () =>
    `<h2>Account Verified</h2><p>Congratulations! Your therapist account has been verified.</p>`,
  account_deleted: () =>
    `<h2>Account Deleted</h2><p>Your MWP account has been permanently deleted.</p>`,
});

module.exports = EMAIL_TEMPLATES;
