'use strict';

const { Worker } = require('bullmq');
const logger = require('../../utils/logger');
const { JOB_NAMES } = require('../../utils/constants');
const { QUEUE_NAME, getBullMQConnection } = require('../jobQueue');

const { notificationHandler } = require('./notificationWorker');
const { auditHandler } = require('./auditWorker');
const { pdfHandler } = require('./assessmentPdfWorker');
const {
  handleAutoClearAvailability,
  handleExpireInstantRequests,
} = require('./availabilityWorker');

/**
 * Single BullMQ Worker on the shared `mwp-jobs` queue, dispatching by
 * `job.name`. Replaces the four per-handler Workers that previously raced
 * for every job on the queue and silently dropped any job their early-return
 * pattern didn't match (BullMQ delivers each job to exactly one worker; the
 * loser would `return;`, BullMQ marked the job complete, removeOnComplete
 * deleted it, the intended handler never saw it).
 *
 * Job-name → handler routing table. Throw on unknown name so the failure
 * is visible (vs. the previous silent drop). Recognized today:
 *   send_notification             → notificationHandler
 *   write_audit                   → auditHandler
 *   generate_assessment_pdf       → pdfHandler
 *   auto_clear_availability       → handleAutoClearAvailability
 *   expire_instant_requests       → handleExpireInstantRequests
 */
const HANDLERS = {
  send_notification: notificationHandler,
  write_audit: auditHandler,
  [JOB_NAMES.GENERATE_ASSESSMENT_PDF]: pdfHandler,
  [JOB_NAMES.AUTO_CLEAR_AVAILABILITY]: handleAutoClearAvailability,
  [JOB_NAMES.EXPIRE_INSTANT_REQUESTS]: handleExpireInstantRequests,
};

function startUnifiedWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = HANDLERS[job.name];
      if (!handler) {
        // Surface unknown job names instead of silently dropping. BullMQ
        // will mark the job failed (and retry per defaultJobOptions);
        // dead-lettering after retries is preferable to the previous
        // silent loss.
        throw new Error(`UNKNOWN_JOB_NAME: ${job.name}`);
      }
      return handler(job);
    },
    {
      connection: getBullMQConnection(process.env.REDIS_URL),
      // Single concurrency for ALL job types combined. Conservative
      // mid-range across the old per-worker values (audit:10, notif:5,
      // pdf:3, availability:2). PDF generation is the heaviest; if
      // throughput becomes an issue, bump here or split queues.
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'UNIFIED_WORKER_JOB_FAILED',
      jobId: job?.id,
      jobName: job?.name,
      err: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error({ event: 'UNIFIED_WORKER_ERROR', err: err.message });
  });

  logger.info({ event: 'UNIFIED_WORKER_STARTED', handlers: Object.keys(HANDLERS) });
  return worker;
}

module.exports = { startUnifiedWorker };
