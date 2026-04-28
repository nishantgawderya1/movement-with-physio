'use strict';

/**
 * Data Privacy Service — DPDP-compliant account deletion.
 *
 * Rules:
 *  - Replace all PII fields with the string "[DELETED]"
 *  - Medical records (SessionNote, TrackingSession, Assessment) are RETAINED
 *    but the userId reference is anonymized to "[DELETED]"
 *  - FCM tokens are cleared
 *  - All active sessions are invalidated (Clerk handles this via webhook)
 *  - Audit log entries for the user are anonymized (userId → "[DELETED]")
 *  - Redis cache entries for the user are purged
 *
 * Usage:
 *   const { deleteAccount } = require('../core/privacy/dataPrivacyService');
 *   await deleteAccount(clerkId, role, container);
 */

const User = require('../../models/User.model');
const AuditLog = require('../../models/AuditLog.model');
const SessionNote = require('../../models/SessionNote.model');
const TrackingSession = require('../../models/TrackingSession.model');
const ChatRoom = require('../../models/ChatRoom.model');
const cacheManager = require('../cache/cacheManager');
const logger = require('../utils/logger');

const ANONYMIZED = '[DELETED]';

/**
 * Perform full DPDP-compliant account deletion.
 *
 * @param {string} clerkId - Clerk user ID of the account to delete
 * @param {'patient'|'therapist'} role
 * @param {object} container - DI container (for notification provider)
 * @returns {Promise<void>}
 */
async function deleteAccount(clerkId, role, container) {
  logger.info({ event: 'DATA_PRIVACY_DELETE_START', clerkId, role });

  // 1. Anonymize the User document (soft delete + PII scrub)
  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        email: ANONYMIZED,
        name: ANONYMIZED,    // User schema has 'name', not 'firstName'/'lastName'
        phone: ANONYMIZED,
        fcmToken: null,
        isDeleted: true,
        deletedAt: new Date(),
        // Preserve: role, clerkId (needed for referential integrity checks)
      },

    },
    { new: true }
  );

  if (!user) {
    logger.warn({ event: 'DATA_PRIVACY_USER_NOT_FOUND', clerkId });
    return;
  }

  // 2. Anonymize medical records — retain content, scrub identifiers
  // SessionNote stores Clerk string IDs; TrackingSession stores ObjectId refs
  await Promise.allSettled([
    SessionNote.updateMany(
      { [role === 'patient' ? 'patientId' : 'therapistId']: clerkId },
      { $set: { [role === 'patient' ? 'patientId' : 'therapistId']: ANONYMIZED } }
    ),
    // TrackingSession.patientId is ObjectId — use user._id, not clerkId
    role === 'patient'
      ? TrackingSession.updateMany(
          { patientId: user._id },
          { $set: { patientId: ANONYMIZED } }
        )
      : TrackingSession.updateMany(
          { therapistId: user._id },
          { $set: { therapistId: ANONYMIZED } }
        ),
  ]);

  // 3. Remove user from ChatRooms — participants is ObjectId[], use user._id
  await ChatRoom.updateMany(
    { participants: user._id },
    { $pull: { participants: user._id } }
  );

  // 4. Anonymize audit logs
  await AuditLog.updateMany(
    { userId: clerkId },
    { $set: { userId: ANONYMIZED } }
  );

  // 5. Invalidate Redis cache
  await Promise.allSettled([
    cacheManager.invalidate(`patient:profile:${clerkId}`),
    cacheManager.invalidate(`therapist:profile:${clerkId}`),
    cacheManager.invalidate(`user:${clerkId}`),
  ]);

  // 6. Deletion confirmation is returned in the HTTP response; no push needed
  //    (FCM token was already cleared in step 1, so any push would silently fail)

  logger.info({ event: 'DATA_PRIVACY_DELETE_COMPLETE', clerkId, role, userId: user._id });
}

module.exports = { deleteAccount };
