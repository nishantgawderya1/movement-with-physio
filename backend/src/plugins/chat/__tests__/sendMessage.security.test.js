'use strict';

// Mock the BullMQ-backed addJob so we can assert on dispatched payloads
// without booting a real queue. Must come BEFORE the chat.service require
// so the service's `require('.../jobQueue')` returns the mock.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const ChatRoom = require('../../../models/ChatRoom.model');
const Message = require('../../../models/Message.model');
const User = require('../../../models/User.model');
const { addJob } = require('../../../core/jobs/jobQueue');

// Stub redis (only `incr` is used by sendMessage). Namespace + messaging
// are stubbed since we don't assert on socket emit here.
const fakeRedis = {
  _seq: 0,
  incr: jest.fn().mockImplementation(async function () { return ++this._seq; }),
};
const fakeMessaging = { emitToRoom: jest.fn() };

const chatService = require('../chat.service')({
  redis: fakeRedis,
  messaging: fakeMessaging,
  notification: null,
});

describe('chat sendMessage — push notification body sanitization (S-followup-11)', () => {
  let aliceId, bobId, roomId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    addJob.mockClear();
    fakeRedis._seq = 0;

    const alice = await User.create({ email: 'alice@example.com', name: 'Alice Smith' });
    const bob = await User.create({ email: 'bob@example.com', name: 'Bob Jones' });
    aliceId = alice._id;
    bobId = bob._id;

    const room = await ChatRoom.create({
      participants: [aliceId, bobId],
      type: 'direct',
    });
    roomId = room._id;
  });

  test('benign text — body is "New message from {name}", does NOT contain message text', async () => {
    await chatService.sendMessage(roomId, aliceId, 'Hey, see you at 4pm');
    expect(addJob).toHaveBeenCalledTimes(1);
    const [, payload] = addJob.mock.calls[0];
    expect(payload.body).toBe('New message from Alice Smith');
    expect(payload.body).not.toContain('Hey');
    expect(payload.body).not.toContain('4pm');
  });

  test('URL phishing payload — body does NOT include the URL', async () => {
    await chatService.sendMessage(roomId, aliceId, 'Reset password at bit.ly/scam URGENT');
    const [, payload] = addJob.mock.calls[0];
    expect(payload.body).not.toMatch(/bit\.ly/);
    expect(payload.body).not.toMatch(/scam/i);
    expect(payload.body).not.toMatch(/urgent/i);
  });

  test('HTML payload — body does NOT contain script tags', async () => {
    await chatService.sendMessage(roomId, aliceId, '<script>alert(1)</script>');
    const [, payload] = addJob.mock.calls[0];
    expect(payload.body).not.toMatch(/<script>/i);
    expect(payload.body).not.toMatch(/alert/);
  });

  test('long message (>200 chars) — body has no truncation marker, fixed length', async () => {
    const longText = 'a'.repeat(500);
    await chatService.sendMessage(roomId, aliceId, longText);
    const [, payload] = addJob.mock.calls[0];
    expect(payload.body).not.toContain('...');
    expect(payload.body).not.toContain('aaaa');
    expect(payload.body).toBe('New message from Alice Smith');
  });

  test('sender with null name — body falls back to "New message" (no null/undefined leak)', async () => {
    const charlie = await User.create({ email: 'charlie@example.com' }); // no name
    await ChatRoom.findByIdAndUpdate(roomId, { participants: [charlie._id, bobId] });
    await chatService.sendMessage(roomId, charlie._id, 'whatever');
    const [, payload] = addJob.mock.calls[0];
    expect(payload.body).toBe('New message');
    expect(payload.body).not.toMatch(/null|undefined/i);
  });

  test('sender with HTML-injection display name — name is HTML-escaped', async () => {
    const evil = await User.create({ email: 'evil@example.com', name: '<script>alert(1)</script>' });
    await ChatRoom.findByIdAndUpdate(roomId, { participants: [evil._id, bobId] });
    await chatService.sendMessage(roomId, evil._id, 'hi');
    const [, payload] = addJob.mock.calls[0];
    expect(payload.body).not.toMatch(/<script>/);
    expect(payload.body).toContain('&lt;script&gt;');
  });

  test('notification.data carries only roomId — no preview leak via data channel', async () => {
    await chatService.sendMessage(roomId, aliceId, 'secret message text');
    const [, payload] = addJob.mock.calls[0];
    expect(payload.data).toEqual({ roomId: String(roomId) });
    expect(payload.data.text).toBeUndefined();
    expect(payload.data.body).toBeUndefined();
    expect(payload.data.preview).toBeUndefined();
  });

  test('non-participant senderId — 403 thrown, no jobs dispatched (regression guard)', async () => {
    const stranger = await User.create({ email: 'stranger@example.com', name: 'Stranger' });
    await expect(chatService.sendMessage(roomId, stranger._id, 'phish payload'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(addJob).not.toHaveBeenCalled();
  });

  test('multi-participant room — sender lookup is done once, body is identical for all recipients', async () => {
    const carol = await User.create({ email: 'carol@example.com', name: 'Carol' });
    const group = await ChatRoom.create({
      participants: [aliceId, bobId, carol._id],
      type: 'direct',
    });

    await chatService.sendMessage(group._id, aliceId, 'group msg');
    expect(addJob).toHaveBeenCalledTimes(2); // bob + carol, not alice
    const bodies = addJob.mock.calls.map(([, p]) => p.body);
    expect(bodies).toEqual([
      'New message from Alice Smith',
      'New message from Alice Smith',
    ]);
  });
});
