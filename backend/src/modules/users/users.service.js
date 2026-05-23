'use strict';

const User = require('../../models/User.model');
const ApiError = require('../../core/utils/ApiError');

/**
 * Read the current fcmToken for a user.
 * Returns null if the user document is missing.
 *
 * @param {string} mongoId
 * @returns {Promise<string | null>}
 */
async function getFcmToken(mongoId) {
  const user = await User.findById(mongoId).select('fcmToken').lean();
  if (!user) return null;
  return user.fcmToken ?? null;
}

/**
 * Set (or clear, with token=null) the fcmToken for a user.
 * Throws if the user document is missing — caller already authenticated,
 * so this only fires on race with account deletion.
 *
 * @param {string} mongoId
 * @param {string | null} token
 */
async function setFcmToken(mongoId, token) {
  const updated = await User.findByIdAndUpdate(
    mongoId,
    { fcmToken: token },
    { new: false }
  );
  if (!updated) {
    throw new ApiError(404, 'User not found', { code: 'FCM_TOKEN_USER_NOT_FOUND' });
  }
}

module.exports = { getFcmToken, setFcmToken };
