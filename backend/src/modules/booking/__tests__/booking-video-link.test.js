'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking.model');
const User = require('../../../models/User.model');
const VideoCall = require('../../../models/VideoCall.model');
const Assessment = require('../../../models/Assessment.model');
const AssessmentQuestionTemplate = require('../../../models/AssessmentQuestionTemplate.model');
const {
  MEETING_TYPE, ASSESSMENT_MODE, VIDEO_CALL_STATUS, ROLES,
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

describe('createBooking — video vs in-person', () => {
  let patient, therapist;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    mockAddJob.mockClear();
    patient = await User.create({ email: 'p@x.com', role: ROLES.PATIENT, clerkId: 'p_' + Date.now() });
    therapist = await User.create({
      email: 't@x.com', role: ROLES.THERAPIST, clerkId: 't_' + Date.now(),
      isVerified: true, name: 'Dr Th',
    });
    // Seed at least general questions for the snapshot fallback.
    await AssessmentQuestionTemplate.create([
      { bodyPart: 'general', questionId: 'general-001', order: 1, questionText: 'g1', answerType: 'text', isActive: true },
      { bodyPart: 'general', questionId: 'general-002', order: 2, questionText: 'g2', answerType: 'scale', isActive: true },
    ]);
  });

  test('in_person (default) does NOT create VideoCall or Assessment', async () => {
    const result = await bookingService.createBooking({
      therapistId: therapist._id,
      patientId: patient._id,
      slotStart: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
    });
    expect(result.booking.meetingType).toBe(MEETING_TYPE.IN_PERSON);
    expect(result.videoCall).toBeNull();
    expect(result.assessment).toBeNull();
    expect(await VideoCall.countDocuments()).toBe(0);
    expect(await Assessment.countDocuments()).toBe(0);
  });

  test('video creates linked VideoCall + Assessment with snapshotted general questions', async () => {
    const slotStart = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const result = await bookingService.createBooking({
      therapistId: therapist._id,
      patientId: patient._id,
      slotStart,
      timezone: 'Asia/Kolkata',
      meetingType: MEETING_TYPE.VIDEO,
    });

    expect(result.booking.meetingType).toBe(MEETING_TYPE.VIDEO);
    expect(result.videoCall).not.toBeNull();
    expect(result.assessment).not.toBeNull();
    expect(result.videoCall.status).toBe(VIDEO_CALL_STATUS.SCHEDULED);
    expect(result.videoCall.scheduledAt.toISOString()).toBe(new Date(slotStart).toISOString());
    expect(String(result.videoCall.bookingId)).toBe(String(result.booking._id));
    expect(String(result.videoCall.assessmentId)).toBe(String(result.assessment._id));

    expect(result.assessment.mode).toBe(ASSESSMENT_MODE.THERAPIST_DRIVEN);
    expect(result.assessment.status).toBe('pending');
    expect(String(result.assessment.bookingId)).toBe(String(result.booking._id));
    expect(String(result.assessment.videoCallId)).toBe(String(result.videoCall._id));
    // Snapshot — falls back to 'general' because patient has no painLocation
    expect(result.assessment.questions.length).toBe(2);
    expect(result.assessment.questions[0].questionId).toBe('general-001');

    // Booking is back-linked
    const reloaded = await Booking.findById(result.booking._id);
    expect(String(reloaded.videoCallId)).toBe(String(result.videoCall._id));
    expect(String(reloaded.assessmentId)).toBe(String(result.assessment._id));
  });

  test('video booking enqueues VIDEO_CALL_SCHEDULED notification (not legacy BOOKING_CONFIRMED)', async () => {
    await bookingService.createBooking({
      therapistId: therapist._id,
      patientId: patient._id,
      slotStart: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      meetingType: MEETING_TYPE.VIDEO,
    });
    const types = mockAddJob.mock.calls.map((c) => c[1].type);
    expect(types).toContain('video_call_scheduled');
    expect(types).not.toContain('booking_confirmed');
  });
});
