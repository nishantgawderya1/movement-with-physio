'use strict';

const { Queue, Worker } = require('bullmq');
const logger = require('../utils/logger');

const QUEUE_NAME = 'mwp-jobs';
let queue = null;

/**
 * Create and return the BullMQ queue.
 * @param {import('ioredis').Redis} redis
 * @returns {import('bullmq').Queue}
 */
function createQueue(redis) {
  queue = new Queue(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  queue.on('error', (err) => {
    logger.error({ event: 'QUEUE_ERROR', err: err.message });
  });

  logger.info({ event: 'QUEUE_READY', name: QUEUE_NAME });
  return queue;
}

/**
 * Get the initialized queue instance.
 * @returns {import('bullmq').Queue}
 */
function getQueue() {
  if (!queue) throw new Error('Job queue not initialized. Call createQueue(redis) first.');
  return queue;
}

/**
 * Add a job to the queue.
 * @param {string} jobName - e.g. 'send_notification'
 * @param {object} data
 * @param {object} [opts]
 */
async function addJob(jobName, data, opts = {}) {
  const q = getQueue();
  const job = await q.add(jobName, data, opts);
  logger.debug({ event: 'JOB_ADDED', jobName, jobId: job.id });
  return job;
}

module.exports = { createQueue, getQueue, addJob, QUEUE_NAME };
