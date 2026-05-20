'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const VideoCall = require('../../../models/VideoCall.model');
const { VIDEO_CALL_STATUS } = require('../../../core/utils/constants');

// Mock jobQueue addJob — leaveCall's controller branch enqueues a PDF
// job when ending; we don't need BullMQ for these tests.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock' }),
}));

// Build a fake messaging provider — endCall calls this.messaging.emitToRoom.
const emitted = [];
const mockMessaging = {
  emitToRoom: (room, event, payload) => emitted.push({ room, event, payload }),
};

// videoService is a factory: require('./video.service')(container).
const videoServiceFactory = require('../video.service');
const videoService = videoServiceFactory({
  messaging: mockMessaging,
  notification: { sendPush: jest.fn() },
  video: { getTurnCredentials: jest.fn() },
});

describe('Video call lifecycle reconciliation', () => {
  let patientId, therapistId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    emitted.length = 0;
    patientId = new mongoose.Types.ObjectId();
    therapistId = new mongoose.Types.ObjectId();
  });

  async function makeOngoingCall() {
    const call = await VideoCall.create({
      participants: [patientId, therapistId],
      initiatedBy: patientId,
      status: VIDEO_CALL_STATUS.ONGOING,
      startedAt: new Date(Date.now() - 60 * 1000),
      scheduledAt: new Date(Date.now() - 5 * 60 * 1000),
      joinState: {
        [String(patientId)]: { joinedAt: new Date(Date.now() - 60 * 1000) },
        [String(therapistId)]: { joinedAt: new Date(Date.now() - 60 * 1000) },
      },
    });
    return call;
  }

  test('endCall records leaver in joinState and broadcasts call_ended', async () => {
    const call = await makeOngoingCall();
    const ended = await videoService.endCall(call._id, therapistId);
    expect(ended.status).toBe(VIDEO_CALL_STATUS.ENDED);
    expect(ended.endedAt).toBeInstanceOf(Date);
    expect(ended.durationSeconds).toBeGreaterThan(0);
    const therapistEntry = ended.joinState.get(String(therapistId));
    expect(therapistEntry.leftAt).toBeInstanceOf(Date);
    expect(therapistEntry.joinedAt).toBeInstanceOf(Date); // preserved
    // Broadcast happened once
    expect(emitted).toEqual([
      { room: `call:${call._id}`, event: 'call_ended', payload: { callId: call._id, endedBy: therapistId } },
    ]);
  });

  test('endCall is idempotent — second call short-circuits, no second broadcast', async () => {
    const call = await makeOngoingCall();
    await videoService.endCall(call._id, therapistId);
    emitted.length = 0;
    const ended2 = await videoService.endCall(call._id, patientId);
    expect(ended2.status).toBe(VIDEO_CALL_STATUS.ENDED);
    // No new broadcast on the second call
    expect(emitted).toEqual([]);
  });

  test('endCall on missing call returns null without throwing', async () => {
    const fake = new mongoose.Types.ObjectId();
    const r = await videoService.endCall(fake, therapistId);
    expect(r).toBeNull();
    expect(emitted).toEqual([]);
  });

  test('endCall without endedByUserId still ends the call (no joinState mutation)', async () => {
    const call = await makeOngoingCall();
    const before = call.joinState.get(String(patientId)).joinedAt;
    const ended = await videoService.endCall(call._id);
    expect(ended.status).toBe(VIDEO_CALL_STATUS.ENDED);
    // joinState entries unchanged
    expect(ended.joinState.get(String(patientId)).joinedAt.getTime()).toBe(before.getTime());
    expect(ended.joinState.get(String(patientId)).leftAt).toBeUndefined();
  });

  test('endCall preserves a prior joinedAt when recording leftAt', async () => {
    const call = await makeOngoingCall();
    const priorJoinedAt = call.joinState.get(String(therapistId)).joinedAt;
    const ended = await videoService.endCall(call._id, therapistId);
    expect(ended.joinState.get(String(therapistId)).joinedAt.getTime()).toBe(priorJoinedAt.getTime());
  });

  test('endCall computes durationSeconds from startedAt', async () => {
    const call = await VideoCall.create({
      participants: [patientId, therapistId],
      initiatedBy: patientId,
      status: VIDEO_CALL_STATUS.ONGOING,
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    const ended = await videoService.endCall(call._id, therapistId);
    expect(ended.durationSeconds).toBeGreaterThanOrEqual(299);
    expect(ended.durationSeconds).toBeLessThanOrEqual(301);
  });
});
