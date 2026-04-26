'use strict';

const User = require('../../models/User.model');
const OTP = require('../../models/OTP.model');
const OnboardingDraft = require('../../models/OnboardingDraft.model');
const { getClient } = require('../../config/redis');
const { REDIS_TTL } = require('../../core/utils/constants');
const logger = require('../../core/utils/logger');

const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_SECONDS = 15 * 60; // 15 minutes lockout

/**
 * Generate a 6-digit OTP code.
 */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generate and send OTP via SMS.
 * @param {string} phone - normalized phone number
 * @param {object} smsProvider - SMSProvider adapter
 */
async function sendOTP(phone, smsProvider) {
  const redis = getClient(process.env.REDIS_URL);

  // Check if locked (brute force protection)
  const lockKey = `otp:lock:${phone}`;
  const locked = await redis.get(lockKey);
  if (locked) {
    const ttl = await redis.ttl(lockKey);
    const err = new Error(`Too many attempts. Try again in ${Math.ceil(ttl / 60)} minute(s).`);
    err.statusCode = 429;
    throw err;
  }

  // Generate and persist OTP
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  // Upsert: one active OTP per identifier
  await OTP.findOneAndUpdate(
    { identifier: phone },
    { code, expiresAt },
    { upsert: true, new: true }
  );

  // Send via SMS provider
  await smsProvider.sendSMS(phone, code);
  logger.info({ event: 'OTP_SENT', phone: phone.slice(-4).padStart(phone.length, '*') });
}

/**
 * Verify OTP and return the normalized phone.
 * @param {string} phone
 * @param {string} code
 * @returns {Promise<void>}
 */
async function verifyOTP(phone, code) {
  const redis = getClient(process.env.REDIS_URL);

  // Check lock
  const lockKey = `otp:lock:${phone}`;
  const locked = await redis.get(lockKey);
  if (locked) {
    const err = new Error('Account temporarily locked due to too many failed attempts');
    err.statusCode = 429;
    throw err;
  }

  const record = await OTP.findOne({ identifier: phone });

  if (!record || record.code !== code) {
    // Increment attempt counter in Redis
    const attemptsKey = `otp:attempts:${phone}`;
    const attempts = await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, REDIS_TTL.OTP_ATTEMPTS);

    if (attempts >= OTP_MAX_ATTEMPTS) {
      // Lock the identifier
      await redis.setex(lockKey, OTP_LOCK_SECONDS, '1');
      await redis.del(attemptsKey);
      const err = new Error('Too many failed attempts. Account locked for 15 minutes.');
      err.statusCode = 429;
      throw err;
    }

    const remaining = OTP_MAX_ATTEMPTS - attempts;
    const err = new Error(`Invalid or expired OTP. ${remaining} attempt(s) remaining.`);
    err.statusCode = 400;
    throw err;
  }

  // Check expiry
  if (new Date() > record.expiresAt) {
    const err = new Error('OTP has expired');
    err.statusCode = 400;
    throw err;
  }

  // Clear attempts and delete used OTP
  const attemptsKey = `otp:attempts:${phone}`;
  await redis.del(attemptsKey, lockKey);
  await OTP.deleteOne({ identifier: phone });

  logger.info({ event: 'OTP_VERIFIED', phone: phone.slice(-4).padStart(phone.length, '*') });
}

/**
 * Get or create a user record after OTP verification.
 * @param {string} phone
 * @param {string} clerkId
 * @returns {Promise<{ user: object, isNew: boolean }>}
 */
async function getOrCreateUser(phone, clerkId, email) {
  let user = await User.findOne({ $or: [{ clerkId }, { phone }] });
  let isNew = false;

  if (!user) {
    user = await User.create({
      clerkId,
      phone,
      email: email || `${clerkId}@clerk.placeholder`,
      role: 'patient',
    });
    isNew = true;
    logger.info({ event: 'USER_CREATED', userId: user._id });
  } else if (!user.clerkId) {
    user.clerkId = clerkId;
    await user.save();
  }

  return { user, isNew };
}

/**
 * Save/update onboarding draft for a user.
 */
async function saveOnboardingDraft(userId, step, data) {
  return OnboardingDraft.findOneAndUpdate(
    { userId },
    { step, data, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  );
}

module.exports = { sendOTP, verifyOTP, getOrCreateUser, saveOnboardingDraft };
