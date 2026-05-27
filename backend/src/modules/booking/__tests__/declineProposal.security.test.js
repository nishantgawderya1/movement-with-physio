'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const BookingProposal = require('../../../models/BookingProposal.model');
const User = require('../../../models/User.model');
const {
  MEETING_TYPE, PROPOSAL_STATUS, ROLES, NOTIFICATION_TYPES,
} = require('../../../core/utils/constants');

const mockAddJob = jest.fn().mockResolvedValue({ id: 'mock' });
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: (...args) => mockAddJob(...args),
}));
jest.mock('../../../config/redis', () => ({
  getClient: () => ({
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }),
}));
jest.mock('../../../core/cache/cacheManager', () => ({
  invalidate: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  init: jest.fn(),
}));

const proposalService = require('../proposal.service');
const { declineProposalSchema } = require('../proposal.validation');

function futureDate(hoursAhead = 12) {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
}

function makePendingProposal(overrides = {}) {
  return BookingProposal.create({
    therapistId: overrides.therapistId,
    patientId: overrides.patientId,
    slotStart: overrides.slotStart || futureDate(48),
    durationMinutes: 60,
    timezone: 'Asia/Kolkata',
    meetingType: MEETING_TYPE.IN_PERSON,
    status: overrides.status || PROPOSAL_STATUS.PENDING,
    respondedAt: overrides.respondedAt ?? null,
    expiresAt: overrides.expiresAt || futureDate(12),
  });
}

describe('proposal.service.declineProposal — gates + persistence + notification', () => {
  let therapist, patient, otherPatient;
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
    therapist = await User.create({
      clerkId: 't_' + Date.now(), email: 'dr@x.com', name: 'Dr A', role: ROLES.THERAPIST,
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

  test('1. patient declines own pending proposal → 200, status=declined, respondedAt + declineReason set', async () => {
    const result = await proposalService.declineProposal(
      patientActor, String(proposal._id), { reason: 'I am unavailable' }
    );
    expect(result.proposal.status).toBe(PROPOSAL_STATUS.DECLINED);
    expect(result.proposal.declineReason).toBe('I am unavailable');
    expect(result.proposal.respondedAt).toBeInstanceOf(Date);

    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.DECLINED);
    expect(reloaded.declineReason).toBe('I am unavailable');
  });

  test('2. therapist role tries to decline → 403 PROPOSAL_ROLE_REQUIRED', async () => {
    await expect(
      proposalService.declineProposal(therapistActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_ROLE_REQUIRED' });
  });

  test('3. wrong-patient decline → 403 PROPOSAL_NOT_RECIPIENT with benign "Proposal not found"', async () => {
    const otherActor = { mongoId: String(otherPatient._id), role: ROLES.PATIENT };
    let caught;
    try {
      await proposalService.declineProposal(otherActor, String(proposal._id), {});
    } catch (e) { caught = e; }
    expect(caught.statusCode).toBe(403);
    expect(caught.code).toBe('PROPOSAL_NOT_RECIPIENT');
    expect(caught.message).toBe('Proposal not found');
  });

  test('4. non-existent proposalId → 404 PROPOSAL_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      proposalService.declineProposal(patientActor, fakeId, {})
    ).rejects.toMatchObject({ statusCode: 404, code: 'PROPOSAL_NOT_FOUND' });
  });

  test('5. soft-deleted proposal → 404 PROPOSAL_NOT_FOUND', async () => {
    const doc = await BookingProposal.findById(proposal._id);
    await doc.softDelete();
    await expect(
      proposalService.declineProposal(patientActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 404, code: 'PROPOSAL_NOT_FOUND' });
  });

  test('6. proposal already accepted → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.ACCEPTED, respondedAt: new Date() },
    });
    await expect(
      proposalService.declineProposal(patientActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('7. proposal already declined → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.DECLINED, respondedAt: new Date() },
    });
    await expect(
      proposalService.declineProposal(patientActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('8. proposal expired → 410 PROPOSAL_EXPIRED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });
    await expect(
      proposalService.declineProposal(patientActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 410, code: 'PROPOSAL_EXPIRED' });
  });

  test('9. proposal cancelled by therapist → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.CANCELLED_BY_THERAPIST, respondedAt: new Date() },
    });
    await expect(
      proposalService.declineProposal(patientActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  // ── Reason handling ─────────────────────────────────────────────────
  test('10. decline with body.reason="I am unavailable" → reason persists on proposal.declineReason', async () => {
    await proposalService.declineProposal(patientActor, String(proposal._id), { reason: 'I am unavailable' });
    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.declineReason).toBe('I am unavailable');
  });

  test('11. decline with no reason → declineReason === null on proposal', async () => {
    await proposalService.declineProposal(patientActor, String(proposal._id), {});
    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.declineReason).toBeNull();
  });

  test('12. decline with empty-string reason → declineReason === null', async () => {
    await proposalService.declineProposal(patientActor, String(proposal._id), { reason: '' });
    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.declineReason).toBeNull();
  });

  test('13. Joi rejects: reason > 500 chars', () => {
    const { error } = declineProposalSchema.validate({ reason: 'x'.repeat(501) });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/reason/i);
  });

  // ── Race condition ──────────────────────────────────────────────────
  test('14. atomic claim: findOneAndUpdate returns null → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    const spy = jest.spyOn(BookingProposal, 'findOneAndUpdate').mockResolvedValueOnce(null);
    await expect(
      proposalService.declineProposal(patientActor, String(proposal._id), {})
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
    spy.mockRestore();
  });

  // ── Notification fan-out ────────────────────────────────────────────
  test('15. successful decline enqueues PROPOSAL_DECLINED with data fields set, NO category, body does NOT contain attacker reason text (S-followup-6)', async () => {
    const attackerReason = 'Visit bit.ly/phish for refund';
    await proposalService.declineProposal(
      patientActor, String(proposal._id), { reason: attackerReason }
    );

    const calls = mockAddJob.mock.calls.filter(([n]) => n === 'send_notification');
    expect(calls).toHaveLength(1);
    const payload = calls[0][1];
    expect(payload).toMatchObject({
      userId: String(therapist._id),
      type: NOTIFICATION_TYPES.PROPOSAL_DECLINED,
      data: {
        proposalId: String(proposal._id),
        slotStart: proposal.slotStart.toISOString(),
      },
    });
    // Critical: reason text MUST NOT appear in push body or data
    expect(payload.body).not.toContain(attackerReason);
    expect(payload.body).not.toMatch(/bit\.ly/);
    expect(JSON.stringify(payload.data)).not.toContain(attackerReason);
    expect(JSON.stringify(payload.data)).not.toMatch(/bit\.ly/);
    // No category — therapist push has no action buttons
    expect(payload.category).toBeUndefined();

    // Reason is still persisted on the proposal for in-app rendering
    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.declineReason).toBe(attackerReason);
  });

  test('16. notification body uses sanitizeDisplayName on patient name', async () => {
    patient.name = '<script>alert(1)</script>Mallory';
    await patient.save();
    await proposalService.declineProposal(patientActor, String(proposal._id), {});
    const payload = mockAddJob.mock.calls.find(([n]) => n === 'send_notification')[1];
    expect(payload.body).not.toMatch(/<script>/i);
    expect(payload.body).not.toContain('<');
    expect(payload.body).toContain('&lt;');
  });
});
