'use strict';

const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_BASE_URL: Joi.string().uri().default('http://localhost:3000'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().required(),

  // Database
  MONGODB_URI: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().required(),

  // Clerk
  CLERK_SECRET_KEY: Joi.string().required(),
  CLERK_WEBHOOK_SECRET: Joi.string().required(),

  // AWS S3
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().required(),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT: Joi.string().default('{}'),

  // MSG91
  MSG91_AUTH_KEY: Joi.string().required(),
  MSG91_TEMPLATE_ID: Joi.string().required(),
  MSG91_SENDER_ID: Joi.string().default('MWPHYS'),

  // Email
  EMAIL_PROVIDER: Joi.string().valid('resend', 'ses').default('resend'),
  RESEND_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().email().required(),

  // Field encryption (32-byte hex key = 64 hex chars)
  FIELD_ENCRYPTION_KEY: Joi.string().length(64).required(),

  // Admin seed
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_NAME: Joi.string().required(),

  // Provider selection
  AUTH_PROVIDER: Joi.string().default('clerk'),
  STORAGE_PROVIDER: Joi.string().default('s3'),
  SMS_PROVIDER: Joi.string().default('msg91'),
  NOTIFICATION_PROVIDER: Joi.string().default('fcm'),
  VIDEO_PROVIDER: Joi.string().default('webrtc'),
  MESSAGING_PROVIDER: Joi.string().default('socketio'),

  // TURN/STUN
  TURN_SERVER_URL: Joi.string().required(),
  TURN_SECRET: Joi.string().required(),
  TURN_TTL: Joi.number().default(86400),

  // ── Phase 2: Storage (assessment PDFs etc.) ──────────────────
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  STORAGE_LOCAL_DIR: Joi.string().default('./storage'),
  STORAGE_PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_REGION: Joi.string().default('auto'),
  // S3_BUCKET is already declared above (required by legacy exercise storage).
  // For the new StorageAdapter we additionally require S3_ACCESS_KEY_ID and
  // S3_SECRET_ACCESS_KEY only when STORAGE_DRIVER === 's3' so non-AWS
  // S3-compatible providers (R2, MinIO) can be selected without touching
  // the legacy AWS_* credentials used by the exercise plugin.
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  S3_PUBLIC_BASE_URL: Joi.string().uri().optional(),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true),

  // ── Phase 2: Metered TURN ────────────────────────────────────
  METERED_DOMAIN: Joi.string().required(),
  METERED_SECRET_KEY: Joi.string().required(),
  METERED_CREDENTIAL_TTL_SECONDS: Joi.number().integer().min(900).max(86400).default(7200),
  METERED_REGION: Joi.string().default('global'),
  METERED_CACHE_TTL_SECONDS: Joi.number().integer().min(60).max(21600).default(3600),

  // ── Phase 2: Video / Assessment ──────────────────────────────
  VIDEO_CALL_JOIN_WINDOW_MINUTES: Joi.number().integer().default(10),
  VIDEO_CALL_TIMEOUT_MINUTES: Joi.number().integer().default(15),
  ASSESSMENT_PDF_PREFIX: Joi.string().default('assessments/'),
}).unknown(true);

const { error, value: env } = schema.validate(process.env, { allowUnknown: true, abortEarly: false });

if (error) {
  const missing = error.details.map((d) => `  • ${d.message}`).join('\n');
  throw new Error(`Environment validation failed:\n${missing}`);
}

module.exports = env;
