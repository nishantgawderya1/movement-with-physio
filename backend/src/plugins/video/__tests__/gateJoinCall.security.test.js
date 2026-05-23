'use strict';

// Mock the Clerk SDK boundary so the production ClerkAdapter code path
// runs end-to-end during integration tests without standing up real Clerk.
// Token = clerkId convention: verifyToken returns { sub: <token> } and
// getUser returns a synthetic User with role/email populated.
//
// The existing 5 unit tests below DO NOT call into ClerkAdapter (they
// call gateJoinCall directly with raw ObjectIds), so the mock is inert
// for them.
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(async (token) => ({ sub: token })),
}));
jest.mock('@clerk/express', () => ({
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(async (id) => ({
        id,
        emailAddresses: [{ emailAddress: `${id}@test.local` }],
        publicMetadata: { role: 'patient' },
        privateMetadata: {},
      })),
    },
  })),
}));

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const VideoCall = require('../../../models/VideoCall.model');
const User = require('../../../models/User.model');
const { VIDEO_CALL_STATUS } = require('../../../core/utils/constants');
const { gateJoinCall } = require('../video.service');

describe('video gateJoinCall — participant ownership for socket join_call', () => {
  let alice, bob, charlie, call;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    alice = new mongoose.Types.ObjectId();
    bob = new mongoose.Types.ObjectId();
    charlie = new mongoose.Types.ObjectId();
    call = await VideoCall.create({
      participants: [alice, bob],
      initiatedBy: alice,
      status: VIDEO_CALL_STATUS.SCHEDULED,
    });
  });

  test('participant resolves with call doc', async () => {
    const { call: loaded } = await gateJoinCall(call._id, String(alice));
    expect(loaded).toBeTruthy();
    expect(loaded.participants.map((p) => String(p))).toEqual(
      expect.arrayContaining([String(alice), String(bob)])
    );
  });

  test('non-participant throws 403 NOT_PARTICIPANT', async () => {
    await expect(gateJoinCall(call._id, String(charlie)))
      .rejects.toMatchObject({ statusCode: 403, code: 'NOT_PARTICIPANT' });
  });

  test('non-existent callId throws 404 CALL_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(gateJoinCall(fakeId, String(alice)))
      .rejects.toMatchObject({ statusCode: 404, code: 'CALL_NOT_FOUND' });
  });

  test('invalid ObjectId throws 400 BAD_CALL_ID', async () => {
    await expect(gateJoinCall('not-an-objectid', String(alice)))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_CALL_ID' });
  });

  test('mongoId-as-ObjectId (not string) also works (defensive)', async () => {
    // Callers pass strings in production, but the comparison should not
    // depend on string-vs-ObjectId form.
    const { call: loaded } = await gateJoinCall(call._id, alice);
    expect(loaded).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Integration layer — exercises the actual socket.io transport,
// namespace handshake, auth middleware, and join_call event handler
// end-to-end. Closes the regression class that the helper-level unit
// tests above cannot catch: namespace-middleware misconfiguration,
// auth middleware removal, room-membership state bugs.
//
// Sibling describe — lifecycle hooks don't cascade between sibling
// describes (S-followup-6 lesson, see reference_git_quirks.md).
// ─────────────────────────────────────────────────────────────────────
describe('video gateJoinCall — socket.io integration (S-followup-1)', () => {
  const { startSocketServer } = require('../../../../tests/utils/socketTestHarness');
  const VideoPlugin = require('..');

  let harness;
  let call;
  let aliceUser, bobUser, charlieUser;

  beforeAll(async () => {
    await connect();
    harness = await startSocketServer({ plugins: [VideoPlugin] });
  }, 20_000);

  afterAll(async () => {
    await harness.teardown();
    await close();
  });

  beforeEach(async () => {
    await clearDb();
    harness.clearSocketCache();

    aliceUser = await User.create({ clerkId: 'clerk_alice', email: 'a@test.local', name: 'Alice', role: 'patient' });
    bobUser = await User.create({ clerkId: 'clerk_bob', email: 'b@test.local', name: 'Bob', role: 'therapist' });
    charlieUser = await User.create({ clerkId: 'clerk_charlie', email: 'c@test.local', name: 'Charlie', role: 'patient' });

    call = await VideoCall.create({
      participants: [aliceUser._id, bobUser._id],
      initiatedBy: aliceUser._id,
      status: VIDEO_CALL_STATUS.SCHEDULED,
    });
  });

  test('legit join: alice connects, joins her own call, bob receives user_joined', async () => {
    // Bob joins first so he's in the room to observe alice's join broadcast.
    const { client: bobClient } = await harness.connectAsUser({
      namespace: '/video', clerkId: 'clerk_bob', role: 'therapist',
    });
    const bobJoinAck = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('bob join timeout')), 5000);
      bobClient.on('error', (err) => { clearTimeout(t); reject(new Error(`bob got error: ${JSON.stringify(err)}`)); });
      // No success ack from the server for join — wait briefly for the join
      // to complete server-side. socket.join is synchronous after gateJoinCall
      // resolves, so a microtask + small buffer is enough.
      bobClient.emit('join_call', { callId: String(call._id) });
      setTimeout(() => { clearTimeout(t); resolve(); }, 200);
    });
    await bobJoinAck;

    const { client: aliceClient } = await harness.connectAsUser({
      namespace: '/video', clerkId: 'clerk_alice', role: 'patient',
    });
    const userJoinedEvent = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('user_joined never fired')), 5000);
      bobClient.on('user_joined', (payload) => { clearTimeout(t); resolve(payload); });
    });
    aliceClient.emit('join_call', { callId: String(call._id) });

    const payload = await userJoinedEvent;
    expect(String(payload.userId)).toBe(String(aliceUser._id));
  });

  test('cross-tenant attempt: charlie joins alice+bob call, receives error with NOT_PARTICIPANT', async () => {
    const { client: charlieClient } = await harness.connectAsUser({
      namespace: '/video', clerkId: 'clerk_charlie', role: 'patient',
    });

    const errorEvent = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('expected error event never fired')), 5000);
      charlieClient.on('error', (payload) => { clearTimeout(t); resolve(payload); });
    });
    charlieClient.emit('join_call', { callId: String(call._id) });

    const payload = await errorEvent;
    expect(payload.code).toBe('NOT_PARTICIPANT');
  });

  test('unauthenticated handshake: connecting without auth.token is rejected by middleware', async () => {
    const err = await harness.connectExpectingError({ namespace: '/video', auth: {} });
    expect(err).toBeDefined();
    expect(String(err.message || err)).toMatch(/auth|unauthorized|token/i);
  });
});
