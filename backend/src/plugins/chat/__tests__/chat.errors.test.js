'use strict';

// S-followup-15 (chat module): assert .code on every typed throw.
// 4× CHAT_ROOM_NOT_FOUND (404) and 2× NOT_PARTICIPANT (403).

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const ChatRoom = require('../../../models/ChatRoom.model');
const User = require('../../../models/User.model');

jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

const chatService = require('../chat.service')({
  redis: { incr: jest.fn().mockResolvedValue(1) },
  messaging: { emitToRoom: jest.fn() },
  notification: null,
});

describe('chat.service — typed error codes (S-followup-15)', () => {
  let aliceId, bobId, strangerId, roomId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    const alice = await User.create({ email: 'alice@x.com', name: 'A' });
    const bob = await User.create({ email: 'bob@x.com', name: 'B' });
    const stranger = await User.create({ email: 'stranger@x.com', name: 'S' });
    aliceId = alice._id;
    bobId = bob._id;
    strangerId = stranger._id;
    const room = await ChatRoom.create({ participants: [aliceId, bobId], type: 'direct' });
    roomId = room._id;
  });

  describe('CHAT_ROOM_NOT_FOUND (404)', () => {
    const fakeId = new mongoose.Types.ObjectId();

    test('getRoom with unknown roomId throws typed 404', async () => {
      await expect(chatService.getRoom(fakeId, aliceId))
        .rejects.toMatchObject({ statusCode: 404, code: 'CHAT_ROOM_NOT_FOUND' });
    });

    test('deleteRoom with unknown roomId throws typed 404 (fused 404+403)', async () => {
      await expect(chatService.deleteRoom(fakeId, aliceId))
        .rejects.toMatchObject({ statusCode: 404, code: 'CHAT_ROOM_NOT_FOUND' });
    });

    test('deleteRoom by non-participant returns same typed code (oracle resistance)', async () => {
      // Same typed code as the not-found case — clients can't distinguish
      // "doesn't exist" from "not your room" from the .code value.
      await expect(chatService.deleteRoom(roomId, strangerId))
        .rejects.toMatchObject({ statusCode: 404, code: 'CHAT_ROOM_NOT_FOUND' });
    });

    test('sendMessage with unknown roomId throws typed 404', async () => {
      await expect(chatService.sendMessage(fakeId, aliceId, 'hi'))
        .rejects.toMatchObject({ statusCode: 404, code: 'CHAT_ROOM_NOT_FOUND' });
    });

    test('markRead with unknown roomId throws typed 404', async () => {
      await expect(chatService.markRead(fakeId, aliceId))
        .rejects.toMatchObject({ statusCode: 404, code: 'CHAT_ROOM_NOT_FOUND' });
    });
  });

  describe('NOT_PARTICIPANT (403)', () => {
    test('sendMessage by non-participant throws typed 403', async () => {
      await expect(chatService.sendMessage(roomId, strangerId, 'phish'))
        .rejects.toMatchObject({ statusCode: 403, code: 'NOT_PARTICIPANT' });
    });

    test('markRead by non-participant throws typed 403', async () => {
      await expect(chatService.markRead(roomId, strangerId))
        .rejects.toMatchObject({ statusCode: 403, code: 'NOT_PARTICIPANT' });
    });
  });
});
