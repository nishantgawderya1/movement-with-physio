'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const VideoCall = require('../../../models/VideoCall.model');
const User = require('../../../models/User.model');
const { VIDEO_CALL_STATUS, ROLES } = require('../../../core/utils/constants');
const { loadCallForParticipant } = require('../videoCall.controller');

// loadCallForParticipant uses resolveMongoUserId(req), which prefers
// req.user.mongoId when present. We populate it directly to avoid having
// to spin up Clerk during tests.
function makeReq(callId, mongoId) {
  return {
    params: { callId: String(callId) },
    user: { id: 'clerk_test', mongoId: String(mongoId) },
  };
}

describe('video loadCallForParticipant — REST gate', () => {
  let alice, bob, charlie, call;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
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
      status: VIDEO_CALL_STATUS.SCHEDULED,
    });
  });

  test('participant resolves with { call, userId }', async () => {
    const { call: loaded, userId } = await loadCallForParticipant(makeReq(call._id, alice._id));
    expect(loaded).toBeTruthy();
    expect(String(userId)).toBe(String(alice._id));
  });

  test('non-participant throws 403', async () => {
    await expect(loadCallForParticipant(makeReq(call._id, charlie._id)))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('non-existent callId throws 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(loadCallForParticipant(makeReq(fakeId, alice._id)))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('invalid ObjectId throws 400', async () => {
    await expect(loadCallForParticipant(makeReq('not-an-objectid', alice._id)))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
