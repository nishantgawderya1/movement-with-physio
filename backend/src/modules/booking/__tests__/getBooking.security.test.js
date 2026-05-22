'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const User = require('../../../models/User.model');
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

// Fields the populated 200 response exposes; assert that NONE of these
// leak into the message of a 403 thrown error. Mirrors S6's
// cancellationReason regression assertion (cancelBooking.security.test.js:90).
const LEAKABLE_FIELDS = [
  'patientId',
  'therapistId',
  'notes',
  'cancellationReason',
  'slotStart',
  'videoCallId',
  'assessmentId',
];

function expectNoLeak(err) {
  const msg = String(err && err.message);
  for (const field of LEAKABLE_FIELDS) {
    expect(msg).not.toContain(field);
  }
}

describe('getBooking — 3-role ownership gate', () => {
  let patient, otherPatient, therapist, otherTherapist, adminId;
  let booking;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();

    // Real User documents are required because getBooking returns
    // populated subdocs. Specialty/rating must be non-null so the
    // positive-shape assertions on therapist subdoc pass.
    patient = await User.create({
      clerkId: 'clerk_patient_1', email: 'patient1@example.com', name: 'Patient One',
      role: ROLES.PATIENT,
    });
    otherPatient = await User.create({
      clerkId: 'clerk_patient_2', email: 'patient2@example.com', name: 'Patient Two',
      role: ROLES.PATIENT,
    });
    therapist = await User.create({
      clerkId: 'clerk_therapist_1', email: 'therapist1@example.com', name: 'Therapist One',
      role: ROLES.THERAPIST, specialty: 'Sports Medicine', rating: 4.5, isVerified: true,
    });
    otherTherapist = await User.create({
      clerkId: 'clerk_therapist_2', email: 'therapist2@example.com', name: 'Therapist Two',
      role: ROLES.THERAPIST, specialty: 'Orthopedics', rating: 4.2, isVerified: true,
    });
    adminId = new mongoose.Types.ObjectId();

    booking = await Booking.create({
      therapistId: therapist._id,
      patientId: patient._id,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
      meetingType: MEETING_TYPE.IN_PERSON,
      notes: 'Patient prefers afternoon sessions',
    });
  });

  // Positive shape assertions on populated subdocs (patientId, therapistId)
  // lock in the contract the gate depends on: comparison uses .patientId._id
  // and .therapistId._id, not the raw refs. A future refactor that removes
  // .populate() would 403 every legitimate request silently — these assertions
  // are the early-warning system.
  test('patient reads own booking → 200, populated patient+therapist subdocs', async () => {
    const result = await bookingService.getBooking(
      booking._id,
      { mongoId: String(patient._id), role: ROLES.PATIENT }
    );
    expect(String(result._id)).toBe(String(booking._id));
    expect(result.patientId).toEqual(expect.objectContaining({
      _id: expect.anything(),
      name: expect.any(String),
      email: expect.any(String),
    }));
    expect(String(result.patientId._id)).toBe(String(patient._id));
    expect(result.therapistId).toEqual(expect.objectContaining({
      _id: expect.anything(),
      name: expect.any(String),
      specialty: expect.any(String),
    }));
    expect(String(result.therapistId._id)).toBe(String(therapist._id));
  });

  test('therapist reads own booking → 200, populated patient+therapist subdocs', async () => {
    const result = await bookingService.getBooking(
      booking._id,
      { mongoId: String(therapist._id), role: ROLES.THERAPIST }
    );
    expect(String(result._id)).toBe(String(booking._id));
    expect(result.patientId).toEqual(expect.objectContaining({
      _id: expect.anything(),
      name: expect.any(String),
      email: expect.any(String),
    }));
    expect(String(result.patientId._id)).toBe(String(patient._id));
    expect(result.therapistId).toEqual(expect.objectContaining({
      _id: expect.anything(),
      name: expect.any(String),
      specialty: expect.any(String),
    }));
    expect(String(result.therapistId._id)).toBe(String(therapist._id));
  });

  test('admin reads any booking → 200, populated subdocs (bypass ownership)', async () => {
    const result = await bookingService.getBooking(
      booking._id,
      { mongoId: String(adminId), role: ROLES.ADMIN }
    );
    expect(String(result._id)).toBe(String(booking._id));
    expect(result.patientId).toEqual(expect.objectContaining({
      _id: expect.anything(),
      name: expect.any(String),
      email: expect.any(String),
    }));
    expect(result.therapistId).toEqual(expect.objectContaining({
      _id: expect.anything(),
      name: expect.any(String),
      specialty: expect.any(String),
    }));
  });

  test('patient reads OTHER patient\'s booking → 403 BOOKING_NOT_PARTICIPANT + no-leak regression', async () => {
    let caught;
    try {
      await bookingService.getBooking(
        booking._id,
        { mongoId: String(otherPatient._id), role: ROLES.PATIENT }
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({ statusCode: 403, code: 'BOOKING_NOT_PARTICIPANT' });
    expectNoLeak(caught);
  });

  test('therapist reads OTHER therapist\'s booking → 403 BOOKING_NOT_PARTICIPANT + no-leak regression', async () => {
    let caught;
    try {
      await bookingService.getBooking(
        booking._id,
        { mongoId: String(otherTherapist._id), role: ROLES.THERAPIST }
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({ statusCode: 403, code: 'BOOKING_NOT_PARTICIPANT' });
    expectNoLeak(caught);
  });

  test('non-existent bookingId (valid ObjectId, no doc) → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(bookingService.getBooking(
      fakeId,
      { mongoId: String(patient._id), role: ROLES.PATIENT }
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test('soft-deleted booking → 404 (even for legitimate owner)', async () => {
    // Proves isDeleted: false filter. Tombstoned bookings should not be
    // readable by anyone via this endpoint, consistent with S6's
    // cancel/complete behavior.
    booking.isDeleted = true;
    await booking.save();
    await expect(bookingService.getBooking(
      booking._id,
      { mongoId: String(patient._id), role: ROLES.PATIENT }
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test('invalid (non-ObjectId) bookingId → CastError propagates', async () => {
    await expect(bookingService.getBooking(
      'not-an-objectid',
      { mongoId: String(patient._id), role: ROLES.PATIENT }
    )).rejects.toThrow();
  });

  test('unknown role → 403 BOOKING_GET_ROLE (defense in depth)', async () => {
    // Route-layer rbac already filters to patient/therapist/admin; this
    // service-level fallthrough catches any future caller that bypasses
    // the route layer (cron jobs, internal services, test harnesses).
    await expect(bookingService.getBooking(
      booking._id,
      { mongoId: String(patient._id), role: 'unknown_role' }
    )).rejects.toMatchObject({ statusCode: 403, code: 'BOOKING_GET_ROLE' });
  });
});
