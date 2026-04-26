'use strict';

const Notification = require('../../../models/Notification.model');
const User = require('../../../models/User.model');
const paginate = require('../../../core/utils/paginator');
const { CRITICAL_NOTIFICATION_TYPES } = require('../../../core/utils/constants');
const logger = require('../../../core/utils/logger');

/**
 * List notifications for a user with cursor pagination.
 */
async function listNotifications({ userId, cursor, limit }) {
  return paginate(Notification, { userId, isDeleted: false }, {
    cursor,
    limit,
    sort: { createdAt: -1 },
  });
}

/**
 * Get unread notification count.
 */
async function getUnreadCount(userId) {
  const count = await Notification.countDocuments({ userId, read: false, isDeleted: false });
  return count;
}

/**
 * Mark a single notification as read.
 */
async function markRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  return notification;
}

/**
 * Mark all notifications as read.
 */
async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { read: true, readAt: new Date() });
}

/**
 * Get notification preferences for a user.
 */
async function getPreferences(userId) {
  const user = await User.findById(userId).select('notificationPreferences').lean();
  return user?.notificationPreferences || {
    push: true,
    email: true,
    sms: false,
    types: Object.values(CRITICAL_NOTIFICATION_TYPES || {}),
  };
}

/**
 * Update notification preferences for a user.
 */
async function updatePreferences(userId, preferences) {
  const user = await User.findByIdAndUpdate(
    userId,
    { notificationPreferences: preferences },
    { new: true, runValidators: false }
  ).select('notificationPreferences');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user.notificationPreferences;
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
};
