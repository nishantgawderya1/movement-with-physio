'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const { ROLES } = require('../../../core/utils/constants');

// addJob is the audit-emission seam. Mock it before requiring the
// controller so we can assert how often (and with what payload) the
// diff-write semantics fire a write_audit job.
const mockAddJob = jest.fn().mockResolvedValue({ id: 'mock' });
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: (...args) => mockAddJob(...args),
}));

const { setFcmTokenSchema } = require('../users.validation');
const usersService = require('../users.service');
// Use the raw impl (not the asyncHandler wrapper) — wrapper swallows the
// returned promise so tests can't await completion.
const { setFcmTokenImpl: setFcmTokenController } = require('../users.controller');

// Minimal req/res harness — mirrors the pattern from
// src/plugins/video/__tests__/loadCallForParticipant.security.test.js.
// resolveMongoUserId prefers req.user.mongoId when present, which lets
// us avoid spinning up Clerk just to exercise the controller.
function makeReq(mongoId, body = {}, extras = {}) {
  return {
    user: { id: 'clerk_test', mongoId: String(mongoId), ...extras.user },
    body,
    correlationId: 'corr_test',
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

const VALID_TOKEN = 'a'.repeat(142); // 142 chars — typical FCM token length, all in [A-Za-z0-9_\-:]
const SECOND_VALID_TOKEN = 'b'.repeat(142);

describe('setFcmTokenSchema — Joi validation', () => {
  test('valid 142-char base64-like token → passes', () => {
    const { error } = setFcmTokenSchema.validate({ fcmToken: VALID_TOKEN });
    expect(error).toBeUndefined();
  });

  test('token with whitespace → fails (charset)', () => {
    // .trim() removes leading/trailing whitespace before pattern check, so
    // embed the whitespace in the middle to exercise the actual pattern.
    const { error } = setFcmTokenSchema.validate({ fcmToken: 'abc def' + 'a'.repeat(120) });
    expect(error).toBeDefined();
  });

  test('token containing illegal char `<` → fails (XSS-class injection guard)', () => {
    const { error } = setFcmTokenSchema.validate({ fcmToken: '<' + 'a'.repeat(141) });
    expect(error).toBeDefined();
  });

  test('8-char too-short token → fails (length lower bound)', () => {
    const { error } = setFcmTokenSchema.validate({ fcmToken: 'a'.repeat(8) });
    expect(error).toBeDefined();
  });

  test('1024-char too-long token → fails (length upper bound)', () => {
    const { error } = setFcmTokenSchema.validate({ fcmToken: 'a'.repeat(1024) });
    expect(error).toBeDefined();
  });

  test('fcmToken: null → passes (sign-out clear)', () => {
    const { error, value } = setFcmTokenSchema.validate({ fcmToken: null });
    expect(error).toBeUndefined();
    expect(value.fcmToken).toBeNull();
  });

  test('extra body field { fcmToken, role } → rejected at schema level (unknown: false)', () => {
    // At schema-only level (no middleware), unknown keys raise an error.
    // Under the shared validate middleware (stripUnknown: true), the extra
    // key would be silently stripped — see users.validation.js comment.
    // We assert the schema-level intent here; the service-write below also
    // confirms the actual privilege-escalation surface stays closed.
    const { error } = setFcmTokenSchema.validate({ fcmToken: VALID_TOKEN, role: 'admin' });
    expect(error).toBeDefined();
  });
});

describe('usersService.setFcmToken / getFcmToken — DB layer', () => {
  let user;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    user = await User.create({
      clerkId: 'clerk_alice',
      email: 'alice@example.com',
      name: 'Alice',
      role: ROLES.PATIENT,
    });
  });

  test('setFcmToken writes the field; getFcmToken reads it back', async () => {
    await usersService.setFcmToken(user._id, VALID_TOKEN);
    const reloaded = await User.findById(user._id).lean();
    expect(reloaded.fcmToken).toBe(VALID_TOKEN);
    const read = await usersService.getFcmToken(user._id);
    expect(read).toBe(VALID_TOKEN);
  });

  test('setFcmToken(null) clears the field (sign-out flow)', async () => {
    await usersService.setFcmToken(user._id, VALID_TOKEN);
    await usersService.setFcmToken(user._id, null);
    const reloaded = await User.findById(user._id).lean();
    expect(reloaded.fcmToken).toBeNull();
  });

  test('setFcmToken on non-existent user → 404 FCM_TOKEN_USER_NOT_FOUND', async () => {
    const missing = new mongoose.Types.ObjectId();
    await expect(usersService.setFcmToken(missing, VALID_TOKEN))
      .rejects.toMatchObject({ statusCode: 404, code: 'FCM_TOKEN_USER_NOT_FOUND' });
  });

  test('setFcmToken does NOT mutate fields outside fcmToken (field-injection guard)', async () => {
    const before = await User.findById(user._id).lean();
    await usersService.setFcmToken(user._id, VALID_TOKEN);
    const after = await User.findById(user._id).lean();
    expect(after.role).toBe(before.role);
    expect(after.email).toBe(before.email);
    expect(after.clerkId).toBe(before.clerkId);
    expect(after.isVerified).toBe(before.isVerified);
  });

  test('getFcmToken on non-existent user → null (no throw)', async () => {
    const missing = new mongoose.Types.ObjectId();
    await expect(usersService.getFcmToken(missing)).resolves.toBeNull();
  });
});

describe('usersController.setFcmToken — diff-write + audit + response shape', () => {
  let user;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    user = await User.create({
      clerkId: 'clerk_bob',
      email: 'bob@example.com',
      name: 'Bob',
      role: ROLES.PATIENT,
    });
  });

  test('first valid PATCH writes, returns { updated: true }, audit fires once, response omits token', async () => {
    const req = makeReq(user._id, { fcmToken: VALID_TOKEN });
    const res = makeRes();
    await setFcmTokenController(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { updated: true } });
    expect(res.body.data.fcmToken).toBeUndefined(); // never echoed

    const reloaded = await User.findById(user._id).lean();
    expect(reloaded.fcmToken).toBe(VALID_TOKEN);

    const auditCalls = mockAddJob.mock.calls.filter(([name]) => name === 'write_audit');
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0][1]).toMatchObject({
      action: 'SET_FCM_TOKEN',
      resource: 'user',
      resourceId: String(user._id),
      changes: { cleared: false },
    });
    // Audit payload MUST NOT carry the token itself
    expect(JSON.stringify(auditCalls[0][1])).not.toContain(VALID_TOKEN);
  });

  test('PATCH with fcmToken: null → write succeeds, response { updated: true }, audit cleared=true', async () => {
    await usersService.setFcmToken(user._id, VALID_TOKEN);
    mockAddJob.mockClear();

    const req = makeReq(user._id, { fcmToken: null });
    const res = makeRes();
    await setFcmTokenController(req, res);

    expect(res.body).toEqual({ success: true, data: { updated: true } });
    const reloaded = await User.findById(user._id).lean();
    expect(reloaded.fcmToken).toBeNull();

    const auditCalls = mockAddJob.mock.calls.filter(([name]) => name === 'write_audit');
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0][1].changes).toEqual({ cleared: true });
  });

  test('PATCH same value twice → second returns { updated: false }, audit fires only on first', async () => {
    const reqA = makeReq(user._id, { fcmToken: VALID_TOKEN });
    const resA = makeRes();
    await setFcmTokenController(reqA, resA);
    expect(resA.body.data.updated).toBe(true);

    const reqB = makeReq(user._id, { fcmToken: VALID_TOKEN });
    const resB = makeRes();
    await setFcmTokenController(reqB, resB);
    expect(resB.body).toEqual({ success: true, data: { updated: false } });

    const auditCalls = mockAddJob.mock.calls.filter(([name]) => name === 'write_audit');
    expect(auditCalls).toHaveLength(1); // first only — no audit on no-op
  });

  test('PATCH changing value → second write triggers second audit (rotation visibility)', async () => {
    const reqA = makeReq(user._id, { fcmToken: VALID_TOKEN });
    await setFcmTokenController(reqA, makeRes());

    const reqB = makeReq(user._id, { fcmToken: SECOND_VALID_TOKEN });
    const resB = makeRes();
    await setFcmTokenController(reqB, resB);

    expect(resB.body.data.updated).toBe(true);
    const reloaded = await User.findById(user._id).lean();
    expect(reloaded.fcmToken).toBe(SECOND_VALID_TOKEN);

    const auditCalls = mockAddJob.mock.calls.filter(([name]) => name === 'write_audit');
    expect(auditCalls).toHaveLength(2);
  });

  test('PATCH where User doc is soft-deleted between auth cache and write → 404 FCM_TOKEN_USER_NOT_FOUND', async () => {
    // Capture the mongoId before soft-delete (mirrors what authMiddleware
    // already cached on req.user.mongoId before the doc was anonymized).
    const mongoId = String(user._id);
    // softDelete plugin overrides find/findOne/findOneAndUpdate to filter
    // out isDeleted docs — emulating account-deletion-mid-request.
    await User.findByIdAndUpdate(user._id, { isDeleted: true, deletedAt: new Date() });

    const req = makeReq(mongoId, { fcmToken: VALID_TOKEN });
    const res = makeRes();
    await expect(setFcmTokenController(req, res))
      .rejects.toMatchObject({ statusCode: 404, code: 'FCM_TOKEN_USER_NOT_FOUND' });

    const auditCalls = mockAddJob.mock.calls.filter(([name]) => name === 'write_audit');
    expect(auditCalls).toHaveLength(0); // no audit on failed write
  });
});
