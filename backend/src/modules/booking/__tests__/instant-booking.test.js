'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const User = require('../../../models/User.model');
const AssessmentQuestionTemplate = require('../../../models/AssessmentQuestionTemplate.model');
const {
  BOOKING_STATUS, MEETING_TYPE, SCHEDULED_MODE, ROLES,
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

const bookingService = require('../booking.service');

async function seedQuestions() {
  await AssessmentQuestionTemplate.create([
    { bodyPart: 'general', questionId: 'general-001', order: 1, questionText: 'g1', answerType: 'text', isActive: true },
    { bodyPart: 'general', questionId: 'general-002', order: 2, questionText: 'g2', answerType: 'scale', isActive: true },
  ]);
}

describe('createInstantBooking', () => {
  let patient, therapist, patient2;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    patient = await User.create({ email: 'p@x.com', role: ROLES.PATIENT, clerkId: 'p_' + Date.now() });
    patient2 = await User.create({ email: 'p2@x.com', role: ROLES.PATIENT, clerkId: 'p2_' + Date.now() });
    therapist = await User.create({
      email: 't@x.com', role: ROLES.THERAPIST, clerkId: 't_' + Date.now(),
      isVerified: true, availableNow: true, availableNowSince: new Date(),
    });
    await seedQuestions();
  });

  test('rejects without prior relationship → 403 NO_PRIOR_RELATIONSHIP', async () => {
    await expect(
      bookingService.createInstantBooking({
        therapistId: therapist._id, patientId: patient._id, instantDelayMinutes: 15,
      })
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_PRIOR_RELATIONSHIP' });
  });

  test('rejects when therapist not available → 409 THERAPIST_NOT_AVAILABLE', async () => {
    therapist.availableNow = false;
    await therapist.save();
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2025-01-01'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    await expect(
      bookingService.createInstantBooking({
        therapistId: therapist._id, patientId: patient._id, instantDelayMinutes: 15,
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'THERAPIST_NOT_AVAILABLE' });
  });

  test('rejects when patient already has pending instant → 409 INSTANT_ALREADY_PENDING', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2025-01-01'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
    });
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date(Date.now() + 15 * 60 * 1000), durationMinutes: 30,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.INSTANT_PENDING,
      meetingType: MEETING_TYPE.VIDEO, scheduledMode: SCHEDULED_MODE.INSTANT,
      instantRequestedAt: new Date(),
      instantExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await expect(
      bookingService.createInstantBooking({
        therapistId: therapist._id, patientId: patient._id, instantDelayMinutes: 15,
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'INSTANT_ALREADY_PENDING' });
  });

  test('rejects invalid delay → 400 INVALID_DELAY', async () => {
    await expect(
      bookingService.createInstantBooking({
        therapistId: therapist._id, patientId: patient._id, instantDelayMinutes: 7,
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DELAY' });
  });

  test('happy path: creates instant_pending booking, enqueues notification', async () => {
    await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2025-01-01'), durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
    });
    const { booking } = await bookingService.createInstantBooking({
      therapistId: therapist._id, patientId: patient._id, instantDelayMinutes: 30,
    });
    expect(booking.status).toBe(BOOKING_STATUS.INSTANT_PENDING);
    expect(booking.meetingType).toBe(MEETING_TYPE.VIDEO);
    expect(booking.scheduledMode).toBe(SCHEDULED_MODE.INSTANT);
    expect(booking.instantDelayMinutes).toBe(30);
    expect(booking.instantExpiresAt).toBeInstanceOf(Date);
    // Notification job for the therapist
    expect(mockAddJob).toHaveBeenCalledWith(
      'send_notification',
      expect.objectContaining({
        userId: therapist._id,
        type: 'video_call_requested',
      })
    );
  });
});
