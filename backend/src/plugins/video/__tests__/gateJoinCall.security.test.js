'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const VideoCall = require('../../../models/VideoCall.model');
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
