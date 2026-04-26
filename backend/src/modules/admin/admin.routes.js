'use strict';

const { Router } = require('express');
const controller = require('./admin.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const rbac = require('../../core/middleware/rbac');
const { defaultLimiter } = require('../../core/middleware/rateLimiter');

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware, rbac('admin'), defaultLimiter);

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin only)
 *     security:
 *       - BearerAuth: []
 */
router.get('/users', controller.listUsers);

/**
 * @openapi
 * /api/v1/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit logs (admin only)
 *     security:
 *       - BearerAuth: []
 */
router.get('/audit-logs', controller.listAuditLogs);

/**
 * @openapi
 * /api/v1/admin/flags:
 *   get:
 *     tags: [Admin]
 *     summary: Get all feature flags (admin only)
 *     security:
 *       - BearerAuth: []
 */
router.get('/flags', controller.getFlags);

/**
 * @openapi
 * /api/v1/admin/flags:
 *   post:
 *     tags: [Admin]
 *     summary: Set a feature flag (admin only)
 *     security:
 *       - BearerAuth: []
 */
router.post('/flags', controller.setFlag);

module.exports = router;
