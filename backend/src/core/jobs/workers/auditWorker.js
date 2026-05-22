'use strict';

const AuditLog = require('../../../models/AuditLog.model');
const logger = require('../../utils/logger');

/**
 * Audit handler — writes audit log entries asynchronously.
 *
 * Now invoked by the unified worker (see unifiedWorker.js) — no longer
 * constructs its own BullMQ Worker.
 */
async function auditHandler(job) {
  try {
    await AuditLog.create(job.data);
  } catch (err) {
    logger.error({ event: 'AUDIT_WORKER_FAILED', err: err.message });
    throw err; // trigger retry via the unified worker's on('failed')
  }
}

module.exports = { auditHandler };
