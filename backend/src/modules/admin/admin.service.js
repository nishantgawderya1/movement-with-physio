'use strict';

const User = require('../../models/User.model');
const Booking = require('../../models/Booking.model');
const AuditLog = require('../../models/AuditLog.model');
const paginate = require('../../core/utils/paginator');
const logger = require('../../core/utils/logger');

/**
 * List all users with cursor pagination.
 */
async function listUsers({ cursor, limit, role } = {}) {
  const query = {};
  if (role) query.role = role;
  return paginate(User, query, { cursor, limit: limit || 20 });
}

/**
 * List audit log entries with cursor pagination and filters.
 */
async function listAuditLogs({ cursor, limit, userId, action, resource, from, to } = {}) {
  const query = {};
  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  return paginate(AuditLog, query, {
    cursor,
    limit: limit || 50,
    sort: { createdAt: -1 },
  });
}

/**
 * Get pending (unverified) therapists.
 */
async function getPendingTherapists({ cursor, limit } = {}) {
  return paginate(
    User,
    { role: 'therapist', isVerified: false, isDeleted: { $ne: true } },
    { cursor, limit: limit || 20, sort: { createdAt: -1 } }
  );
}

/**
 * Get platform-wide statistics.
 */
async function getStats() {
  const [totalPatients, totalTherapists, verifiedTherapists, totalBookings, completedBookings] =
    await Promise.all([
      User.countDocuments({ role: 'patient', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'therapist', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'therapist', isVerified: true, isDeleted: { $ne: true } }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
    ]);

  return {
    totalPatients,
    totalTherapists,
    verifiedTherapists,
    pendingTherapists: totalTherapists - verifiedTherapists,
    totalBookings,
    completedBookings,
    completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
  };
}

module.exports = { listUsers, listAuditLogs, getPendingTherapists, getStats };
