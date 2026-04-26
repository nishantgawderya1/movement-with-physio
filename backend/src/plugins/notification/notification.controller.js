'use strict';

const notificationService = require('./notification.service');
const apiResponse = require('../../../core/utils/apiResponse');
const asyncHandler = require('../../../core/utils/asyncHandler');

const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { cursor, limit } = req.query;
  const result = await notificationService.listNotifications({ userId, cursor, limit: Number(limit) || 20 });
  return apiResponse.paginated(res, result.data, result.pagination);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const count = await notificationService.getUnreadCount(userId);
  return apiResponse.success(res, { unreadCount: count });
});

const markRead = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const notification = await notificationService.markRead(req.params.id, userId);
  return apiResponse.success(res, notification);
});

const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  await notificationService.markAllRead(userId);
  return apiResponse.success(res, { marked: true });
});

const getPreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const prefs = await notificationService.getPreferences(userId);
  return apiResponse.success(res, prefs);
});

const updatePreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const prefs = await notificationService.updatePreferences(userId, req.body);
  return apiResponse.success(res, prefs);
});

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead, getPreferences, updatePreferences };
