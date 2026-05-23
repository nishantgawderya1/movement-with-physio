'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const BookingProposal = require('../../../models/BookingProposal.model');
const User = require('../../../models/User.model');
const AssessmentQuestionTemplate = require('../../../models/AssessmentQuestionTemplate.model');
const {
  BOOKING_STATUS, MEETING_TYPE, PROPOSAL_STATUS, ROLES,
  NOTIFICATION_TYPES,
} = require('../../../core/utils/constants');

// jobQueue mock — assert PROPOSAL_ACCEPTED enqueue shape, count audit fires.
const mockAddJob = jest.fn().mockResolvedValue({ id: 'mock' });
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: (...args) => mockAddJob(...args),
}));

// Redis mock — track set/del so we can assert slot-lock acquire/release.
const mockRedisSet = jest.fn().mockResolvedValue('OK');
const mockRedisDel = jest.fn().mockResolvedValue(1);
jest.mock('../../../config/redis', () => ({
  getClient: () => ({
    set: (...args) => mockRedisSet(...args),
    del: (...args) => mockRedisDel(...args),
  }),
}));

// cacheManager — attachVideoCallAndAssessment calls Assessment.create which
// doesn't touch the cache, but createBooking's caller does. Mock to be safe
// because the service file imports cacheManager transitively via booking.service.
jest.mock('../../../core/cache/cacheManager', () => ({
  invalidate: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  init: jest.fn(),
}));

const proposalService = require('../proposal.service');

async function seedQuestions() {
  await AssessmentQuestionTemplate.create([
    { bodyPart: 'general', questionId: 'general-001', order: 1, questionText: 'g1', answerType: 'text', isActive: true },
    { bodyPart: 'general', questionId: 'general-002', order: 2, questionText: 'g2', answerType: 'scale', isActive: true },
  ]);
}

function futureDate(hoursAhead = 24 * 3) {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
}

function makePendingProposal(overrides = {}) {
  return BookingProposal.create({
    therapistId: overrides.therapistId,
    patientId: overrides.patientId,
    slotStart: overrides.slotStart || futureDate(48),
    durationMinutes: 60,
    timezone: 'Asia/Kolkata',
    meetingType: overrides.meetingType || MEETING_TYPE.IN_PERSON,
    notes: overrides.notes ?? null,
    status: overrides.status || PROPOSAL_STATUS.PENDING,
    respondedAt: overrides.respondedAt ?? null,
    expiresAt: overrides.expiresAt || futureDate(12), // 12h from now
  });
}

describe('proposal.service.acceptProposal — role + existence + state gates', () => {
  let therapist, patient, otherTherapist, otherPatient;
  let patientActor, therapistActor;
  let proposal;

  beforeAll(async () => {
    await connect();
    await BookingProposal.init();
  });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    mockRedisSet.mockClear();
    mockRedisDel.mockClear();
    mockRedisSet.mockResolvedValue('OK');
    await seedQuestions();
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
    patientActor = { mongoId: String(patient._id), role: ROLES.PATIENT };
    therapistActor = { mongoId: String(therapist._id), role: ROLES.THERAPIST };
    proposal = await makePendingProposal({ therapistId: therapist._id, patientId: patient._id });
  });

  test('1. patient accepts own pending proposal → 201, Booking created, proposal.status=accepted, proposal.bookingId set', async () => {
    const result = await proposalService.acceptProposal(patientActor, String(proposal._id));
    expect(result.booking).toBeDefined();
    expect(result.booking.status).toBe(BOOKING_STATUS.CONFIRMED);
    expect(result.proposal.status).toBe(PROPOSAL_STATUS.ACCEPTED);

    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.ACCEPTED);
    expect(reloaded.bookingId).toBeDefined();
    expect(String(reloaded.bookingId)).toBe(String(result.booking._id));
    expect(reloaded.respondedAt).toBeInstanceOf(Date);

    const bookingDoc = await Booking.findById(result.booking._id).lean();
    expect(bookingDoc).toBeDefined();
    expect(bookingDoc.idempotencyKey).toBe(`proposal:${String(proposal._id)}`);
  });

  test('2. therapist role tries to accept → 403 PROPOSAL_ROLE_REQUIRED', async () => {
    await expect(
      proposalService.acceptProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_ROLE_REQUIRED' });
  });

  test('3. wrong-patient accept → 403 PROPOSAL_NOT_RECIPIENT with benign message "Proposal not found"', async () => {
    const otherActor = { mongoId: String(otherPatient._id), role: ROLES.PATIENT };
    let caught;
    try {
      await proposalService.acceptProposal(otherActor, String(proposal._id));
    } catch (e) {
      caught = e;
    }
    expect(caught.statusCode).toBe(403);
    expect(caught.code).toBe('PROPOSAL_NOT_RECIPIENT');
    expect(caught.message).toBe('Proposal not found');
  });

  test('4. non-existent proposalId → 404 PROPOSAL_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      proposalService.acceptProposal(patientActor, fakeId)
    ).rejects.toMatchObject({ statusCode: 404, code: 'PROPOSAL_NOT_FOUND' });
  });

  test('5. soft-deleted proposal → 404 PROPOSAL_NOT_FOUND', async () => {
    const doc = await BookingProposal.findById(proposal._id);
    await doc.softDelete();
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 404, code: 'PROPOSAL_NOT_FOUND' });
  });

  test('6. proposal already accepted → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.ACCEPTED, respondedAt: new Date() },
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('7. proposal already declined → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.DECLINED, respondedAt: new Date() },
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('8. proposal already expired → 409 PROPOSAL_ALREADY_RESPONDED (status check fires before expiry check)', async () => {
    // Two states could trigger here: status='expired' (sweep flipped) and
    // expiresAt < now (sweep hasn't run yet). Status check fires first in
    // acceptProposal — confirms the ordering documented in JSDoc.
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.EXPIRED, respondedAt: new Date() },
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('9. proposal cancelled by therapist → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.CANCELLED_BY_THERAPIST, respondedAt: new Date() },
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('10. proposal expiresAt in the past (still status=pending — sweep not yet run) → 410 PROPOSAL_EXPIRED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 410, code: 'PROPOSAL_EXPIRED' });
  });

  test('11. proposal slotStart in the past (queue delay edge case) → 409 PROPOSAL_SLOT_NOW_PAST', async () => {
    // slotStart in past but expiresAt still future — possible if therapist
    // proposed for a near-term slot and patient delayed responding.
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: {
        slotStart: new Date(Date.now() - 60 * 60 * 1000),
        expiresAt: futureDate(2),
      },
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_NOW_PAST' });
  });

  // ── Race conditions ──────────────────────────────────────────────────
  test('12. patient already has confirmed Booking at proposal.slotStart → 409 PROPOSAL_SLOT_NOW_TAKEN; proposal stays pending', async () => {
    await Booking.create({
      therapistId: otherTherapist._id,
      patientId: patient._id,
      slotStart: proposal.slotStart,
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_NOW_TAKEN' });

    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.PENDING);
    expect(reloaded.bookingId).toBeNull();
  });

  test('13. atomic claim: simulated concurrent winner — findOneAndUpdate returns null → 409 PROPOSAL_ALREADY_RESPONDED, lock released', async () => {
    // Spy on findOneAndUpdate to force a null return (mimicking another
    // caller having already flipped the status between our findById and
    // our atomic claim). mockResolvedValueOnce → only the first call (the
    // atomic claim) is overridden; subsequent calls fall through to the
    // real method, so jest.restoreAllMocks in test teardown is sufficient.
    const spy = jest.spyOn(BookingProposal, 'findOneAndUpdate').mockResolvedValueOnce(null);

    let caught;
    try {
      await proposalService.acceptProposal(patientActor, String(proposal._id));
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });

    // Lock release fired even though atomic claim lost — finally-block path
    expect(mockRedisDel).toHaveBeenCalled();

    spy.mockRestore();
  });

  // ── Smart-join shape preservation ────────────────────────────────────
  test('14. accept(meetingType=video) → Booking has meetingType=video, videoCallId set, status=confirmed (smart-join contract)', async () => {
    const videoProposal = await makePendingProposal({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: futureDate(72),
      meetingType: MEETING_TYPE.VIDEO,
    });

    const result = await proposalService.acceptProposal(patientActor, String(videoProposal._id));

    expect(result.booking.meetingType).toBe(MEETING_TYPE.VIDEO);
    expect(result.booking.status).toBe(BOOKING_STATUS.CONFIRMED);
    expect(result.booking.videoCallId).toBeDefined();
    expect(result.booking.videoCallId).not.toBeNull();

    const reloaded = await Booking.findById(result.booking._id).lean();
    expect(reloaded.videoCallId).toBeDefined();
    expect(String(reloaded.patientId)).toBe(String(patient._id));
    expect(reloaded.slotStart.getTime()).toBe(videoProposal.slotStart.getTime());
  });

  test('15. accept(meetingType=in_person) → Booking has meetingType=in_person, videoCallId null (smart-join excludes)', async () => {
    const result = await proposalService.acceptProposal(patientActor, String(proposal._id));
    expect(result.booking.meetingType).toBe(MEETING_TYPE.IN_PERSON);
    expect(result.booking.videoCallId).toBeNull();
  });

  // ── Notification surface ─────────────────────────────────────────────
  test('16. successful accept enqueues PROPOSAL_ACCEPTED notification with proposalId+bookingId+slotStart, NO category', async () => {
    const result = await proposalService.acceptProposal(patientActor, String(proposal._id));

    const calls = mockAddJob.mock.calls.filter(([n]) => n === 'send_notification');
    expect(calls).toHaveLength(1);
    const payload = calls[0][1];
    expect(payload).toMatchObject({
      userId: String(therapist._id),
      type: NOTIFICATION_TYPES.PROPOSAL_ACCEPTED,
      data: {
        proposalId: String(proposal._id),
        bookingId: String(result.booking._id),
        slotStart: proposal.slotStart.toISOString(),
      },
    });
    // No category — therapist push has no action buttons
    expect(payload.category).toBeUndefined();
  });

  test('17. notification body sanitizes patient name (HTML/control chars stripped)', async () => {
    patient.name = '<script>alert(1)</script>Mallory';
    await patient.save();

    await proposalService.acceptProposal(patientActor, String(proposal._id));
    const payload = mockAddJob.mock.calls.find(([n]) => n === 'send_notification')[1];
    expect(payload.body).not.toMatch(/<script>/i);
    expect(payload.body).not.toContain('<');
    expect(payload.body).toContain('&lt;'); // HTML-escaped survives
  });

  // ── Rollback on Booking.create failure ───────────────────────────────
  test('18. Booking.create throws E11000 → proposal rolls back to pending, respondedAt cleared, Redis lock released', async () => {
    const e11000 = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    const spy = jest.spyOn(Booking, 'create').mockRejectedValueOnce(e11000);

    let caught;
    try {
      await proposalService.acceptProposal(patientActor, String(proposal._id));
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_NOW_TAKEN' });

    // Proposal rolled back
    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.PENDING);
    expect(reloaded.respondedAt).toBeNull();

    // Lock released
    expect(mockRedisDel).toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('proposal.service.acceptProposal — Redis lock contention', () => {
  let therapist, patient, patientActor, proposal;

  beforeAll(async () => {
    await connect();
    await BookingProposal.init();
  });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    mockRedisSet.mockClear();
    mockRedisDel.mockClear();
    therapist = await User.create({
      clerkId: 't_' + Date.now(), email: 'dr@x.com', name: 'A', role: ROLES.THERAPIST,
    });
    patient = await User.create({
      clerkId: 'p_' + Date.now(), email: 'pat@x.com', name: 'P', role: ROLES.PATIENT,
    });
    patientActor = { mongoId: String(patient._id), role: ROLES.PATIENT };
    proposal = await makePendingProposal({ therapistId: therapist._id, patientId: patient._id });
  });

  test('Redis SETNX returns non-OK → 409 PROPOSAL_SLOT_NOW_TAKEN; proposal stays pending; del NOT called (we never held the lock)', async () => {
    mockRedisSet.mockResolvedValueOnce(null); // lock contention
    await expect(
      proposalService.acceptProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_SLOT_NOW_TAKEN' });

    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.PENDING);
    // No del — we never acquired
    expect(mockRedisDel).not.toHaveBeenCalled();
  });
});
