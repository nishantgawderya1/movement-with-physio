'use strict';

const mongoose = require('mongoose');
const apiResponse = require('../utils/apiResponse');

/**
 * Resource ownership middleware.
 *
 * Usage: ownership('patient') — checks that the resource's patientId matches req.user.id
 *        ownership('therapist') — checks therapistId
 *
 * The resource is expected to be loaded into req.resource by a preceding middleware
 * or fetched in the controller. This middleware is applied to protect routes where
 * the user can only act on their own resources.
 *
 * Skip ownership check for admins.
 *
 * @param {string} ownerField - 'patient' | 'therapist'
 * @returns {Function} Express middleware
 */
function ownership(ownerField) {
  return async (req, res, next) => {
    // Admins bypass ownership
    if (req.user?.role === 'admin') return next();

    const resource = req.resource;
    if (!resource) return next(); // controller will handle 404

    const ownerId = resource[`${ownerField}Id`] || resource[ownerField];

    if (!ownerId) return next(); // field not applicable

    if (String(ownerId) !== String(req.user.id)) {
      return apiResponse.error(res, 'Forbidden: you do not own this resource', 403, req.correlationId);
    }

    next();
  };
}

module.exports = ownership;
