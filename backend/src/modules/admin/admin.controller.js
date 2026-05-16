'use strict';

const adminService = require('./admin.service');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const featureFlags = require('../../config/featureFlags');

/**
 * GET /api/v1/admin/users
 * List all users with cursor pagination.
 */
const listUsers = asyncHandler(async (req, res) => {
  const { cursor, limit, role } = req.query;
  const result = await adminService.listUsers({ cursor, limit: Number(limit), role });
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * GET /api/v1/admin/audit-logs
 * List audit log entries with cursor pagination.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { cursor, limit, userId, action, resource, from, to } = req.query;
  const result = await adminService.listAuditLogs({
    cursor,
    limit: Number(limit),
    userId,
    action,
    resource,
    from,
    to,
  });
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * GET /api/v1/admin/therapists/pending
 * List unverified therapists awaiting admin approval.
 */
const getPendingTherapists = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await adminService.getPendingTherapists({ cursor, limit: Number(limit) });
  return apiResponse.paginated(res, result.data, result.pagination);
});

/**
 * GET /api/v1/admin/stats
 * Platform-wide statistics.
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  return apiResponse.success(res, stats);
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

module.exports = { listUsers, listAuditLogs, getPendingTherapists, getStats, getFlags, setFlag };
