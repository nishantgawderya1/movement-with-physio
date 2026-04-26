'use strict';

const providerConfig = require('../config/providers');
const featureFlags = require('../config/featureFlags');

// Adapters
const ClerkAdapter = require('../providers/auth/ClerkAdapter');
const S3Adapter = require('../providers/storage/S3Adapter');
const MSG91Adapter = require('../providers/sms/MSG91Adapter');
const FCMAdapter = require('../providers/notification/FCMAdapter');
const ResendAdapter = require('../providers/email/ResendAdapter');
const SocketIOAdapter = require('../providers/messaging/SocketIOAdapter');
const WebRTCAdapter = require('../providers/video/WebRTCAdapter');

// Core
const cacheManager = require('../core/cache/cacheManager');
const { createQueue } = require('../core/jobs/jobQueue');
const CircuitBreaker = require('../core/utils/circuitBreaker');
const logger = require('../core/utils/logger');

/**
 * DI Container — single source of truth for all singletons.
 * All modules and plugins receive `container` to access providers.
 */
const container = {
  auth: null,
  storage: null,
  sms: null,
  notification: null,
  email: null,
  messaging: null,
  video: null,
  cache: null,
  queue: null,
  breakers: {},
};

/**
 * Build and wire the container from environment variables.
 * Call once during server bootstrap.
 * @param {import('ioredis').Redis} redis
 */
async function init(redis) {
  const env = process.env;

  // ── Auth ───────────────────────────────────────────────────
  if (providerConfig.auth === 'clerk') {
    container.auth = new ClerkAdapter(env.CLERK_SECRET_KEY);
    logger.info({ event: 'DI_PROVIDER', service: 'auth', adapter: 'clerk' });
  }

  // ── Storage ────────────────────────────────────────────────
  if (providerConfig.storage === 's3') {
    container.storage = new S3Adapter({
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
    });
    logger.info({ event: 'DI_PROVIDER', service: 'storage', adapter: 's3' });
  }

  // ── SMS ────────────────────────────────────────────────────
  if (providerConfig.sms === 'msg91') {
    container.sms = new MSG91Adapter({
      authKey: env.MSG91_AUTH_KEY,
      templateId: env.MSG91_TEMPLATE_ID,
      senderId: env.MSG91_SENDER_ID,
    });
    logger.info({ event: 'DI_PROVIDER', service: 'sms', adapter: 'msg91' });
  }

  // ── Notifications ──────────────────────────────────────────
  if (providerConfig.notification === 'fcm') {
    container.notification = new FCMAdapter(env.FIREBASE_SERVICE_ACCOUNT);
    logger.info({ event: 'DI_PROVIDER', service: 'notification', adapter: 'fcm' });
  }

  // ── Email ──────────────────────────────────────────────────
  if (providerConfig.email === 'resend') {
    container.email = new ResendAdapter({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    });
    logger.info({ event: 'DI_PROVIDER', service: 'email', adapter: 'resend' });
  }

  // ── Messaging (Socket.IO — io injected later) ──────────────
  container.messaging = new SocketIOAdapter();
  logger.info({ event: 'DI_PROVIDER', service: 'messaging', adapter: 'socketio' });

  // ── Video ──────────────────────────────────────────────────
  container.video = new WebRTCAdapter({
    turnServerUrl: env.TURN_SERVER_URL,
    turnSecret: env.TURN_SECRET,
    turnTtl: env.TURN_TTL,
  });
  logger.info({ event: 'DI_PROVIDER', service: 'video', adapter: 'webrtc' });

  // ── Cache ──────────────────────────────────────────────────
  container.cache = cacheManager.init(redis);
  logger.info({ event: 'DI_CACHE_READY' });

  // ── Job Queue ──────────────────────────────────────────────
  container.queue = createQueue(redis);
  logger.info({ event: 'DI_QUEUE_READY' });

  // ── Feature Flags ──────────────────────────────────────────
  featureFlags.init(redis);

  // ── Circuit Breakers ───────────────────────────────────────
  container.breakers = {
    clerk: new CircuitBreaker('clerk', { timeout: 3000, errorThresholdPercentage: 50 }),
    fcm: new CircuitBreaker('fcm', { timeout: 5000, errorThresholdPercentage: 50 }),
    resend: new CircuitBreaker('resend', { timeout: 5000, errorThresholdPercentage: 50 }),
    s3: new CircuitBreaker('s3', { timeout: 10000, errorThresholdPercentage: 50 }),
  };
  logger.info({ event: 'DI_BREAKERS_READY' });

  return container;
}

module.exports = { container, init };
