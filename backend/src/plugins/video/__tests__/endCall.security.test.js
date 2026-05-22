'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const VideoCall = require('../../../models/VideoCall.model');
const User = require('../../../models/User.model');
const { VIDEO_CALL_STATUS, ROLES } = require('../../../core/utils/constants');

// Capture call_ended emits to verify the success path actually broadcasts
// and the 403 path does NOT.
const emitted = [];
const mockMessaging = {
  emitToRoom: (room, event, payload) => emitted.push({ room, event, payload }),
};

const videoServiceFactory = require('../video.service');
const videoService = videoServiceFactory({
  messaging: mockMessaging,
  notification: { sendPush: jest.fn() },
  video: { getTurnCredentials: jest.fn() },
});

const { createController } = require('../video.controller');
const controller = createController({
  messaging: mockMessaging,
  notification: { sendPush: jest.fn() },
  video: { getTurnCredentials: jest.fn() },
});

// loadCallForParticipant reads req.user.mongoId via resolveMongoUserId,
// so we populate it directly to bypass Clerk. Mirrors the helper in
// loadCallForParticipant.security.test.js.
function makeReq(callId, mongoId) {
  return {
    params: { callId: String(callId) },
    user: { id: 'clerk_test', mongoId: String(mongoId) },
  };
}

// Capture controller responses + errors via mock res / next. The
// res mock supports both .send(body) and .status(n).json(body) since
// responseHelper.success uses .status().json() while some other
// handlers in the codebase use .send() directly.
function runController(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      _status: 200,
      status(code) { this._status = code; return this; },
      json(body) { resolve({ status: this._status, body }); return this; },
      send(body) { resolve({ status: this._status, body }); return this; },
    };
    Promise.resolve(handler(req, res, (err) => reject(err))).catch(reject);
  });
}

describe('video endCall — participant gating (REST + service backstop)', () => {
  let alice, bob, charlie, call;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    emitted.length = 0;
    alice = await User.create({
      clerkId: 'clerk_alice', email: 'alice@example.com', name: 'Alice', role: ROLES.THERAPIST,
    });
    bob = await User.create({
      clerkId: 'clerk_bob', email: 'bob@example.com', name: 'Bob', role: ROLES.PATIENT,
    });
    charlie = await User.create({
      clerkId: 'clerk_charlie', email: 'charlie@example.com', name: 'Charlie', role: ROLES.PATIENT,
    });
    call = await VideoCall.create({
      participants: [alice._id, bob._id],
      initiatedBy: alice._id,
      status: VIDEO_CALL_STATUS.ONGOING,
      startedAt: new Date(Date.now() - 60 * 1000),
    });
  });

  // ── Service-level (defense-in-depth) ─────────────────────────────────

  test('service: participant ends call, marked ended, call_ended broadcast', async () => {
    const ended = await videoService.endCall(call._id, String(alice._id));
    expect(ended.status).toBe(VIDEO_CALL_STATUS.ENDED);
    expect(ended.endedAt).toBeInstanceOf(Date);
    expect(emitted).toEqual([
      { room: `call:${call._id}`, event: 'call_ended', payload: { callId: call._id, endedBy: String(alice._id) } },
    ]);
  });

  test('service: non-participant throws 403 NOT_PARTICIPANT, call NOT ended', async () => {
    await expect(videoService.endCall(call._id, String(charlie._id)))
      .rejects.toMatchObject({ statusCode: 403, code: 'NOT_PARTICIPANT' });

    const reloaded = await VideoCall.findById(call._id);
    expect(reloaded.status).toBe(VIDEO_CALL_STATUS.ONGOING);
    expect(reloaded.endedAt).toBeUndefined();
    expect(emitted).toEqual([]);
  });

  test('service: no-user-passed (internal caller contract) still ends call', async () => {
    const ended = await videoService.endCall(call._id);
    expect(ended.status).toBe(VIDEO_CALL_STATUS.ENDED);
    // joinState not mutated when no user provided
    expect(emitted).toEqual([
      { room: `call:${call._id}`, event: 'call_ended', payload: { callId: call._id, endedBy: null } },
    ]);
  });

  test('service: already-ended call short-circuits idempotently (no spurious 403)', async () => {
    await videoService.endCall(call._id, String(alice._id));
    emitted.length = 0;
    // A non-participant should NOT get 403 on an already-ended call —
    // the early-return-if-ended runs before the participant check, so
    // the call is a no-op (matches existing idempotency semantics).
    const r = await videoService.endCall(call._id, String(charlie._id));
    expect(r.status).toBe(VIDEO_CALL_STATUS.ENDED);
    expect(emitted).toEqual([]); // no second broadcast
  });

  // ── Controller-level (gate is wired into handler) ────────────────────

  test('controller: participant request → 200, service invoked', async () => {
    const { status, body } = await runController(controller.endCall, makeReq(call._id, alice._id));
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { message: 'Call ended' } });
    const reloaded = await VideoCall.findById(call._id);
    expect(reloaded.status).toBe(VIDEO_CALL_STATUS.ENDED);
  });

  test('controller: non-participant request → 403 propagates via asyncHandler', async () => {
    await expect(runController(controller.endCall, makeReq(call._id, charlie._id)))
      .rejects.toMatchObject({ statusCode: 403 });
    const reloaded = await VideoCall.findById(call._id);
    expect(reloaded.status).toBe(VIDEO_CALL_STATUS.ONGOING);
  });

  test('controller: missing callId → 404 propagates via asyncHandler', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(runController(controller.endCall, makeReq(fakeId, alice._id)))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
