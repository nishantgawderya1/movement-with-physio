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
      expect.objectContaining({ type: 'booking_cancelled' })
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
