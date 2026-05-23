'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const BookingProposal = require('../../../models/BookingProposal.model');
const User = require('../../../models/User.model');
const { MEETING_TYPE, PROPOSAL_STATUS, ROLES } = require('../../../core/utils/constants');

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

describe('proposal.service.deleteProposal — gates + status flip + no-notification', () => {
  let therapist, otherTherapist, patient;
  let therapistActor, patientActor, otherTherapistActor;
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
      clerkId: 't_' + Date.now(), email: 'dr@x.com', name: 'A', role: ROLES.THERAPIST,
    });
    otherTherapist = await User.create({
      clerkId: 'ot_' + Date.now(), email: 'dr2@x.com', name: 'B', role: ROLES.THERAPIST,
    });
    patient = await User.create({
      clerkId: 'p_' + Date.now(), email: 'pat@x.com', name: 'Pat', role: ROLES.PATIENT,
    });
    therapistActor = { mongoId: String(therapist._id), role: ROLES.THERAPIST };
    otherTherapistActor = { mongoId: String(otherTherapist._id), role: ROLES.THERAPIST };
    patientActor = { mongoId: String(patient._id), role: ROLES.PATIENT };
    proposal = await makePendingProposal({ therapistId: therapist._id, patientId: patient._id });
  });

  test('1. therapist cancels own pending proposal → success, status=cancelled_by_therapist', async () => {
    const result = await proposalService.deleteProposal(therapistActor, String(proposal._id));
    expect(result.proposal.status).toBe(PROPOSAL_STATUS.CANCELLED_BY_THERAPIST);
    expect(result.proposal.respondedAt).toBeInstanceOf(Date);

    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.CANCELLED_BY_THERAPIST);
  });

  test('2. patient tries to delete → 403 PROPOSAL_ROLE_REQUIRED', async () => {
    await expect(
      proposalService.deleteProposal(patientActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_ROLE_REQUIRED' });
  });

  test('3. therapist A tries to delete therapist B\'s proposal → 403 PROPOSAL_NOT_CREATOR with "Proposal not found"', async () => {
    let caught;
    try {
      await proposalService.deleteProposal(otherTherapistActor, String(proposal._id));
    } catch (e) { caught = e; }
    expect(caught.statusCode).toBe(403);
    expect(caught.code).toBe('PROPOSAL_NOT_CREATOR');
    expect(caught.message).toBe('Proposal not found');
  });

  test('4. non-existent proposalId → 404 PROPOSAL_NOT_FOUND', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      proposalService.deleteProposal(therapistActor, fakeId)
    ).rejects.toMatchObject({ statusCode: 404, code: 'PROPOSAL_NOT_FOUND' });
  });

  test('5. soft-deleted proposal → 404 PROPOSAL_NOT_FOUND', async () => {
    const doc = await BookingProposal.findById(proposal._id);
    await doc.softDelete();
    await expect(
      proposalService.deleteProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 404, code: 'PROPOSAL_NOT_FOUND' });
  });

  test('6. proposal already accepted (patient won race) → 409 PROPOSAL_ALREADY_RESPONDED; status remains accepted', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.ACCEPTED, respondedAt: new Date() },
    });
    await expect(
      proposalService.deleteProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });

    const reloaded = await BookingProposal.findById(proposal._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.ACCEPTED);
  });

  test('7. proposal already declined → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.DECLINED, respondedAt: new Date() },
    });
    await expect(
      proposalService.deleteProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('8. proposal expired (status flipped by sweep) → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    // Status check fires before any expiry check in deleteProposal —
    // matches the same pattern as acceptProposal test 8.
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.EXPIRED, respondedAt: new Date() },
    });
    await expect(
      proposalService.deleteProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('9. proposal already cancelled by this therapist → 409 PROPOSAL_ALREADY_RESPONDED', async () => {
    await BookingProposal.findByIdAndUpdate(proposal._id, {
      $set: { status: PROPOSAL_STATUS.CANCELLED_BY_THERAPIST, respondedAt: new Date() },
    });
    await expect(
      proposalService.deleteProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
  });

  test('10. atomic claim race: findOneAndUpdate returns null → 409 PROPOSAL_ALREADY_RESPONDED, no notification fired', async () => {
    const spy = jest.spyOn(BookingProposal, 'findOneAndUpdate').mockResolvedValueOnce(null);
    await expect(
      proposalService.deleteProposal(therapistActor, String(proposal._id))
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESPONDED' });
    expect(mockAddJob).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('11. successful delete does NOT enqueue any notification (proposal vanishes silently from patient view)', async () => {
    await proposalService.deleteProposal(therapistActor, String(proposal._id));
    const proposalCalls = mockAddJob.mock.calls.filter(([n, payload]) =>
      n === 'send_notification' && typeof payload.type === 'string' && payload.type.startsWith('proposal_')
    );
    expect(proposalCalls).toHaveLength(0);
    // Stronger: no send_notification calls at all from this operation
    expect(mockAddJob.mock.calls.filter(([n]) => n === 'send_notification')).toHaveLength(0);
  });
});
