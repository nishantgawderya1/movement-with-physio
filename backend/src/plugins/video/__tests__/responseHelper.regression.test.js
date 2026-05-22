'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const User = require('../../../models/User.model');
const { VIDEO_CALL_STATUS, ROLES } = require('../../../core/utils/constants');

// createCall enqueues push notifications per non-initiator participant.
// Mock so the test doesn't depend on the jobs subsystem.
const mockAddJob = jest.fn().mockResolvedValue({ id: 'mock' });
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: (...args) => mockAddJob(...args),
}));

// container.video.getTurnCredentials is the only provider call exercised
// by this suite; return a deterministic credentials object.
const fakeTurnCredentials = {
  iceServers: [{ urls: 'stun:stun.example.com:3478' }],
  ttlSeconds: 3600,
};
const mockMessaging = { emitToRoom: jest.fn() };
const container = {
  messaging: mockMessaging,
  notification: { sendPush: jest.fn() },
  video: { getTurnCredentials: jest.fn().mockResolvedValue(fakeTurnCredentials) },
};

const { createController } = require('../video.controller');
const controller = createController(container);

// Mock res supports both .send(body) and .status(n).json(body); the post-
// fix handlers all go through apiResponse.success which uses .status().json(),
// but we keep .send for forward-compat with anything else in the plugin.
// Mirrors the harness in endCall.security.test.js.
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

describe('video controller — responseHelper signature regression (S-followup-3)', () => {
  let alice, bob;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    mockMessaging.emitToRoom.mockClear();
    container.video.getTurnCredentials.mockClear();
    alice = await User.create({
      clerkId: 'clerk_alice', email: 'alice@example.com', name: 'Alice', role: ROLES.THERAPIST,
    });
    bob = await User.create({
      clerkId: 'clerk_bob', email: 'bob@example.com', name: 'Bob', role: ROLES.PATIENT,
    });
  });

  // Pre-fix bug shape: responseHelper.success(call) → call.status(200) →
  // TypeError because call.status is the enum STRING, not callable. The
  // assertions below verify both (a) the correct envelope shape lands and
  // (b) the correct HTTP status code is set — locking in the responseHelper
  // signature contract.

  test('createCall: returns 201 with { success: true, data: <call> } envelope', async () => {
    const req = {
      user: { id: String(alice._id) },
      body: { participantIds: [String(bob._id)] },
    };
    const { status, body } = await runController(controller.createCall, req);
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(String(body.data.initiatedBy)).toBe(String(alice._id));
    expect(body.data.participants.map(String).sort())
      .toEqual([String(alice._id), String(bob._id)].sort());
    expect(body.data.status).toBe(VIDEO_CALL_STATUS.INITIATED);
    // Sanity: the job was enqueued for the non-initiator participant.
    expect(mockAddJob).toHaveBeenCalledTimes(1);
  });

  test('getTurnCredentials: returns 200 with { success: true, data: <credentials> } envelope', async () => {
    const req = { user: { id: String(alice._id) } };
    const { status, body } = await runController(controller.getTurnCredentials, req);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(fakeTurnCredentials);
    expect(container.video.getTurnCredentials).toHaveBeenCalledTimes(1);
  });
});
