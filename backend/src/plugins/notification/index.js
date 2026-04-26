'use strict';

const { Router } = require('express');
const controller = require('./notification.controller');
const authMiddleware = require('../../../core/middleware/authMiddleware');
const rbac = require('../../../core/middleware/rbac');
const { defaultLimiter } = require('../../../core/middleware/rateLimiter');
const PluginBase = require('../../../core/plugins/PluginBase');

/**
 * NotificationPlugin — auto-registered by PluginManager.
 * Mounts at /api/v1/notifications
 */
class NotificationPlugin extends PluginBase {
  get name() { return 'notification'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const router = Router();
    const auth = [authMiddleware, rbac('patient', 'therapist', 'admin'), defaultLimiter];

    /**
     * @openapi
     * /api/v1/notifications:
     *   get:
     *     tags: [Notification]
     *     summary: List notifications for authenticated user
     */
    router.get('/', ...auth, controller.listNotifications);

    /**
     * @openapi
     * /api/v1/notifications/unread-count:
     *   get:
     *     tags: [Notification]
     *     summary: Get unread notification count
     */
    router.get('/unread-count', ...auth, controller.getUnreadCount);

    /**
     * @openapi
     * /api/v1/notifications/preferences:
     *   get:
     *     tags: [Notification]
     *     summary: Get notification preferences
     */
    router.get('/preferences', ...auth, controller.getPreferences);

    /**
     * @openapi
     * /api/v1/notifications/preferences:
     *   patch:
     *     tags: [Notification]
     *     summary: Update notification preferences
     */
    router.patch('/preferences', ...auth, controller.updatePreferences);

    /**
     * @openapi
     * /api/v1/notifications/mark-all-read:
     *   patch:
     *     tags: [Notification]
     *     summary: Mark all notifications as read
     */
    router.patch('/mark-all-read', ...auth, controller.markAllRead);

    /**
     * @openapi
     * /api/v1/notifications/{id}/read:
     *   patch:
     *     tags: [Notification]
     *     summary: Mark a single notification as read
     */
    router.patch('/:id/read', ...auth, controller.markRead);

    app.use('/api/v1/notifications', router);
  }
}

module.exports = NotificationPlugin;
