'use strict';

const { Webhook } = require('svix');
const authService = require('./auth.service');
const { container } = require('../../container');
const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');
const User = require('../../models/User.model');
const logger = require('../../core/utils/logger');

/**
 * POST /api/v1/auth/send-otp
 * Send OTP to phone number.
 */
const sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  await authService.sendOTP(phone, container.sms);
  return apiResponse.success(res, { message: 'OTP sent successfully' });
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP + create/retrieve user.
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, code, clerkId } = req.body;

  await authService.verifyOTP(phone, code);

  const clerkUser = await container.auth.getUser(clerkId).catch(() => null);
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

  const { user, isNew } = await authService.getOrCreateUser(phone, clerkId, email);

  return apiResponse.success(res, {
    user: {
      id: user._id,
      clerkId: user.clerkId,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
    },
    isNew,
  });
});

/**
 * POST /api/v1/auth/me/init
 * Provision (or fetch) the Mongo User doc for the signed-in Clerk identity.
 * Each app calls this once after Clerk sign-in, passing its role.
 * Idempotent.
 */
const initMe = asyncHandler(async (req, res) => {
  const { role, name, onboardingCompleted } = req.body;
  try {
    const { user, isNew } = await authService.initUser({
      clerkId: req.user.id,
      role,
      name,
      onboardingCompleted,
      authProvider: container.auth,
    });
    return apiResponse.success(res, {
      user: {
        _id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
      isNew,
    });
  } catch (err) {
    return apiResponse.error(res, err.message, err.statusCode || 500, req.correlationId);
  }
});

/**
 * POST /api/v1/auth/email-status
 * Public pre-flight check used by both apps before kicking off the Clerk OTP
 * flow. Reports whether the given email is already registered AND whether the
 * registered role conflicts with what the calling app expects.
 *
 * Returns { ok: true } when the email is either unregistered or registered
 * with the expected role. Returns { ok: false, conflictRole } when the email
 * exists under a different role — apps use this to block the OTP send before
 * the user ever enters a Clerk session.
 */
const emailStatus = asyncHandler(async (req, res) => {
  const { email, expectedRole } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() })
    .select('role')
    .lean();
  if (!existing) {
    return apiResponse.success(res, { ok: true, registered: false });
  }
  const ok = existing.role === expectedRole;
  return apiResponse.success(res, {
    ok,
    registered: true,
    conflictRole: ok ? null : existing.role,
  });
});

/**
 * GET /api/v1/auth/profile
 * Return the authenticated user's profile.
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ clerkId: req.user.id }).select('-__v').lean();
  if (!user) {
    return apiResponse.error(res, 'User not found', 404, req.correlationId);
  }
  return apiResponse.success(res, user);
});

/**
 * DELETE /api/v1/auth/profile
 * Soft delete account + send confirmation email.
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findOne({ clerkId: req.user.id });
  if (!user) return apiResponse.error(res, 'User not found', 404, req.correlationId);

  await user.softDelete();
  logger.info({ event: 'ACCOUNT_DELETED', userId: user._id });

  // Fire-and-forget email
  container.email
    .sendTransactional(user.email, {
      subject: 'Your MWP account has been deleted',
      templateId: 'account_deleted',
      variables: { name: user.name || 'User' },
    })
    .catch((err) => logger.error({ event: 'DELETE_EMAIL_FAILED', err: err.message }));

  return apiResponse.success(res, { message: 'Account deleted successfully' });
});

/**
 * POST /api/v1/auth/webhook/clerk
 * Handle Clerk webhook events (user.created, user.deleted, etc.)
 */
const clerkWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return apiResponse.error(res, 'Missing Svix headers', 400, req.correlationId);
  }

  let event;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(JSON.stringify(req.body), {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    logger.warn({ event: 'WEBHOOK_VERIFY_FAILED', err: err.message });
    return apiResponse.error(res, 'Invalid webhook signature', 401, req.correlationId);
  }

  const { type, data } = event;
  logger.info({ event: 'CLERK_WEBHOOK', type });

  if (type === 'user.created') {
    // Safety net for signups that bypass the apps (e.g. Clerk dashboard).
    // Default role is 'patient' — the user can still re-init from the
    // therapist app, which will trigger a 409 only if they truly mismatch.
    const email = data.email_addresses?.[0]?.email_address;
    if (email) {
      await User.updateOne(
        { clerkId: data.id },
        {
          $setOnInsert: {
            clerkId: data.id,
            email: email.toLowerCase(),
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
            role: 'patient',
          },
        },
        { upsert: true }
      );
      logger.info({ event: 'CLERK_USER_CREATED', clerkId: data.id });
    }
  }

  if (type === 'user.deleted') {
    await User.softDelete({ clerkId: data.id });
    logger.info({ event: 'CLERK_USER_DELETED', clerkId: data.id });
  }

  if (type === 'user.updated') {
    const email = data.email_addresses?.[0]?.email_address;
    if (email) {
      await User.updateOne({ clerkId: data.id }, { email, name: `${data.first_name || ''} ${data.last_name || ''}`.trim() });
    }
  }

  return apiResponse.success(res, { received: true });
});

module.exports = { sendOTP, verifyOTP, initMe, emailStatus, getProfile, deleteAccount, clerkWebhook };
