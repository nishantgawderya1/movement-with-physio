'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const { BOOKING_STATUS, MEETING_TYPE, ROLES } = require('../../../core/utils/constants');

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

const bookingService = require('../booking.service');

describe('cancelBooking — 3-role ownership gate', () => {
  let patientId, otherPatientId, therapistId, otherTherapistId, adminId;
  let booking;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    patientId = new mongoose.Types.ObjectId();
    otherPatientId = new mongoose.Types.ObjectId();
    therapistId = new mongoose.Types.ObjectId();
    otherTherapistId = new mongoose.Types.ObjectId();
    adminId = new mongoose.Types.ObjectId();

    booking = await Booking.create({
      therapistId,
      patientId,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
      meetingType: MEETING_TYPE.IN_PERSON,
    });
  });

  test('patient cancels own booking → 200, cancelledBy=patient', async () => {
    const result = await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(patientId), role: ROLES.PATIENT },
      'Schedule conflict'
    );
    expect(result.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(result.cancelledBy).toBe(ROLES.PATIENT);
    expect(result.cancellationReason).toBe('Schedule conflict');
    expect(result.cancelledAt).toBeInstanceOf(Date);
    expect(mockAddJob).toHaveBeenCalledWith(
      'send_notification',
      // Forward lock-in for S-followup-6: the notification body MUST be
      // the canonical static string. Any future change that reintroduces
      // user-supplied text into the body string will fail this assertion.
      expect.objectContaining({
        type: 'booking_cancelled',
        body: 'Your booking has been cancelled.',
      })
    );
  });

  test('therapist cancels own booking → 200, cancelledBy=therapist', async () => {
    const result = await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      'Patient request'
    );
    expect(result.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(result.cancelledBy).toBe(ROLES.THERAPIST);
  });

  test('admin cancels any booking → 200, cancelledBy=admin (bypass ownership)', async () => {
    const result = await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(adminId), role: ROLES.ADMIN },
      'Operational'
    );
    expect(result.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(result.cancelledBy).toBe(ROLES.ADMIN);
  });

  test('patient cancels OTHER patient\'s booking → 403 BOOKING_NOT_PARTICIPANT + booking UNCHANGED (regression)', async () => {
    await expect(bookingService.cancelBooking(
      booking._id,
      { mongoId: String(otherPatientId), role: ROLES.PATIENT },
      'You owe me money' // attacker-controlled text MUST NOT persist
    )).rejects.toMatchObject({ statusCode: 403, code: 'BOOKING_NOT_PARTICIPANT' });

    // Regression: confirm 403 fires BEFORE the write. Without this gate,
    // attacker reason text lands in victim record + notification feed.
    const reloaded = await Booking.findById(booking._id);
    expect(reloaded.status).toBe(BOOKING_STATUS.CONFIRMED);
    expect(reloaded.cancellationReason).toBeNull();
    expect(reloaded.cancelledAt).toBeNull();
    expect(reloaded.cancelledBy).toBeNull();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  test('therapist cancels OTHER therapist\'s booking → 403 BOOKING_NOT_PARTICIPANT + booking UNCHANGED', async () => {
    await expect(bookingService.cancelBooking(
      booking._id,
      { mongoId: String(otherTherapistId), role: ROLES.THERAPIST },
      'spoofed cancellation reason'
    )).rejects.toMatchObject({ statusCode: 403, code: 'BOOKING_NOT_PARTICIPANT' });

    const reloaded = await Booking.findById(booking._id);
    expect(reloaded.status).toBe(BOOKING_STATUS.CONFIRMED);
    expect(reloaded.cancellationReason).toBeNull();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  test('non-existent bookingId → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(bookingService.cancelBooking(
      fakeId,
      { mongoId: String(patientId), role: ROLES.PATIENT },
      null
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test('invalid (non-ObjectId) bookingId → CastError propagates', async () => {
    await expect(bookingService.cancelBooking(
      'not-an-objectid',
      { mongoId: String(patientId), role: ROLES.PATIENT },
      null
    )).rejects.toThrow();
  });

  test('already-cancelled booking by valid owner → 400 (existing precondition preserved)', async () => {
    booking.status = BOOKING_STATUS.CANCELLED;
    await booking.save();
    await expect(bookingService.cancelBooking(
      booking._id,
      { mongoId: String(patientId), role: ROLES.PATIENT },
      null
    )).rejects.toMatchObject({ statusCode: 400 });
  });
});

// S-followup-6: legitimate cancelling parties (post-S6 cross-tenant gate)
// could still inject URL/social-engineering text into the OTHER party's
// notification feed via the `reason` field, which flowed into the FCM
// push body verbatim. Body is now the canonical static string regardless
// of caller-supplied reason. Storage of reason on Booking doc is
// preserved for admin diagnostic + future UX (out of scope per S6).
describe('cancelBooking — notification body injection (S-followup-6)', () => {
  let patientId, therapistId;
  let booking;

  // Sibling describe — lifecycle hooks don't cascade from the outer
  // describe's beforeAll/afterAll, so re-establish connection here.
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    // Same fixture shape as the outer describe, but isolated state per
    // test for assertion clarity on the single send_notification call.
    await clearDb();
    mockAddJob.mockClear();
    patientId = new mongoose.Types.ObjectId();
    therapistId = new mongoose.Types.ObjectId();
    booking = await Booking.create({
      therapistId,
      patientId,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
      meetingType: MEETING_TYPE.IN_PERSON,
    });
  });

  function getCancelNotification() {
    const call = mockAddJob.mock.calls.find(([name]) => name === 'send_notification');
    expect(call).toBeTruthy();
    return call[1];
  }

  test('benign reason → body is canonical, reason NOT echoed in body', async () => {
    await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      'Patient requested reschedule'
    );
    const payload = getCancelNotification();
    expect(payload.body).toBe('Your booking has been cancelled.');
    expect(payload.body).not.toContain('Patient requested reschedule');
  });

  test('<script> reason → body is canonical (no echo, no markup leak)', async () => {
    await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      '<script>alert(1)</script>'
    );
    const payload = getCancelNotification();
    expect(payload.body).toBe('Your booking has been cancelled.');
    expect(payload.body).not.toMatch(/<script>/i);
  });

  test('URL phishing reason → body is canonical (no URL echo — primary attack vector)', async () => {
    await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      'Visit bit.ly/scam for refund'
    );
    const payload = getCancelNotification();
    expect(payload.body).toBe('Your booking has been cancelled.');
    expect(payload.body).not.toMatch(/bit\.ly/);
  });

  test('null reason → body is canonical (null-branch regression — pre-fix this was the only safe path)', async () => {
    await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      null
    );
    const payload = getCancelNotification();
    expect(payload.body).toBe('Your booking has been cancelled.');
  });

  test('notification.data carries bookingId only — NO reason pass-through to future renderer', async () => {
    await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      'phishing payload'
    );
    const payload = getCancelNotification();
    expect(payload.data).toEqual({ bookingId: String(booking._id) });
    expect(payload.data.reason).toBeUndefined();
  });

  test('reason still persisted verbatim on Booking doc (storage out of scope for S-followup-6)', async () => {
    const reason = '<script>x</script> bit.ly/phish';
    const result = await bookingService.cancelBooking(
      booking._id,
      { mongoId: String(therapistId), role: ROLES.THERAPIST },
      reason
    );
    expect(result.cancellationReason).toBe(reason);
    // Re-confirm via DB round-trip — proves the storage path is unchanged.
    const reloaded = await Booking.findById(booking._id);
    expect(reloaded.cancellationReason).toBe(reason);
  });
});
