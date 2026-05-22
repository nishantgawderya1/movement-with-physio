'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const ChatRoom = require('../../../models/ChatRoom.model');
const Message = require('../../../models/Message.model');

// markRead doesn't touch redis / messaging / notification — empty container
// stubs are sufficient. Other ChatService methods would need real wiring.
const chatService = require('../chat.service')({
  redis: null,
  messaging: null,
  notification: null,
});

describe('chat markRead — participant ownership', () => {
  let aliceId, bobId, roomId, messageId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    aliceId = new mongoose.Types.ObjectId();
    bobId = new mongoose.Types.ObjectId();

    const room = await ChatRoom.create({
      participants: [aliceId],
      type: 'direct',
    });
    roomId = room._id;

    const msg = await Message.create({
      roomId,
      sender: aliceId,
      text: 'hello',
      sequenceNumber: 1,
    });
    messageId = msg._id;
  });

  test('participant call succeeds and pushes readBy', async () => {
    await chatService.markRead(roomId, aliceId);
    const m = await Message.findById(messageId);
    expect(m.readBy.some((r) => String(r.userId) === String(aliceId))).toBe(true);
  });

  test('non-participant call throws 403 and does not mutate readBy', async () => {
    await expect(chatService.markRead(roomId, bobId))
      .rejects.toMatchObject({ statusCode: 403 });
    const m = await Message.findById(messageId);
    expect(m.readBy).toHaveLength(0);
  });

  test('non-existent room throws 404', async () => {
    const fakeRoomId = new mongoose.Types.ObjectId();
    await expect(chatService.markRead(fakeRoomId, aliceId))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('rejected cross-room attempt does not pollute either room', async () => {
    // The actual exploit scenario: alice (not a participant) attempts to
    // mark bob's private room as read. Pre-fix this would push alice's
    // userId into every message in bob's room. Post-fix it must 403.
    const bobRoom = await ChatRoom.create({
      participants: [bobId],
      type: 'direct',
    });
    const bobMsg = await Message.create({
      roomId: bobRoom._id,
      sender: bobId,
      text: 'private',
      sequenceNumber: 1,
    });

    await expect(chatService.markRead(bobRoom._id, aliceId))
      .rejects.toMatchObject({ statusCode: 403 });

    const aliceMsg = await Message.findById(messageId);
    const bobMsgAfter = await Message.findById(bobMsg._id);
    expect(aliceMsg.readBy).toHaveLength(0);
    expect(bobMsgAfter.readBy).toHaveLength(0);
  });
});
