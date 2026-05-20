'use strict';
/**
 * One-shot: creates a video booking from Mock Patient -> Dr Gaurav
 * scheduled for 2 minutes from now, with linked VideoCall + Assessment.
 *
 * Bypasses bookingService.createBooking because that path requires the DI
 * container's cache + queue to be initialized, which only happens in the
 * live backend process. We replicate the data shape directly here.
 *
 * Usage: node scripts/smoke-create-video-booking.js
 */
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');

const PATIENT_ID = '6a0d8a067691d8549cd1a7bb';   // Mock Patient
const THERAPIST_ID = '6a0d87471c1e22ef8c316e2a'; // Dr Gaurav

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Booking = require('../src/models/Booking.model');
    const VideoCall = require('../src/models/VideoCall.model');
    const Assessment = require('../src/models/Assessment.model');
    const AssessmentQuestionTemplate = require('../src/models/AssessmentQuestionTemplate.model');
    const User = require('../src/models/User.model');
    const {
      BOOKING_STATUS, MEETING_TYPE, SCHEDULED_MODE,
      VIDEO_CALL_STATUS, ASSESSMENT_MODE,
    } = require('../src/core/utils/constants');

    const patient = await User.findById(PATIENT_ID).select('painLocation').lean();
    const bodyPart = (patient?.painLocation || 'general').toString().toLowerCase();

    const slotStart = new Date(Date.now() + 10 * 60 * 1000);

    // 1) Booking
    const booking = await Booking.create({
      therapistId: THERAPIST_ID,
      patientId: PATIENT_ID,
      slotStart,
      durationMinutes: 30,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
      notes: 'Smoke test video booking',
      meetingType: MEETING_TYPE.VIDEO,
      scheduledMode: SCHEDULED_MODE.SLOT_BOOKING,
      idempotencyKey: `smoke-${Date.now()}`,
    });

    // 2) VideoCall
    const videoCall = await VideoCall.create({
      participants: [PATIENT_ID, THERAPIST_ID],
      initiatedBy: PATIENT_ID,
      status: VIDEO_CALL_STATUS.SCHEDULED,
      scheduledAt: booking.slotStart,
      bookingId: booking._id,
    });

    // 3) Snapshot question template for the patient's body part
    let templates = await AssessmentQuestionTemplate.find({
      bodyPart, isActive: true,
    }).sort({ order: 1 }).lean();
    if (templates.length === 0) {
      templates = await AssessmentQuestionTemplate.find({
        bodyPart: 'general', isActive: true,
      }).sort({ order: 1 }).lean();
    }

    // 4) Assessment with snapshotted questions
    const assessment = await Assessment.create({
      patientId: PATIENT_ID,
      therapistId: THERAPIST_ID,
      bodyParts: [bodyPart],
      mode: ASSESSMENT_MODE.THERAPIST_DRIVEN,
      bookingId: booking._id,
      videoCallId: videoCall._id,
      status: 'pending',
      questions: templates.map((t) => ({
        questionId: t.questionId,
        questionText: t.questionText,
        answerType: t.answerType,
        options: t.options || [],
      })),
      responses: [],
    });

    // 5) Link back
    booking.videoCallId = videoCall._id;
    booking.assessmentId = assessment._id;
    await booking.save();
    videoCall.assessmentId = assessment._id;
    await videoCall.save();

    console.log('=== SMOKE BOOKING CREATED ===');
    console.log('booking._id:    ', booking._id.toString());
    console.log('videoCall._id:  ', videoCall._id.toString());
    console.log('assessment._id: ', assessment._id.toString());
    console.log('bodyPart used:  ', bodyPart);
    console.log('question count: ', templates.length);
    console.log('slotStart UTC:  ', booking.slotStart.toISOString());
    console.log('canJoin opens:  ', new Date(slotStart.getTime() - 10 * 60 * 1000).toISOString());
    console.log('=============================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('SMOKE BOOKING FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
