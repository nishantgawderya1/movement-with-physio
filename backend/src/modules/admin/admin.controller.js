'use strict';

const User = require('../../models/User.model');
const AuditLog = require('../../models/AuditLog.model');
const paginate = require('../../core/utils/paginator');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const { ROLES } = require('../../core/utils/constants');
const featureFlags = require('../../config/featureFlags');

/**
 * GET /api/v1/admin/users
 * List all users with cursor pagination.
 */
const listUsers = asyncHandler(async (req, res) => {
  const { cursor, limit, role } = req.query;
  const query = {};
  if (role) query.role = role;
  const result = await paginate(User, query, { cursor, limit: Number(limit) || 20 });
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * GET /api/v1/admin/audit-logs
 * List audit log entries with cursor pagination.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { cursor, limit, userId } = req.query;
  const query = {};
  if (userId) query.userId = userId;
  const result = await paginate(AuditLog, query, {
    cursor,
    limit: Number(limit) || 50,
    sort: { createdAt: -1 },
  });
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * GET /api/v1/admin/flags
 * Get all feature flags.
 */
const getFlags = asyncHandler(async (req, res) => {
  const flags = await featureFlags.getAll();
  return apiResponse.success(res, flags);
});

/**
 * POST /api/v1/admin/flags
 * Set a feature flag.
 */
const setFlag = asyncHandler(async (req, res) => {
  const { flag, value } = req.body;
  await featureFlags.setFlag(flag, Boolean(value));
  return apiResponse.success(res, { flag, value: Boolean(value) });
});

module.exports = { listUsers, listAuditLogs, getFlags, setFlag };
