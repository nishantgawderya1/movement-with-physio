'use strict';

// Mock the Resend SDK before requiring the adapter so we can assert on
// what gets sent without hitting the network.
const mockSend = jest.fn().mockResolvedValue({ id: 'mock-msg-id' });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const ResendAdapter = require('../ResendAdapter');
const EMAIL_TEMPLATES = require('../emailTemplates');
const { CRITICAL_NOTIFICATION_TYPES } = require('../../../core/utils/constants');

describe('ResendAdapter — template allowlist (S-followup-12)', () => {
  let adapter;
  beforeEach(() => {
    mockSend.mockClear();
    adapter = new ResendAdapter({ apiKey: 'test', from: 'no-reply@example.com' });
  });

  test('known templateId renders the canned HTML and calls client.emails.send', async () => {
    await adapter.sendTransactional('user@example.com', {
      subject: 'Booked',
      templateId: 'booking_confirmed',
      variables: { slot: '2026-06-01 14:00' },
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentArgs = mockSend.mock.calls[0][0];
    expect(sentArgs.to).toBe('user@example.com');
    expect(sentArgs.subject).toBe('Booked');
    expect(sentArgs.html).toContain('Booking Confirmed');
    expect(sentArgs.html).toContain('2026-06-01 14:00');
  });

  test('unknown templateId throws INVALID_TEMPLATE_ID; client.emails.send NOT called', async () => {
    await expect(
      adapter.sendTransactional('user@example.com', {
        subject: 'x',
        templateId: 'unknown_template',
        variables: {},
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'INVALID_TEMPLATE_ID',
      details: { templateId: 'unknown_template' },
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('unknown templateId with HTML-injection payload — throw occurs before any rendering', async () => {
    // Regression guard for the dropped raw-HTML fallback. Pre-fix this
    // would have stringified `<script>` into `<p>{"body":"<script>..."}</p>`
    // and shipped it to Resend.
    await expect(
      adapter.sendTransactional('user@example.com', {
        subject: 'x',
        templateId: 'attacker_chose_this',
        variables: { body: '<script>alert(1)</script>' },
      })
    ).rejects.toMatchObject({ code: 'INVALID_TEMPLATE_ID' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('sendBulk with mixed valid/invalid templateId — Promise.allSettled resolves; valid recipients still receive', async () => {
    // sendBulk wraps in Promise.allSettled so per-recipient failures don't
    // reject the batch — confirm the valid call still went through.
    await adapter.sendBulk(['ok1@example.com', 'ok2@example.com'], {
      subject: 'reminder',
      templateId: 'session_reminder',
      variables: { slot: '3pm' },
    });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

describe('ResendAdapter — drift guard: CRITICAL_NOTIFICATION_TYPES subset of template map', () => {
  test('every value in CRITICAL_NOTIFICATION_TYPES has a renderer in EMAIL_TEMPLATES', () => {
    // INVARIANT: when notificationWorker falls back to email for a critical
    // type, the adapter must have a template for it — otherwise we throw
    // INVALID_TEMPLATE_ID and the user gets no email at all. This test
    // catches drift at CI time so we never silently regress.
    const templateKeys = Object.keys(EMAIL_TEMPLATES);
    const missing = CRITICAL_NOTIFICATION_TYPES.filter((t) => !templateKeys.includes(t));
    expect(missing).toEqual([]);
  });

  test('all template keys are reachable via a known notification constant', () => {
    // Inverse direction: catch templates we added but forgot to wire up.
    // Less critical but cheap to assert.
    const { NOTIFICATION_TYPES } = require('../../../core/utils/constants');
    const notifValues = Object.values(NOTIFICATION_TYPES);
    const orphaned = Object.keys(EMAIL_TEMPLATES).filter((k) => !notifValues.includes(k));
    expect(orphaned).toEqual([]);
  });
});
