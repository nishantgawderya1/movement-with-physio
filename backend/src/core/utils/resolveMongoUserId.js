'use strict';

const User = require('../../models/User.model');
const ApiError = require('./ApiError');

/**
 * Bridge between Clerk session identity and our Mongo User collection.
 *
 * Clerk's verifyToken middleware populates `req.user.id` with the Clerk
 * session ID (a string like "user_2abc..."). The authMiddleware in
 * core/middleware/authMiddleware.js then resolves that to our Mongo
 * User document and caches the result on `req.user.mongoId` for the
 * remainder of the request. These helpers read that cache, falling back
 * to a fresh `User.findOne({ clerkId })` if the cache is missing (e.g.
 * routes that bypass the standard middleware chain).
 *
 * Lifted from chat.controller.js (7 use sites, most battle-tested),
 * with assessment.controller.js's role-hydrating variant wrapped as
 * `resolveActor`.
 */

/**
 * Resolve the Mongo `User._id` for the current request as a string.
 *
 * @param {import('express').Request} req
 * @returns {Promise<string>} stringified Mongo ObjectId
 * @throws {ApiError} 404 if the Clerk user has no matching Mongo User
 */
async function resolveMongoUserId(req) {
  if (req.user && req.user.mongoId) return req.user.mongoId;
  const user = await User.findOne({ clerkId: req.user.id }).select('_id').lean();
  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }
  req.user.mongoId = String(user._id);
  return req.user.mongoId;
}

/**
 * Resolve both the Mongo `User._id` and `role` for the current request.
 *
 * Use this when the handler needs role-aware logic (e.g. authorization
 * checks that branch on `role === 'patient'` vs `role === 'therapist'`).
 * For the common case where only the ID is needed, prefer
 * `resolveMongoUserId`.
 *
 * @param {import('express').Request} req
 * @returns {Promise<{ mongoId: string, role: string }>}
 * @throws {ApiError} 404 if the Clerk user has no matching Mongo User
 */
async function resolveActor(req) {
  if (req.user && req.user.mongoId && req.user.role) {
    return { mongoId: req.user.mongoId, role: req.user.role };
  }
  const user = await User.findOne({ clerkId: req.user.id }).select('_id role').lean();
  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }
  req.user.mongoId = String(user._id);
  req.user.role = req.user.role || user.role;
  return { mongoId: req.user.mongoId, role: req.user.role };
}

module.exports = { resolveMongoUserId, resolveActor };
