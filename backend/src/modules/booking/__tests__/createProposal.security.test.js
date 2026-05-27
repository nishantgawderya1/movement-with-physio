'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const BookingProposal = require('../../../models/BookingProposal.model');
const User = require('../../../models/User.model');
const {
  BOOKING_STATUS, MEETING_TYPE, PROPOSAL_STATUS, ROLES,
  NOTIFICATION_TYPES, NOTIFICATION_CATEGORIES,
} = require('../../../core/utils/constants');

const mockAddJob = jest.fn().mockResolvedValue({ id: 'mock' });
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: (...args) => mockAddJob(...args),
}));

const proposalService = require('../proposal.service');
const { createProposalSchema } = require('../proposal.validation');

// Helper: future ISO slot (always > now).
function futureSlotISO(daysAhead = 7, hour = 10) {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeBody(overrides = {}) {
  return {
    patientId: overrides.patientId || new mongoose.Types.ObjectId().toString(),
    slotStart: overrides.slotStart || futureSlotISO(),
    durationMinutes: 60,
    timezone: 'Asia/Kolkata',
    meetingType: MEETING_TYPE.VIDEO,
    notes: null,
    ...overrides,
  };
}

describe('proposal.service.createProposal — relationship gate & conflict matrix', () => {
  let therapist, otherTherapist, patient, otherPatient;
  let actor;

  beforeAll(async () => {
    await connect();
    await BookingProposal.init();
  });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    therapist = await User.create({
      clerkId: 't_' + Date.now(), email: 'dr.alice@x.com', name: 'Alice', role: ROLES.THERAPIST,
    });
    otherTherapist = await User.create({
      clerkId: 'ot_' + Date.now(), email: 'dr.bob@x.com', name: 'Bob', role: ROLES.THERAPIST,
    });
    patient = await User.create({
      clerkId: 'p_' + Date.now(), email: 'pat@x.com', name: 'Pat', role: ROLES.PATIENT,
    });
    otherPatient = await User.create({
      clerkId: 'op_' + Date.now(), email: 'pat2@x.com', name: 'Pat2', role: ROLES.PATIENT,
    });
    actor = { mongoId: String(therapist._id), role: ROLES.THERAPIST };
  });

  // ── Relationship gate ───────────────────────────────────────────────
  test('therapist with prior CONFIRMED booking → success; proposal pending, expiresAt within 24h', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    const before = Date.now();
    const result = await proposalService.createProposal(actor, makeBody({ patientId: String(patient._id) }));
    const after = Date.now();

    expect(result.proposal).toBeDefined();
    expect(result.proposal.status).toBe(PROPOSAL_STATUS.PENDING);

    const reloaded = await BookingProposal.findById(result.proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.PENDING);
    expect(reloaded.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 1000);
    expect(reloaded.expiresAt.getTime()).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 1000);
  });

  test('therapist with prior COMPLETED booking → success (gate accepts both confirmed and completed)', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    const result = await proposalService.createProposal(actor, makeBody({ patientId: String(patient._id) }));
    expect(result.proposal.status).toBe(PROPOSAL_STATUS.PENDING);
  });

  test('therapist with NO prior booking with patient → PROPOSAL_NO_PRIOR_RELATIONSHIP (403)', async () => {
    await expect(
      proposalService.createProposal(actor, makeBody({ patientId: String(patient._id) }))
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_NO_PRIOR_RELATIONSHIP' });
  });

  test('therapist with prior CANCELLED booking only → PROPOSAL_NO_PRIOR_RELATIONSHIP (gate is confirmed/completed only)', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CANCELLED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await expect(
      proposalService.createProposal(actor, makeBody({ patientId: String(patient._id) }))
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_NO_PRIOR_RELATIONSHIP' });
  });

  // ── Role gate ───────────────────────────────────────────────────────
  test('patient role calls createProposal → PROPOSAL_ROLE_REQUIRED (403)', async () => {
    const patientActor = { mongoId: String(patient._id), role: ROLES.PATIENT };
    await expect(
      proposalService.createProposal(patientActor, makeBody({ patientId: String(otherPatient._id) }))
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_ROLE_REQUIRED' });
  });

  // ── Past-slot guard ─────────────────────────────────────────────────
  test('slotStart in the past → PROPOSAL_SLOT_IN_PAST (400)', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    const pastIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await expect(
      proposalService.createProposal(actor, makeBody({
        patientId: String(patient._id),
        slotStart: pastIso,
      }))
    ).rejects.toMatchObject({ statusCode: 400, code: 'PROPOSAL_SLOT_IN_PAST' });
  });

  // ── Conflict matrix ─────────────────────────────────────────────────
  test('therapist already has confirmed Booking at slotStart → PROPOSAL_SLOT_CONFLICT_THERAPIST (409)', async () => {
    const slot = futureSlotISO(10, 14);
    // Prior relationship so we pass the S2 gate
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    // Conflicting confirmed booking at the proposed slot
    await Booking.create({
      therapistId: therapist._id, patientId: otherPatient._id,
      slotStart: new Date(slot),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await expect(
      proposalService.createProposal(actor, makeBody({
        patientId: String(patient._id), slotStart: slot,
      }))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_THERAPIST' });
  });

  test('therapist already has pending proposal to a DIFFERENT patient at slotStart → PROPOSAL_SLOT_CONFLICT_THERAPIST (opaque code)', async () => {
    const slot = futureSlotISO(10, 14);
    // Prior relationships for both patients
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await Booking.create({
      therapistId: therapist._id, patientId: otherPatient._id,
      slotStart: new Date('2026-04-02T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    // Existing pending proposal to otherPatient at this slot
    await BookingProposal.create({
      therapistId: therapist._id, patientId: otherPatient._id,
      slotStart: new Date(slot), durationMinutes: 60, timezone: 'Asia/Kolkata',
      meetingType: MEETING_TYPE.IN_PERSON, status: PROPOSAL_STATUS.PENDING,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    await expect(
      proposalService.createProposal(actor, makeBody({
        patientId: String(patient._id), slotStart: slot,
      }))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_THERAPIST' });
  });

  test('therapist already has pending proposal to SAME patient at SAME slotStart → PROPOSAL_DUPLICATE_PENDING (409)', async () => {
    const slot = futureSlotISO(10, 14);
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await BookingProposal.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date(slot), durationMinutes: 60, timezone: 'Asia/Kolkata',
      meetingType: MEETING_TYPE.IN_PERSON, status: PROPOSAL_STATUS.PENDING,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    await expect(
      proposalService.createProposal(actor, makeBody({
        patientId: String(patient._id), slotStart: slot,
      }))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_DUPLICATE_PENDING' });
  });

  test('patient has confirmed Booking with DIFFERENT therapist at slotStart → PROPOSAL_SLOT_CONFLICT_PATIENT (409, generic message)', async () => {
    const slot = futureSlotISO(10, 14);
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    // Conflicting booking with the OTHER therapist
    await Booking.create({
      therapistId: otherTherapist._id, patientId: patient._id,
      slotStart: new Date(slot), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    let caught;
    try {
      await proposalService.createProposal(actor, makeBody({
        patientId: String(patient._id), slotStart: slot,
      }));
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_CONFLICT_PATIENT' });
    // Message must NOT leak the other therapist's identity
    expect(caught.message).not.toContain(String(otherTherapist._id));
    expect(caught.message).not.toContain('Bob');
  });

  test('patient has PENDING proposal from different therapist at same slotStart → success (concurrent proposals allowed)', async () => {
    const slot = futureSlotISO(10, 14);
    // Prior relationships
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await Booking.create({
      therapistId: otherTherapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-02T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    // Other therapist's pending proposal to this patient at the same slot
    await BookingProposal.create({
      therapistId: otherTherapist._id, patientId: patient._id,
      slotStart: new Date(slot), durationMinutes: 60, timezone: 'Asia/Kolkata',
      meetingType: MEETING_TYPE.IN_PERSON, status: PROPOSAL_STATUS.PENDING,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    const result = await proposalService.createProposal(actor, makeBody({
      patientId: String(patient._id), slotStart: slot,
    }));
    expect(result.proposal.status).toBe(PROPOSAL_STATUS.PENDING);
  });

  // ── Notification surface ────────────────────────────────────────────
  test('successful create enqueues send_notification with proposal type + PROPOSAL category + data', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    const slot = futureSlotISO();
    const result = await proposalService.createProposal(actor, makeBody({
      patientId: String(patient._id), slotStart: slot,
    }));

    const calls = mockAddJob.mock.calls.filter(([name]) => name === 'send_notification');
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toMatchObject({
      userId: String(patient._id),
      type: NOTIFICATION_TYPES.PROPOSAL_RECEIVED,
      category: NOTIFICATION_CATEGORIES.PROPOSAL,
      data: {
        proposalId: result.proposal._id.toString(),
        therapistId: String(therapist._id),
        slotStart: new Date(slot).toISOString(),
      },
    });
  });

  test('notification body uses sanitizeDisplayName on therapist name (HTML stripped)', async () => {
    therapist.name = '<script>alert(1)</script>Eve';
    await therapist.save();
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-04-01T10:00:00Z'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await proposalService.createProposal(actor, makeBody({ patientId: String(patient._id) }));

    const payload = mockAddJob.mock.calls.find(([n]) => n === 'send_notification')[1];
    // Raw HTML chars must not survive into the push body
    expect(payload.body).not.toMatch(/<script>/i);
    expect(payload.body).not.toContain('<');
    // The sanitized name (HTML-escaped) is what lands in the body
    expect(payload.body).toContain('&lt;');
  });
});

// ── Joi validation surface ─────────────────────────────────────────────
describe('createProposalSchema — Joi validation', () => {
  const validBase = () => ({
    patientId: new mongoose.Types.ObjectId().toString(),
    slotStart: futureSlotISO(),
    meetingType: MEETING_TYPE.VIDEO,
  });

  test('valid body → passes; durationMinutes/timezone defaults applied', () => {
    const { error, value } = createProposalSchema.validate(validBase());
    expect(error).toBeUndefined();
    expect(value.durationMinutes).toBe(60);
    expect(value.timezone).toBe('Asia/Kolkata');
  });

  test('missing patientId → 400 (Joi error)', () => {
    const body = validBase();
    delete body.patientId;
    const { error } = createProposalSchema.validate(body);
    expect(error).toBeDefined();
    expect(error.message).toMatch(/patientId/i);
  });

  test('invalid meetingType ("phone") → Joi error', () => {
    const { error } = createProposalSchema.validate({ ...validBase(), meetingType: 'phone' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/meetingType/i);
  });

  test('notes > 500 chars → Joi error (length cap)', () => {
    const { error } = createProposalSchema.validate({ ...validBase(), notes: 'x'.repeat(501) });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/notes/i);
  });

  // The shared validate middleware uses stripUnknown:true (see users.validation
  // P1.1 note); at the schema level we don't enforce .unknown(false) here
  // because the createBookingSchema convention is permissive. The actual
  // field-injection surface is closed at the service: only the destructured
  // fields are written to the Mongo document.
});
