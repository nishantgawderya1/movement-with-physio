'use strict';

const { Worker } = require('bullmq');
const { QUEUE_NAME } = require('../jobQueue');
const AuditLog = require('../../../models/AuditLog.model');
const logger = require('../../utils/logger');

/**
 * Audit worker — writes audit log entries asynchronously.
 * @param {import('ioredis').Redis} redis
 */
function startAuditWorker(redis) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name !== 'write_audit') return;

      try {
        await AuditLog.create(job.data);
      } catch (err) {
        logger.error({ event: 'AUDIT_WORKER_FAILED', err: err.message });
        throw err; // trigger retry
      }
    },
    { connection: {
        host: new URL(process.env.REDIS_URL || 'redis://redis:6379').hostname,
        port: Number(new URL(process.env.REDIS_URL || 'redis://redis:6379').port) || 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      }, concurrency: 10 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ event: 'AUDIT_JOB_FAILED', jobId: job?.id, err: err.message });
  });

  logger.info({ event: 'AUDIT_WORKER_STARTED' });
  return worker;
}

module.exports = { startAuditWorker };
