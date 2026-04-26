'use strict';

const { Worker } = require('bullmq');
const { QUEUE_NAME } = require('../jobQueue');
const { CRITICAL_NOTIFICATION_TYPES } = require('../../utils/constants');
const { container } = require('../../../container');
const User = require('../../../models/User.model');
const Notification = require('../../../models/Notification.model');
const logger = require('../../utils/logger');

/**
 * Notification worker.
 * Processes 'send_notification' jobs:
 *   1. Tries FCM push.
 *   2. If FCM fails for critical types → sends email fallback.
 *   3. Persists notification record in DB.
 *
 * @param {import('ioredis').Redis} redis
 */
function startNotificationWorker(redis) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name !== 'send_notification') return;

      const { userId, title, body, type, data } = job.data;

      const user = await User.findById(userId).select('fcmToken email').lean();
      if (!user) {
        logger.warn({ event: 'NOTIF_USER_NOT_FOUND', userId });
        return;
      }

      // 1. Try FCM push
      let pushSuccess = false;
      if (user.fcmToken) {
        try {
          await container.notification.sendPush(user.fcmToken, { title, body, data });
          pushSuccess = true;
          logger.info({ event: 'NOTIF_PUSH_SENT', userId, type });
        } catch (err) {
          logger.warn({ event: 'FCM_FAILED', userId, type, err: err.message });
        }
      }

      // 2. Email fallback for critical types
      if (!pushSuccess && CRITICAL_NOTIFICATION_TYPES.includes(type) && user.email) {
        try {
          await container.email.sendTransactional(user.email, {
            subject: title,
            templateId: type,
            variables: { title, body, ...data },
          });
          logger.info({ event: 'EMAIL_FALLBACK_SENT', userId, type });
        } catch (err) {
          logger.error({ event: 'EMAIL_FALLBACK_FAILED', userId, type, err: err.message });
        }
      }

      // 3. Persist notification record
      try {
        await Notification.create({ userId, title, body, type });
      } catch (err) {
        logger.error({ event: 'NOTIF_DB_WRITE_FAILED', userId, err: err.message });
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ event: 'NOTIF_JOB_FAILED', jobId: job?.id, err: err.message });
  });

  logger.info({ event: 'NOTIF_WORKER_STARTED' });
  return worker;
}

module.exports = { startNotificationWorker };
