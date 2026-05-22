'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const Assessment = require('../../../models/Assessment.model');
const TrackingSession = require('../../../models/TrackingSession.model');
const assessmentService = require('../assessment.service');
const { BOOKING_STATUS, MEETING_TYPE } = require('../../../core/utils/constants');

// Defensive — convention across the assessment module tests.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
}));

describe('createTrackingSession — cross-link ownership gates (S-followup-4)', () => {
  let patient, otherPatient, therapist;
  let ownBooking, ownAssessment, othersBooking, othersAssessment;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    patient = new mongoose.Types.ObjectId();
    otherPatient = new mongoose.Types.ObjectId();
    therapist = new mongoose.Types.ObjectId();

    ownBooking = await Booking.create({
      therapistId: therapist, patientId: patient,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    ownAssessment = await Assessment.create({
      patientId: patient, therapistId: therapist,
      bodyParts: ['knee'], questions: [], status: 'in_progress',
    });
    othersBooking = await Booking.create({
      therapistId: therapist, patientId: otherPatient,
      slotStart: new Date('2026-06-02T10:00:00Z'),
      durationMinutes: 60, timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED, meetingType: MEETING_TYPE.IN_PERSON,
    });
    othersAssessment = await Assessment.create({
      patientId: otherPatient, therapistId: therapist,
      bodyParts: ['knee'], questions: [], status: 'in_progress',
    });
  });

  test('legitimate patient creates with own bookingId + own assessmentId → 201', async () => {
    const session = await assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: ownBooking._id,
      assessmentId: ownAssessment._id,
      exercises: [],
      painScoreBefore: 3,
    });
    expect(String(session.patientId)).toBe(String(patient));
    expect(String(session.bookingId)).toBe(String(ownBooking._id));
    expect(String(session.assessmentId)).toBe(String(ownAssessment._id));
    expect(session.status).toBe('in_progress');
  });

  test('legitimate patient creates with null bookingId + own assessmentId → 201 (booking gate skipped)', async () => {
    const session = await assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: null,
      assessmentId: ownAssessment._id,
      exercises: [],
    });
    expect(session.bookingId).toBeNull();
    expect(String(session.assessmentId)).toBe(String(ownAssessment._id));
  });

  test('legitimate patient creates with own bookingId + null assessmentId → 201 (assessment gate skipped)', async () => {
    const session = await assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: ownBooking._id,
      assessmentId: null,
      exercises: [],
    });
    expect(String(session.bookingId)).toBe(String(ownBooking._id));
    expect(session.assessmentId).toBeNull();
  });

  test('legitimate patient creates with both null → 201 (legacy unlinked shape preserved)', async () => {
    const session = await assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: null,
      assessmentId: null,
      exercises: [],
    });
    expect(session.bookingId).toBeNull();
    expect(session.assessmentId).toBeNull();
  });

  test('bookingId belongs to other patient → 403 TRACKING_SESSION_BOOKING_NOT_OWNED + no doc created', async () => {
    await expect(assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: othersBooking._id,
      assessmentId: ownAssessment._id,
      exercises: [],
    })).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_BOOKING_NOT_OWNED' });
    expect(await TrackingSession.countDocuments({})).toBe(0);
  });

  test('assessmentId belongs to other patient → 403 TRACKING_SESSION_ASSESSMENT_NOT_OWNED + no doc created', async () => {
    // Own bookingId is valid; assessmentId belongs to another patient.
    // Proves each gate validates independently — booking pass doesn't
    // short-circuit to skip the assessment check.
    await expect(assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: ownBooking._id,
      assessmentId: othersAssessment._id,
      exercises: [],
    })).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_ASSESSMENT_NOT_OWNED' });
    expect(await TrackingSession.countDocuments({})).toBe(0);
  });

  test('non-existent bookingId → 403 TRACKING_SESSION_BOOKING_NOT_OWNED (existence-oracle policy)', async () => {
    const ghostId = new mongoose.Types.ObjectId();
    await expect(assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: ghostId,
      assessmentId: ownAssessment._id,
      exercises: [],
    })).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_BOOKING_NOT_OWNED' });
  });

  test('non-existent assessmentId → 403 TRACKING_SESSION_ASSESSMENT_NOT_OWNED (existence-oracle policy)', async () => {
    const ghostId = new mongoose.Types.ObjectId();
    await expect(assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: ownBooking._id,
      assessmentId: ghostId,
      exercises: [],
    })).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_ASSESSMENT_NOT_OWNED' });
  });

  test('soft-deleted own bookingId → 403 (isDeleted: false filter regression)', async () => {
    ownBooking.isDeleted = true;
    await ownBooking.save();
    await expect(assessmentService.createTrackingSession({
      patientId: patient,
      bookingId: ownBooking._id,
      assessmentId: ownAssessment._id,
      exercises: [],
    })).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_BOOKING_NOT_OWNED' });
  });
});
