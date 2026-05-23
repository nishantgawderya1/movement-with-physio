'use strict';

const { connect, close, clearDb } = require('../../../tests/setup');
const mongoose = require('mongoose');
const BookingProposal = require('../BookingProposal.model');
const { PROPOSAL_STATUS, MEETING_TYPE } = require('../../core/utils/constants');

// Standard fixture — overridable per-test.
function makeValidProposal(overrides = {}) {
  return {
    therapistId: new mongoose.Types.ObjectId(),
    patientId: new mongoose.Types.ObjectId(),
    slotStart: new Date('2026-06-01T10:00:00Z'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

describe('BookingProposal model — schema validation', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  test('valid document with all required fields creates successfully', async () => {
    const doc = await BookingProposal.create(makeValidProposal());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe(PROPOSAL_STATUS.PENDING);
  });

  test('missing therapistId → validation error', async () => {
    await expect(
      BookingProposal.create(makeValidProposal({ therapistId: undefined }))
    ).rejects.toThrow(/therapistId/i);
  });

  test('missing patientId → validation error', async () => {
    await expect(
      BookingProposal.create(makeValidProposal({ patientId: undefined }))
    ).rejects.toThrow(/patientId/i);
  });

  test('missing slotStart → validation error', async () => {
    await expect(
      BookingProposal.create(makeValidProposal({ slotStart: undefined }))
    ).rejects.toThrow(/slotStart/i);
  });

  test('missing expiresAt → validation error', async () => {
    await expect(
      BookingProposal.create(makeValidProposal({ expiresAt: undefined }))
    ).rejects.toThrow(/expiresAt/i);
  });

  test('invalid meetingType (e.g. "phone") → validation error', async () => {
    await expect(
      BookingProposal.create(makeValidProposal({ meetingType: 'phone' }))
    ).rejects.toThrow(/meetingType/i);
  });

  test('invalid status (e.g. "foo") → validation error', async () => {
    await expect(
      BookingProposal.create(makeValidProposal({ status: 'foo' }))
    ).rejects.toThrow(/status/i);
  });

  test('default status === "pending" when not provided', async () => {
    const doc = await BookingProposal.create(makeValidProposal());
    expect(doc.status).toBe(PROPOSAL_STATUS.PENDING);
  });

  test('default meetingType === "in_person" when not provided', async () => {
    const doc = await BookingProposal.create(makeValidProposal());
    expect(doc.meetingType).toBe(MEETING_TYPE.IN_PERSON);
  });

  test('default timezone === "Asia/Kolkata" when not provided', async () => {
    const doc = await BookingProposal.create(makeValidProposal());
    expect(doc.timezone).toBe('Asia/Kolkata');
  });

  test('default durationMinutes === 60 when not provided', async () => {
    const doc = await BookingProposal.create(makeValidProposal());
    expect(doc.durationMinutes).toBe(60);
  });

  test('softDelete plugin: setting isDeleted true populates deletedAt', async () => {
    const doc = await BookingProposal.create(makeValidProposal());
    expect(doc.isDeleted).toBe(false);
    expect(doc.deletedAt).toBeNull();
    await doc.softDelete();
    expect(doc.isDeleted).toBe(true);
    expect(doc.deletedAt).toBeInstanceOf(Date);
  });
});

describe('BookingProposal model — partial unique index (slot conflict)', () => {
  beforeAll(async () => {
    await connect();
    // Build indexes once — Mongoose otherwise builds lazily on first write,
    // which races our duplicate-key assertions on a fresh in-memory DB.
    await BookingProposal.init();
  });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  test('two PENDING proposals for same { therapistId, slotStart } → duplicate key error', async () => {
    const therapistId = new mongoose.Types.ObjectId();
    const slotStart = new Date('2026-06-01T10:00:00Z');

    await BookingProposal.create(makeValidProposal({ therapistId, slotStart }));
    await expect(
      BookingProposal.create(makeValidProposal({ therapistId, slotStart }))
    ).rejects.toMatchObject({ code: 11000 }); // Mongo duplicate-key error
  });

  test('partial filter respects status="pending" — does NOT block pending at slot where same therapist has an ACCEPTED proposal', async () => {
    const therapistId = new mongoose.Types.ObjectId();
    const slotStart = new Date('2026-06-01T10:00:00Z');

    // Pre-existing accepted proposal at this slot
    await BookingProposal.create(
      makeValidProposal({
        therapistId,
        slotStart,
        status: PROPOSAL_STATUS.ACCEPTED,
        respondedAt: new Date(),
      })
    );

    // New pending proposal at the same slot must succeed — the partial index
    // is filtered to status='pending', so an accepted proposal does not collide.
    const doc = await BookingProposal.create(
      makeValidProposal({ therapistId, slotStart })
    );
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe(PROPOSAL_STATUS.PENDING);
  });
});
