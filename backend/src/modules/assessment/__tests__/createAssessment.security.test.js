'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const Assessment = require('../../../models/Assessment.model');
const assessmentService = require('../assessment.service');
const { BOOKING_STATUS, MEETING_TYPE } = require('../../../core/utils/constants');

// Defensive — createAssessment doesn't currently enqueue, but the
// established assessment-module test convention mocks the queue.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
}));

describe('createAssessment — therapist relationship gate (S-followup-5)', () => {
  let patientId, therapistA, therapistB, nonTherapistUserId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    patientId = new mongoose.Types.ObjectId();
    therapistA = new mongoose.Types.ObjectId();
    therapistB = new mongoose.Types.ObjectId();
    // Even though the relationship gate doesn't read User docs, name this
    // ObjectId distinctly to signal intent: "an id that, even if it
    // existed as a User, would not have role=therapist." The gate's
    // existence-oracle policy means we never distinguish "not a therapist"
    // from "no booking" — both collapse to NO_THERAPIST_RELATIONSHIP.
    nonTherapistUserId = new mongoose.Types.ObjectId();
  });

  // Helper — seed a booking between patientId and a therapist at a given status.
  async function seedBooking(therapistRef, status) {
    return Booking.create({
      therapistId: therapistRef,
      patientId,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status,
      meetingType: MEETING_TYPE.IN_PERSON,
    });
  }

  test('patient with CONFIRMED booking → 201 with therapistId set', async () => {
    await seedBooking(therapistA, BOOKING_STATUS.CONFIRMED);
    const result = await assessmentService.createAssessment({
      patientId, therapistId: therapistA, bodyParts: ['knee'],
    });
    expect(String(result.patientId)).toBe(String(patientId));
    expect(String(result.therapistId)).toBe(String(therapistA));
    expect(result.status).toBe('in_progress');
  });

  test('patient with COMPLETED booking → 201 with therapistId set', async () => {
    await seedBooking(therapistA, BOOKING_STATUS.COMPLETED);
    const result = await assessmentService.createAssessment({
      patientId, therapistId: therapistA, bodyParts: ['knee'],
    });
    expect(String(result.therapistId)).toBe(String(therapistA));
  });

  test('patient with only PENDING booking → 403 NO_THERAPIST_RELATIONSHIP, no doc created', async () => {
    await seedBooking(therapistA, BOOKING_STATUS.PENDING);
    await expect(assessmentService.createAssessment({
      patientId, therapistId: therapistA, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
    expect(await Assessment.countDocuments({})).toBe(0);
  });

  test('patient with only CANCELLED booking → 403 NO_THERAPIST_RELATIONSHIP, no doc created', async () => {
    await seedBooking(therapistA, BOOKING_STATUS.CANCELLED);
    await expect(assessmentService.createAssessment({
      patientId, therapistId: therapistA, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
    expect(await Assessment.countDocuments({})).toBe(0);
  });

  test('patient with no booking at all → 403 NO_THERAPIST_RELATIONSHIP, no doc created', async () => {
    await expect(assessmentService.createAssessment({
      patientId, therapistId: therapistA, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
    expect(await Assessment.countDocuments({})).toBe(0);
  });

  test('patient cites non-existent therapistId → 403 (collapsed, no existence oracle)', async () => {
    const ghostId = new mongoose.Types.ObjectId();
    await expect(assessmentService.createAssessment({
      patientId, therapistId: ghostId, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
  });

  test('patient cites a non-therapist user id → 403 (no booking-as-therapist relation can exist)', async () => {
    // No booking seeded with nonTherapistUserId as therapistId — even if
    // a User with that id existed and had role=patient, no Booking-as-
    // therapist edge would exist, so the gate fails the same way.
    await expect(assessmentService.createAssessment({
      patientId, therapistId: nonTherapistUserId, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
  });

  test('patient with relationship to therapistA cites therapistB → 403', async () => {
    await seedBooking(therapistA, BOOKING_STATUS.CONFIRMED);
    await expect(assessmentService.createAssessment({
      patientId, therapistId: therapistB, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
    // Regression: the existing CONFIRMED booking with therapistA must
    // not leak as a "yes" for the unrelated therapistB query.
    expect(await Assessment.countDocuments({})).toBe(0);
  });

  test('regression: therapistId omitted → 201 with null (legit unlinked self-assessment)', async () => {
    const result = await assessmentService.createAssessment({
      patientId, therapistId: null, bodyParts: ['knee'],
    });
    expect(result.therapistId).toBeNull();
    expect(result.status).toBe('in_progress');
  });

  test('regression: soft-deleted booking does NOT grant relationship', async () => {
    const booking = await seedBooking(therapistA, BOOKING_STATUS.CONFIRMED);
    booking.isDeleted = true;
    await booking.save();
    await expect(assessmentService.createAssessment({
      patientId, therapistId: therapistA, bodyParts: ['knee'],
    })).rejects.toMatchObject({ statusCode: 403, code: 'NO_THERAPIST_RELATIONSHIP' });
  });
});
