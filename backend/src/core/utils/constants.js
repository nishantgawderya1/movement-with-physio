'use strict';

/**
 * App-wide constants.
 */

const ROLES = Object.freeze({
  PATIENT: 'patient',
  THERAPIST: 'therapist',
  ADMIN: 'admin',
});

const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  SESSION_REMINDER: 'session_reminder',
  THERAPIST_VERIFIED: 'therapist_verified',
  ACCOUNT_DELETED: 'account_deleted',
  NEW_MESSAGE: 'new_message',
  SESSION_NOTE_ADDED: 'session_note_added',
});

const CRITICAL_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPES.BOOKING_CONFIRMED,
  NOTIFICATION_TYPES.BOOKING_CANCELLED,
  NOTIFICATION_TYPES.SESSION_REMINDER,
  NOTIFICATION_TYPES.THERAPIST_VERIFIED,
  NOTIFICATION_TYPES.ACCOUNT_DELETED,
];

const EXERCISE_DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
});

const FILE_LIMITS = Object.freeze({
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
  ],
});

const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

const REDIS_TTL = Object.freeze({
  USER_PROFILE: 15 * 60,           // 15 min
  EXERCISE: 60 * 60,               // 1 hr
  EXERCISE_LIST: 60 * 60,          // 1 hr
  QUESTIONNAIRE: 24 * 60 * 60,     // 24 hr
  SLOTS: 5 * 60,                   // 5 min
  DASHBOARD: 5 * 60,               // 5 min
  IDEMPOTENCY: 24 * 60 * 60,       // 24 hr
  OTP_ATTEMPTS: 15 * 60,           // 15 min
  FEATURE_FLAGS: 10 * 60,          // 10 min
});

module.exports = {
  ROLES,
  BOOKING_STATUS,
  NOTIFICATION_TYPES,
  CRITICAL_NOTIFICATION_TYPES,
  EXERCISE_DIFFICULTY,
  FILE_LIMITS,
  PAGINATION,
  REDIS_TTL,
};
