'use strict';

// Mock firebase-admin at the SDK boundary so we can assert on the exact
// Message object the adapter dispatches without hitting Google's API.
// Mirrors the harness pattern from
// src/providers/email/__tests__/ResendAdapter.security.test.js.
const mockSend = jest.fn().mockResolvedValue('mock-fcm-response-id');
const mockMessaging = jest.fn(() => ({ send: mockSend }));
const mockCert = jest.fn(() => ({}));
const mockInitializeApp = jest.fn();

jest.mock('firebase-admin', () => ({
  initializeApp: (...args) => mockInitializeApp(...args),
  credential: { cert: (...args) => mockCert(...args) },
  messaging: (...args) => mockMessaging(...args),
}));

const FCMAdapter = require('../FCMAdapter');

const SERVICE_ACCOUNT = { project_id: 'test-project', client_email: 'x@y.iam', private_key: 'pk' };
const FCM_TOKEN = 'device-token-abc123';

describe('FCMAdapter — iOS category threading (regression)', () => {
  let adapter;

  beforeEach(() => {
    mockSend.mockClear();
    mockMessaging.mockClear();
    adapter = new FCMAdapter(SERVICE_ACCOUNT);
  });

  test('payload without category → message has NO apns key (backward compat)', async () => {
    await adapter.sendPush(FCM_TOKEN, {
      title: 'Hello',
      body: 'World',
      data: { roomId: 'r1' },
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const message = mockSend.mock.calls[0][0];
    expect(message.apns).toBeUndefined();
    expect(message.notification).toEqual({ title: 'Hello', body: 'World' });
    expect(message.token).toBe(FCM_TOKEN);
  });

  test('payload with category="PROPOSAL" → message.apns.payload.aps.category === "PROPOSAL"', async () => {
    await adapter.sendPush(FCM_TOKEN, {
      title: 'New proposal',
      body: 'Your therapist has proposed a session',
      data: { proposalId: 'p1' },
      category: 'PROPOSAL',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const message = mockSend.mock.calls[0][0];
    expect(message.apns).toEqual({
      payload: { aps: { category: 'PROPOSAL' } },
    });
  });

  test('payload with category="" (empty string) → no apns block (treated as absent)', async () => {
    await adapter.sendPush(FCM_TOKEN, {
      title: 'X',
      body: 'Y',
      data: {},
      category: '',
    });
    const message = mockSend.mock.calls[0][0];
    expect(message.apns).toBeUndefined();
  });

  test('payload with category=null → no apns block (null-safe)', async () => {
    await adapter.sendPush(FCM_TOKEN, {
      title: 'X',
      body: 'Y',
      data: {},
      category: null,
    });
    const message = mockSend.mock.calls[0][0];
    expect(message.apns).toBeUndefined();
  });

  test('existing data stringification preserved (no regression on coercion path)', async () => {
    await adapter.sendPush(FCM_TOKEN, {
      title: 'X',
      body: 'Y',
      data: { foo: 123, bar: true },
    });
    const message = mockSend.mock.calls[0][0];
    expect(message.data).toEqual({ foo: '123', bar: 'true' });
  });

  test('category coexists with data stringification — both populated independently', async () => {
    await adapter.sendPush(FCM_TOKEN, {
      title: 'X',
      body: 'Y',
      data: { foo: 42 },
      category: 'PROPOSAL',
    });
    const message = mockSend.mock.calls[0][0];
    expect(message.data).toEqual({ foo: '42' });
    expect(message.apns.payload.aps.category).toBe('PROPOSAL');
  });
});
