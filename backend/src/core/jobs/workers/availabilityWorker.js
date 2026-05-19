'use strict';

const { Worker } = require('bullmq');
const logger = require('../../utils/logger');
const {
  JOB_NAMES, BOOKING_STATUS, NOTIFICATION_TYPES,
} = require('../../utils/constants');
const { QUEUE_NAME, addJob, getQueue, getBullMQConnection } = require('../jobQueue');
const User = require('../../../models/User.model');
const Booking = require('../../../models/Booking.model');
const cacheManager = require('../../cache/cacheManager');

const EXPIRE_REPEAT_EVERY_MS = 60 * 1000; // 1 minute

/**
 * Handler: AUTO_CLEAR_AVAILABILITY
 * Fired ~2h after a therapist toggles availableNow ON. Only clears the flag
 * if availableNowSince still matches the timestamp captured at enqueue time,
 * so a manual re-toggle in between is not clobbered.
 */
async function handleAutoClearAvailability(job) {
  const { clerkId, availableNowSince } = job.data || {};
  if (!clerkId || !availableNowSince) {
    logger.warn({ event: 'AUTO_CLEAR_BAD_JOB_DATA', jobId: job.id });
    return;
  }

  const user = await User.findOne({ clerkId, role: 'therapist' }).select('availableNow availableNowSince');
  if (!user) {
    logger.info({ event: 'AUTO_CLEAR_USER_NOT_FOUND', clerkId });
    return;
  }

  if (!user.availableNow) {
    // Already off.
    return;
  }

  const enqueuedAt = new Date(availableNowSince).getTime();
  const currentSince = user.availableNowSince ? new Date(user.availableNowSince).getTime() : null;
  if (currentSince !== enqueuedAt) {
    logger.info({
      event: 'AUTO_CLEAR_SKIPPED_STALE',
      clerkId, enqueuedAt, currentSince,
    });
    return;
  }

  user.availableNow = false;
  user.availableNowSince = null;
  await user.save();
  await cacheManager.invalidate(`therapist:profile:${clerkId}`);
  logger.info({ event: 'AUTO_CLEAR_AVAILABILITY_DONE', clerkId });
}

/**
 * Handler: EXPIRE_INSTANT_REQUESTS
 * Finds all INSTANT_PENDING bookings whose instantExpiresAt has passed;
 * flips them to INSTANT_DECLINED and notifies the patient.
 */
async function handleExpireInstantRequests() {
  const now = new Date();
  const expired = await Booking.find({
    status: BOOKING_STATUS.INSTANT_PENDING,
    instantExpiresAt: { $lt: now },
    isDeleted: false,
  }).select('_id patientId therapistId');

  if (expired.length === 0) return { expired: 0 };

  for (const b of expired) {
    b.status = BOOKING_STATUS.INSTANT_DECLINED;
    await b.save();
    try {
      await addJob(JOB_NAMES.SEND_NOTIFICATION, {
        userId: String(b.patientId),
        title: 'Instant Call Timed Out',
        body: 'Your therapist did not respond in time. Please try a regular booking.',
        type: NOTIFICATION_TYPES.VIDEO_CALL_DECLINED,
        data: { bookingId: String(b._id) },
      });
    } catch (err) {
      logger.warn({ event: 'EXPIRE_NOTIFY_ENQUEUE_FAILED', bookingId: b._id, err: err.message });
    }
  }

  logger.info({ event: 'INSTANT_REQUESTS_EXPIRED', count: expired.length });
  return { expired: expired.length };
}

/**
 * Start the availability worker (handles both auto-clear and instant-expire).
 */
function startAvailabilityWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case JOB_NAMES.AUTO_CLEAR_AVAILABILITY:
          return handleAutoClearAvailability(job);
        case JOB_NAMES.EXPIRE_INSTANT_REQUESTS:
          return handleExpireInstantRequests();
        default:
          return; // not for this worker
      }
    },
    {
      connection: getBullMQConnection(process.env.REDIS_URL),
      concurrency: 2,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ event: 'AVAILABILITY_WORKER_FAILED', jobId: job?.id, name: job?.name, err: err.message });
  });

  logger.info({ event: 'AVAILABILITY_WORKER_STARTED' });
  return worker;
}

/**
 * Register the repeat job that polls for expired instant requests every minute.
 * Idempotent — BullMQ deduplicates by repeat key.
 */
async function registerInstantExpireRepeat() {
  const queue = getQueue();
  await queue.add(
    JOB_NAMES.EXPIRE_INSTANT_REQUESTS,
    {},
    {
      repeat: { every: EXPIRE_REPEAT_EVERY_MS },
      jobId: 'repeat:expire-instant-requests',
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
  logger.info({ event: 'EXPIRE_REPEAT_REGISTERED', everyMs: EXPIRE_REPEAT_EVERY_MS });
}

module.exports = {
  startAvailabilityWorker,
  registerInstantExpireRepeat,
  handleAutoClearAvailability,
  handleExpireInstantRequests,
};
