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
  // Phase 2 — instant video call lifecycle
  INSTANT_PENDING: 'instant_pending',
  INSTANT_DECLINED: 'instant_declined',
});

const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  SESSION_REMINDER: 'session_reminder',
  THERAPIST_VERIFIED: 'therapist_verified',
  ACCOUNT_DELETED: 'account_deleted',
  NEW_MESSAGE: 'new_message',
  VIDEO_CALL: 'video_call',
  SESSION_NOTE_ADDED: 'session_note_added',
  // Phase 2 — video calls + assessments
  VIDEO_CALL_REQUESTED: 'video_call_requested',
  VIDEO_CALL_SCHEDULED: 'video_call_scheduled',
  VIDEO_CALL_REMINDER: 'video_call_reminder',
  VIDEO_CALL_DECLINED: 'video_call_declined',
  ASSESSMENT_COMPLETED: 'assessment_completed',
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

// ── Phase 2 — video calling / instant booking / assessments ────────
const MEETING_TYPE = Object.freeze({
  VIDEO: 'video',
  IN_PERSON: 'in_person',
});

const VIDEO_CALL_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  INITIATED: 'initiated',
  ONGOING: 'ongoing',
  ENDED: 'ended',
  MISSED: 'missed',
});

const ASSESSMENT_MODE = Object.freeze({
  PATIENT_SELF: 'patient_self',
  THERAPIST_DRIVEN: 'therapist_driven',
});

const SCHEDULED_MODE = Object.freeze({
  SLOT_BOOKING: 'slot_booking',
  INSTANT: 'instant',
});

const INSTANT_DELAY_MINUTES = Object.freeze([15, 30]);
const INSTANT_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const JOB_NAMES = Object.freeze({
  SEND_NOTIFICATION: 'send_notification',
  GENERATE_ASSESSMENT_PDF: 'generate_assessment_pdf',
  AUTO_CLEAR_AVAILABILITY: 'auto_clear_availability',
  EXPIRE_INSTANT_REQUESTS: 'expire_instant_requests',
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
  // Phase 2
  MEETING_TYPE,
  VIDEO_CALL_STATUS,
  ASSESSMENT_MODE,
  SCHEDULED_MODE,
  INSTANT_DELAY_MINUTES,
  INSTANT_REQUEST_TIMEOUT_MS,
  JOB_NAMES,
};
