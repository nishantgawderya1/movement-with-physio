'use strict';

// S-followup-15 (session module): assert .code on every typed throw.
// USER_NOT_FOUND (404) on createNote, SESSION_NOTE_NOT_FOUND (404, fused
// 404+403) on updateNote.

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const Booking = require('../../../models/Booking.model');
const SessionNote = require('../../../models/SessionNote.model');
const { BOOKING_STATUS, MEETING_TYPE, ROLES } = require('../../../core/utils/constants');

const sessionService = require('../session.service')({ notification: null });

describe('session.service — typed error codes (S-followup-15)', () => {
  let therapistClerkId, patientClerkId, bookingId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    therapistClerkId = 'clerk_therapist_1';
    patientClerkId = 'clerk_patient_1';
    const therapist = await User.create({
      email: 't@x.com', clerkId: therapistClerkId, role: ROLES.THERAPIST, isVerified: true,
    });
    const patient = await User.create({
      email: 'p@x.com', clerkId: patientClerkId, role: ROLES.PATIENT,
    });
    const booking = await Booking.create({
      therapistId: therapist._id, patientId: patient._id,
      slotStart: new Date('2026-05-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.COMPLETED,
      meetingType: MEETING_TYPE.IN_PERSON,
    });
    bookingId = booking._id;
  });

  describe('USER_NOT_FOUND (404) on createNote', () => {
    test('unknown therapist clerkId throws typed 404', async () => {
      await expect(sessionService.createNote('unknown_therapist_clerk', {
        bookingId, patientId: patientClerkId, notes: 'x',
      })).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
    });

    test('unknown patient clerkId throws typed 404', async () => {
      await expect(sessionService.createNote(therapistClerkId, {
        bookingId, patientId: 'unknown_patient_clerk', notes: 'x',
      })).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
    });
  });

  describe('SESSION_NOTE_NOT_FOUND (404) on updateNote', () => {
    test('unknown noteId throws typed 404', async () => {
      const fakeNoteId = new mongoose.Types.ObjectId();
      await expect(sessionService.updateNote(fakeNoteId, 'any_therapist', { notes: 'x' }))
        .rejects.toMatchObject({ statusCode: 404, code: 'SESSION_NOTE_NOT_FOUND' });
    });

    test('valid noteId but wrong therapistId returns same typed code (oracle resistance)', async () => {
      // Query is {_id, therapistId}, so a participant-mismatch and a
      // not-found both 404 with the same code — clients can't distinguish.
      const note = await SessionNote.create({
        therapistId: 'real_therapist', patientId: patientClerkId, bookingId,
        notes: 'original',
      });
      await expect(sessionService.updateNote(note._id, 'wrong_therapist', { notes: 'x' }))
        .rejects.toMatchObject({ statusCode: 404, code: 'SESSION_NOTE_NOT_FOUND' });
    });
  });
});
