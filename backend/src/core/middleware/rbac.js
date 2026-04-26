'use strict';

const apiResponse = require('../utils/apiResponse');

/**
 * Role-Based Access Control middleware.
 *
 * Usage: router.get('/admin-route', auth, rbac('admin'), controller)
 * Multiple roles: rbac('admin', 'therapist')
 *
 * @param  {...string} roles - allowed roles
 * @returns {Function} Express middleware
 */
function rbac(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse.error(res, 'Unauthorized', 401, req.correlationId);
    }

    if (!roles.includes(req.user.role)) {
      return apiResponse.error(
        res,
        `Forbidden: requires role [${roles.join(' | ')}]`,
        403,
        req.correlationId
      );
    }

    next();
  };
}

module.exports = rbac;
