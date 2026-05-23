'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
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
const { listProposalsSchema } = require('../proposal.validation');

function futureDate(hoursAhead = 12) {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
}
function pastDate(hoursAgo = 1) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}

async function seedProposal(overrides = {}) {
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

describe('proposal.service.listProposals — role scoping + filters + pagination', () => {
  let therapist, otherTherapist, patient, otherPatient, admin;
  let patientActor, therapistActor, adminActor;

  beforeAll(async () => {
    await connect();
    await BookingProposal.init();
  });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    therapist = await User.create({ clerkId: 't_' + Date.now(), email: 'dr@x.com', name: 'A', role: ROLES.THERAPIST });
    otherTherapist = await User.create({ clerkId: 'ot_' + Date.now(), email: 'dr2@x.com', name: 'B', role: ROLES.THERAPIST });
    patient = await User.create({ clerkId: 'p_' + Date.now(), email: 'p@x.com', name: 'P', role: ROLES.PATIENT });
    otherPatient = await User.create({ clerkId: 'op_' + Date.now(), email: 'p2@x.com', name: 'P2', role: ROLES.PATIENT });
    admin = await User.create({ clerkId: 'a_' + Date.now(), email: 'a@x.com', name: 'Admin', role: ROLES.ADMIN });
    patientActor = { mongoId: String(patient._id), role: ROLES.PATIENT };
    therapistActor = { mongoId: String(therapist._id), role: ROLES.THERAPIST };
    adminActor = { mongoId: String(admin._id), role: ROLES.ADMIN };
  });

  // ── Patient view ────────────────────────────────────────────────────
  test('1. patient sees own pending non-expired proposals', async () => {
    const p = await seedProposal({ therapistId: therapist._id, patientId: patient._id });
    const result = await proposalService.listProposals(patientActor, {});
    expect(result.data).toHaveLength(1);
    expect(String(result.data[0]._id)).toBe(String(p._id));
  });

  test('2. patient does NOT see own declined proposals', async () => {
    await seedProposal({
      therapistId: therapist._id, patientId: patient._id,
      status: PROPOSAL_STATUS.DECLINED, respondedAt: new Date(),
    });
    const result = await proposalService.listProposals(patientActor, {});
    expect(result.data).toHaveLength(0);
  });

  test('3. patient does NOT see own expired proposals', async () => {
    await seedProposal({
      therapistId: therapist._id, patientId: patient._id,
      expiresAt: pastDate(1),
    });
    const result = await proposalService.listProposals(patientActor, {});
    expect(result.data).toHaveLength(0);
  });

  test('4. patient does NOT see other patients\' proposals (scoping by patientId)', async () => {
    await seedProposal({ therapistId: therapist._id, patientId: otherPatient._id });
    const result = await proposalService.listProposals(patientActor, {});
    expect(result.data).toHaveLength(0);
  });

  // ── Therapist view ──────────────────────────────────────────────────
  test('5. therapist sees own pending proposals', async () => {
    const p = await seedProposal({ therapistId: therapist._id, patientId: patient._id });
    const result = await proposalService.listProposals(therapistActor, {});
    expect(result.data).toHaveLength(1);
    expect(String(result.data[0]._id)).toBe(String(p._id));
  });

  test('6. therapist sees own declined-within-24h proposals', async () => {
    const recentDecline = await seedProposal({
      therapistId: therapist._id, patientId: patient._id,
      status: PROPOSAL_STATUS.DECLINED,
      respondedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6h ago
    });
    const result = await proposalService.listProposals(therapistActor, {});
    expect(result.data.some((p) => String(p._id) === String(recentDecline._id))).toBe(true);
  });

  test('7. therapist does NOT see own declined-older-than-24h proposals', async () => {
    await seedProposal({
      therapistId: therapist._id, patientId: patient._id,
      status: PROPOSAL_STATUS.DECLINED,
      respondedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
    });
    const result = await proposalService.listProposals(therapistActor, {});
    expect(result.data).toHaveLength(0);
  });

  test('8. therapist does NOT see own accepted proposals (those live in /bookings list)', async () => {
    await seedProposal({
      therapistId: therapist._id, patientId: patient._id,
      status: PROPOSAL_STATUS.ACCEPTED, respondedAt: new Date(),
    });
    const result = await proposalService.listProposals(therapistActor, {});
    expect(result.data).toHaveLength(0);
  });

  test('9. therapist does NOT see other therapists\' proposals', async () => {
    await seedProposal({ therapistId: otherTherapist._id, patientId: patient._id });
    const result = await proposalService.listProposals(therapistActor, {});
    expect(result.data).toHaveLength(0);
  });

  // ── Admin view ──────────────────────────────────────────────────────
  test('10. admin sees all proposals (no scoping)', async () => {
    await seedProposal({ therapistId: therapist._id, patientId: patient._id });
    await seedProposal({ therapistId: otherTherapist._id, patientId: otherPatient._id });
    await seedProposal({
      therapistId: therapist._id, patientId: otherPatient._id,
      status: PROPOSAL_STATUS.ACCEPTED, respondedAt: new Date(),
    });
    const result = await proposalService.listProposals(adminActor, {});
    expect(result.data).toHaveLength(3);
  });

  test('11. unknown role → 403 PROPOSAL_GET_ROLE', async () => {
    const weirdActor = { mongoId: String(patient._id), role: 'unknown_role' };
    await expect(
      proposalService.listProposals(weirdActor, {})
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROPOSAL_GET_ROLE' });
  });

  // ── Filtering ──────────────────────────────────────────────────────
  test('12. ?status=pending filter applied for patient and therapist', async () => {
    const p = await seedProposal({ therapistId: therapist._id, patientId: patient._id });
    const patientResult = await proposalService.listProposals(patientActor, { status: 'pending' });
    expect(patientResult.data).toHaveLength(1);
    expect(String(patientResult.data[0]._id)).toBe(String(p._id));

    const therapistResult = await proposalService.listProposals(therapistActor, { status: 'pending' });
    expect(therapistResult.data).toHaveLength(1);
  });

  test('13. ?status=declined as patient → empty (patient view never includes declined)', async () => {
    await seedProposal({
      therapistId: therapist._id, patientId: patient._id,
      status: PROPOSAL_STATUS.DECLINED, respondedAt: new Date(),
    });
    const result = await proposalService.listProposals(patientActor, { status: 'declined' });
    expect(result.data).toHaveLength(0);
  });

  test('14. Joi rejects: ?status=invalid_status', () => {
    const { error } = listProposalsSchema.validate({ status: 'invalid_status' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/status/i);
  });

  // ── Pagination ─────────────────────────────────────────────────────
  test('15. limit defaults to 20 when not provided (Joi default applied)', () => {
    const { error, value } = listProposalsSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.limit).toBe(20);
  });

  test('16. limit=50 accepted; limit=51 rejected; limit=0 rejected', () => {
    expect(listProposalsSchema.validate({ limit: 50 }).error).toBeUndefined();
    expect(listProposalsSchema.validate({ limit: 51 }).error).toBeDefined();
    expect(listProposalsSchema.validate({ limit: 0 }).error).toBeDefined();
  });
});
