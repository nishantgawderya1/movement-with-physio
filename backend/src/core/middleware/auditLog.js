'use strict';

const AuditLog = require('../../models/AuditLog.model');
const logger = require('../utils/logger');

/**
 * Audit log middleware factory.
 *
 * Records every mutation (POST/PUT/PATCH/DELETE) to the AuditLog collection.
 * Runs asynchronously — does not block the response.
 *
 * Usage: auditLog('CREATE_BOOKING', 'booking')
 *
 * @param {string} action - e.g. 'CREATE_BOOKING', 'UPDATE_PROFILE'
 * @param {string} resource - e.g. 'booking', 'user'
 * @returns {Function} Express middleware
 */
function auditLog(action, resource) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Fire-and-forget audit write
      setImmediate(async () => {
        try {
          await AuditLog.create({
            action,
            resource,
            resourceId: body?.data?._id || body?.data?.id || null,
            userId: req.user?.id || null,
            changes: req.method !== 'GET' ? req.body : null,
            statusCode: res.statusCode,
            correlationId: req.correlationId,
          });
        } catch (err) {
          logger.error({ event: 'AUDIT_WRITE_FAILED', action, err: err.message });
        }
      });
      return originalJson(body);
    };
    next();
  };
}

module.exports = auditLog;
