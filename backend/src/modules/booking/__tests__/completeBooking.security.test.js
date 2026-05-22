'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const { BOOKING_STATUS, MEETING_TYPE } = require('../../../core/utils/constants');

// completeBooking doesn't currently touch jobs/redis/cache, but mock
// defensively per the booking module's test convention.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock' }),
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

describe('completeBooking — therapist ownership gate', () => {
  let therapistId, otherTherapistId, patientId;
  let booking;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    therapistId = new mongoose.Types.ObjectId();
    otherTherapistId = new mongoose.Types.ObjectId();
    patientId = new mongoose.Types.ObjectId();

    booking = await Booking.create({
      therapistId,
      patientId,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
      meetingType: MEETING_TYPE.VIDEO,
    });
  });

  test('therapist completes own booking → 200, status=COMPLETED, completedAt set', async () => {
    const result = await bookingService.completeBooking(booking._id, String(therapistId));
    expect(result.status).toBe(BOOKING_STATUS.COMPLETED);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  test('therapist completes OTHER therapist\'s booking → 403 BOOKING_NOT_THERAPIST + booking UNCHANGED (regression)', async () => {
    await expect(bookingService.completeBooking(booking._id, String(otherTherapistId)))
      .rejects.toMatchObject({ statusCode: 403, code: 'BOOKING_NOT_THERAPIST' });

    // Regression: pre-S6 the write was a findByIdAndUpdate so the
    // mutation landed BEFORE any check. Confirm 403 fires before write.
    const reloaded = await Booking.findById(booking._id);
    expect(reloaded.status).toBe(BOOKING_STATUS.CONFIRMED);
    expect(reloaded.completedAt).toBeNull();
  });

  test('non-existent bookingId → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(bookingService.completeBooking(fakeId, String(therapistId)))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('invalid (non-ObjectId) bookingId → CastError propagates', async () => {
    await expect(bookingService.completeBooking('not-an-objectid', String(therapistId)))
      .rejects.toThrow();
  });
});
