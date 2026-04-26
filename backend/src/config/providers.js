'use strict';

/**
 * Provider selection from environment variables.
 * Centralises all "which adapter to load" logic.
 */
module.exports = {
  auth: process.env.AUTH_PROVIDER || 'clerk',
  storage: process.env.STORAGE_PROVIDER || 's3',
  sms: process.env.SMS_PROVIDER || 'msg91',
  notification: process.env.NOTIFICATION_PROVIDER || 'fcm',
  video: process.env.VIDEO_PROVIDER || 'webrtc',
  messaging: process.env.MESSAGING_PROVIDER || 'socketio',
  email: process.env.EMAIL_PROVIDER || 'resend',
};
