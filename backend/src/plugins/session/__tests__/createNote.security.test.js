'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const Booking = require('../../../models/Booking.model');
const SessionNote = require('../../../models/SessionNote.model');
const { BOOKING_STATUS, ROLES } = require('../../../core/utils/constants');

// Mock the job queue so addJob doesn't hit Redis during tests.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
}));

// createNote uses container.notification only when patient.fcmToken is set.
// Fixtures below omit fcmToken, so the push branch short-circuits — null is
// safe.
const sessionService = require('../session.service')({ notification: null });

describe('session createNote — therapist-patient relationship gate', () => {
  let alice, bob, charlie, dave, aliceCharlieBooking;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();

    alice = await User.create({
      clerkId: 'clerk_alice', email: 'alice@example.com', name: 'Alice', role: ROLES.THERAPIST,
    });
    bob = await User.create({
      clerkId: 'clerk_bob', email: 'bob@example.com', name: 'Bob', role: ROLES.THERAPIST,
    });
    charlie = await User.create({
      clerkId: 'clerk_charlie', email: 'charlie@example.com', name: 'Charlie', role: ROLES.PATIENT,
    });
    dave = await User.create({
      clerkId: 'clerk_dave', email: 'dave@example.com', name: 'Dave', role: ROLES.PATIENT,
    });

    aliceCharlieBooking = await Booking.create({
      therapistId: alice._id,
      patientId: charlie._id,
      slotStart: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      status: BOOKING_STATUS.CONFIRMED,
    });
  });

  test('legitimate therapist + patient with confirmed booking succeeds', async () => {
    const note = await sessionService.createNote(alice.clerkId, {
      bookingId: aliceCharlieBooking._id,
      patientId: charlie.clerkId,
      notes: 'Session went well, prescribed follow-up exercises.',
    });
    expect(note).toBeTruthy();
    expect(String(note.therapistId)).toBe(alice.clerkId);
    expect(String(note.patientId)).toBe(charlie.clerkId);

    const count = await SessionNote.countDocuments();
    expect(count).toBe(1);
  });

  test('therapist without relationship to claimed patient → 403, no note', async () => {
    // alice has no booking with dave
    await expect(
      sessionService.createNote(alice.clerkId, {
        bookingId: aliceCharlieBooking._id, // her own booking, but wrong patient
        patientId: dave.clerkId,
        notes: 'Spoofed note targeting dave.',
      })
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });

    expect(await SessionNote.countDocuments()).toBe(0);
  });

  test('unrelated therapist attempting to note via valid patient → 403, no note', async () => {
    // bob has no booking at all; charlie has alice as her therapist
    await expect(
      sessionService.createNote(bob.clerkId, {
        bookingId: aliceCharlieBooking._id, // not bob's booking
        patientId: charlie.clerkId,
        notes: 'Bob impersonating alice writing notes for charlie.',
      })
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });

    expect(await SessionNote.countDocuments()).toBe(0);
  });

  test('valid therapist-patient pair but wrong bookingId → 403, no note', async () => {
    // Random bookingId that doesn't exist — bookingId-scope gate catches it
    const randomBookingId = new mongoose.Types.ObjectId();
    await expect(
      sessionService.createNote(alice.clerkId, {
        bookingId: randomBookingId,
        patientId: charlie.clerkId,
        notes: 'Valid pair but unknown booking.',
      })
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });

    expect(await SessionNote.countDocuments()).toBe(0);
  });
});
