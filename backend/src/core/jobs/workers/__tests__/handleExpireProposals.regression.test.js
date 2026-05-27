'use strict';

const { connect, close, clearDb } = require('../../../../../tests/setup');
const mongoose = require('mongoose');
const BookingProposal = require('../../../../models/BookingProposal.model');
const {
  MEETING_TYPE, PROPOSAL_STATUS, NOTIFICATION_TYPES,
} = require('../../../utils/constants');

const mockAddJob = jest.fn().mockResolvedValue({ id: 'mock' });
jest.mock('../../jobQueue', () => ({
  addJob: (...args) => mockAddJob(...args),
  getQueue: jest.fn(),
}));

const { handleExpireProposals, BATCH_LIMIT } = require('../proposalWorker');

function pastDate(hoursAgo = 1) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}
function futureDate(hoursAhead = 12) {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
}

async function seed(overrides = {}) {
  return BookingProposal.create({
    therapistId: overrides.therapistId || new mongoose.Types.ObjectId(),
    patientId: overrides.patientId || new mongoose.Types.ObjectId(),
    slotStart: overrides.slotStart || futureDate(48),
    durationMinutes: 60,
    timezone: 'Asia/Kolkata',
    meetingType: MEETING_TYPE.IN_PERSON,
    status: overrides.status || PROPOSAL_STATUS.PENDING,
    respondedAt: overrides.respondedAt ?? null,
    expiresAt: overrides.expiresAt || pastDate(2), // default: already expired
  });
}

describe('handleExpireProposals — sweep filter correctness', () => {
  beforeAll(async () => {
    await connect();
    await BookingProposal.init();
  });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
  });

  test('1. no pending-expired proposals → handler returns { expired: 0 }, no enqueue', async () => {
    const result = await handleExpireProposals();
    expect(result).toEqual({ expired: 0 });
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  test('2. one pending+expired proposal → status flipped, respondedAt set, 2 notifications enqueued (patient + therapist)', async () => {
    const therapistId = new mongoose.Types.ObjectId();
    const patientId = new mongoose.Types.ObjectId();
    const p = await seed({ therapistId, patientId, expiresAt: pastDate(2) });

    const result = await handleExpireProposals();
    expect(result.expired).toBe(1);

    const reloaded = await BookingProposal.findById(p._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.EXPIRED);
    expect(reloaded.respondedAt).toBeInstanceOf(Date);

    const calls = mockAddJob.mock.calls.filter(([n]) => n === 'send_notification');
    expect(calls).toHaveLength(2);
    const userIds = calls.map(([, payload]) => payload.userId).sort();
    expect(userIds).toEqual([String(patientId), String(therapistId)].sort());
    for (const [, payload] of calls) {
      expect(payload.type).toBe(NOTIFICATION_TYPES.PROPOSAL_EXPIRED);
      expect(payload.data.proposalId).toBe(String(p._id));
      // No category — informational push, no action buttons
      expect(payload.category).toBeUndefined();
    }
  });

  test('3. five expired proposals → all flipped, 10 notifications enqueued', async () => {
    for (let i = 0; i < 5; i++) {
      await seed({ expiresAt: pastDate(2) });
    }
    const result = await handleExpireProposals();
    expect(result.expired).toBe(5);
    const calls = mockAddJob.mock.calls.filter(([n]) => n === 'send_notification');
    expect(calls).toHaveLength(10); // 5 patient + 5 therapist
  });

  test('4. pending proposal with expiresAt in FUTURE → NOT flipped', async () => {
    const p = await seed({ expiresAt: futureDate(12), status: PROPOSAL_STATUS.PENDING });
    const result = await handleExpireProposals();
    expect(result.expired).toBe(0);
    const reloaded = await BookingProposal.findById(p._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.PENDING);
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  test('5. ACCEPTED proposal (clock-expired) → NOT flipped (status filter excludes)', async () => {
    const p = await seed({
      status: PROPOSAL_STATUS.ACCEPTED,
      respondedAt: pastDate(3),
      expiresAt: pastDate(2),
    });
    const result = await handleExpireProposals();
    expect(result.expired).toBe(0);
    const reloaded = await BookingProposal.findById(p._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.ACCEPTED);
  });

  test('6. DECLINED proposal (clock-expired) → NOT flipped', async () => {
    const p = await seed({
      status: PROPOSAL_STATUS.DECLINED,
      respondedAt: pastDate(3),
      expiresAt: pastDate(2),
    });
    const result = await handleExpireProposals();
    expect(result.expired).toBe(0);
    const reloaded = await BookingProposal.findById(p._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.DECLINED);
  });

  test('7. CANCELLED_BY_THERAPIST proposal (clock-expired) → NOT flipped', async () => {
    const p = await seed({
      status: PROPOSAL_STATUS.CANCELLED_BY_THERAPIST,
      respondedAt: pastDate(3),
      expiresAt: pastDate(2),
    });
    const result = await handleExpireProposals();
    expect(result.expired).toBe(0);
    const reloaded = await BookingProposal.findById(p._id).lean();
    expect(reloaded.status).toBe(PROPOSAL_STATUS.CANCELLED_BY_THERAPIST);
  });

  test('8. soft-deleted proposal (isDeleted=true) → NOT flipped', async () => {
    const p = await seed({ expiresAt: pastDate(2) });
    // Bypass softDeletePlugin pre-hook for the manual flip below; updateOne
    // doesn't filter on isDeleted so we can directly set the flag.
    await BookingProposal.collection.updateOne(
      { _id: p._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    const result = await handleExpireProposals();
    expect(result.expired).toBe(0);
    const raw = await BookingProposal.collection.findOne({ _id: p._id });
    expect(raw.status).toBe(PROPOSAL_STATUS.PENDING); // unchanged
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  test('9. atomic claim race: findOneAndUpdate returns null for one row → that row skipped, no notifications, others continue', async () => {
    const target = await seed({ expiresAt: pastDate(2) });
    const other = await seed({ expiresAt: pastDate(2) });

    // mockImplementationOnce only intercepts the first call — that hits
    // `target` (find returns docs in insertion order). The second
    // findOneAndUpdate (for `other`) falls through to the real method.
    const originalFOAU = BookingProposal.findOneAndUpdate;
    let callCount = 0;
    const spy = jest.spyOn(BookingProposal, 'findOneAndUpdate').mockImplementation((...args) => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve(null); // race lost
      return originalFOAU.apply(BookingProposal, args);
    });

    const result = await handleExpireProposals();
    expect(result.expired).toBe(1); // only `other` flipped
    const targetReloaded = await BookingProposal.findById(target._id).lean();
    expect(targetReloaded.status).toBe(PROPOSAL_STATUS.PENDING); // race-lost row stays
    const otherReloaded = await BookingProposal.findById(other._id).lean();
    expect(otherReloaded.status).toBe(PROPOSAL_STATUS.EXPIRED);

    // Only `other` triggers notifications — 2 calls (patient + therapist)
    const calls = mockAddJob.mock.calls.filter(([n]) => n === 'send_notification');
    expect(calls).toHaveLength(2);
    for (const [, payload] of calls) {
      expect(payload.data.proposalId).toBe(String(other._id));
    }

    spy.mockRestore();
  });

  test('10. per-row error isolation: addJob throws on one proposal → handler logs and continues to remaining rows', async () => {
    const p1 = await seed({ expiresAt: pastDate(2) });
    const p2 = await seed({ expiresAt: pastDate(2) });

    // addJob throws on the very first call (notification for p1.patient)
    // then succeeds for everything else. Verifies the try/catch wraps a
    // whole row's work — including its addJobs — so p2 still processes.
    mockAddJob.mockReset();
    mockAddJob
      .mockRejectedValueOnce(new Error('Redis down'))
      .mockResolvedValue({ id: 'mock' });

    const result = await handleExpireProposals();
    // p1's atomic claim succeeded BEFORE the addJob threw, so it counts
    // as expired (status flipped). p2 processes normally.
    expect(result.expired).toBe(2);
    const p1Reloaded = await BookingProposal.findById(p1._id).lean();
    const p2Reloaded = await BookingProposal.findById(p2._id).lean();
    expect(p1Reloaded.status).toBe(PROPOSAL_STATUS.EXPIRED);
    expect(p2Reloaded.status).toBe(PROPOSAL_STATUS.EXPIRED);

    // p2 generated 2 notifications (patient + therapist); p1 attempted 1
    // before throwing. Total mockAddJob calls: 1 (p1 fail) + 2 (p2 ok) = 3.
    expect(mockAddJob).toHaveBeenCalledTimes(3);
  });

  test('11. batch cap: 105 expired proposals exist → only BATCH_LIMIT (100) processed per tick', async () => {
    expect(BATCH_LIMIT).toBe(100);
    // Bulk insert to keep the test fast — schema validation OK since we
    // hit every required field. 105 docs, all expired and pending.
    const docs = Array.from({ length: 105 }, () => ({
      therapistId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      slotStart: futureDate(48),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      meetingType: MEETING_TYPE.IN_PERSON,
      status: PROPOSAL_STATUS.PENDING,
      expiresAt: pastDate(2),
    }));
    await BookingProposal.insertMany(docs);

    const result = await handleExpireProposals();
    expect(result.expired).toBe(BATCH_LIMIT); // 100, not 105

    const remainingPending = await BookingProposal.countDocuments({
      status: PROPOSAL_STATUS.PENDING,
    });
    expect(remainingPending).toBe(5); // 105 - 100 = 5 left for next tick
  });
});
