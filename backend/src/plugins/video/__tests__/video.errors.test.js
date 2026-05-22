'use strict';

// S-followup-15 (video module): assert .code on every typed throw.
// Service-layer: CALL_NOT_FOUND (404) on getCall.
// Controller helper (loadCallForParticipant in videoCall.controller.js):
// BAD_CALL_ID (400), CALL_NOT_FOUND (404), NOT_PARTICIPANT (403) —
// pre-existing untyped throws bundled in here for module-internal
// consistency. NOTE: deviates slightly from the literal S-followup-15
// spec ("2 controller-direct 404s in videoCall.controller.js"); see
// commit message for rationale.

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const VideoCall = require('../../../models/VideoCall.model');
const User = require('../../../models/User.model');
const { VIDEO_CALL_STATUS } = require('../../../core/utils/constants');

const videoServiceFactory = require('../video.service');
const videoService = videoServiceFactory({ logger: console });

describe('video.service — CALL_NOT_FOUND on getCall (S-followup-15)', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  test('getCall with unknown callId throws typed 404 CALL_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(videoService.getCall(fakeId))
      .rejects.toMatchObject({ statusCode: 404, code: 'CALL_NOT_FOUND' });
  });
});

describe('videoCall.controller loadCallForParticipant — typed throws (S-followup-15)', () => {
  // The controller exports the helper indirectly — we import it via the
  // controller module's loadCallForParticipant (it's the un-exported
  // helper used by getCall + endCall + joinCall). We can exercise it
  // via the exported handlers by constructing minimal req/res mocks.
  const videoCallController = require('../videoCall.controller');

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  function makeRes() {
    const res = {};
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (p) => { res.body = p; return res; };
    return res;
  }

  test('joinCall with malformed callId throws typed 400 BAD_CALL_ID via helper', async () => {
    const req = {
      params: { callId: 'not-an-objectid' },
      user: { id: 'clerk_x' },
      correlationId: 'c1',
    };
    const res = makeRes();
    await expect(
      new Promise((resolve, reject) => {
        videoCallController.joinCall(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_CALL_ID' });
  });

  test('joinCall with unknown callId throws typed 404 CALL_NOT_FOUND via helper', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = {
      params: { callId: String(fakeId) },
      user: { id: 'clerk_x' },
      correlationId: 'c2',
    };
    const res = makeRes();
    await expect(
      new Promise((resolve, reject) => {
        videoCallController.joinCall(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    ).rejects.toMatchObject({ statusCode: 404, code: 'CALL_NOT_FOUND' });
  });

  test('joinCall by non-participant throws typed 403 NOT_PARTICIPANT via helper', async () => {
    const otherUser = await User.create({ clerkId: 'clerk_other', email: 'o@x.com' });
    const participantA = await User.create({ clerkId: 'clerk_a', email: 'a@x.com' });
    const participantB = await User.create({ clerkId: 'clerk_b', email: 'b@x.com' });
    const call = await VideoCall.create({
      participants: [participantA._id, participantB._id],
      initiatedBy: participantA._id,
      status: VIDEO_CALL_STATUS.SCHEDULED,
      scheduledAt: new Date(),
    });

    const req = {
      params: { callId: String(call._id) },
      user: { id: 'clerk_other' },
      correlationId: 'c3',
    };
    const res = makeRes();
    await expect(
      new Promise((resolve, reject) => {
        videoCallController.joinCall(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    ).rejects.toMatchObject({ statusCode: 403, code: 'NOT_PARTICIPANT' });
  });
});
