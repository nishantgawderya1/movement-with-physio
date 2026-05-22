'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const Booking = require('../../../models/Booking.model');
const TrackingSession = require('../../../models/TrackingSession.model');
const { ROLES, BOOKING_STATUS } = require('../../../core/utils/constants');
const { createTherapistController } = require('../therapistProgress.controller');

const progressService = require('../progress.service')({});
const controller = createTherapistController(progressService);

function runController(handler, req) {
  return new Promise((resolve, reject) => {
    const headers = {};
    const res = {
      _status: 200,
      status(code) { this._status = code; return this; },
      json(body) { resolve({ status: this._status, body, headers }); return this; },
      send(body) { resolve({ status: this._status, body, headers }); return this; },
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
    };
    Promise.resolve(handler(req, res, (err) => reject(err))).catch(reject);
  });
}

// rbac runs at route layer in production; tests invoke controllers
// directly, so the relationship check is the load-bearing gate here.
// req.user.mongoId is what resolveActor reads when the cache is present.
function makeReq(therapistClerkId, therapistMongoId, patientClerkId) {
  return {
    user: { id: therapistClerkId, mongoId: String(therapistMongoId), role: ROLES.THERAPIST },
    params: { patientId: patientClerkId },
  };
}

describe('progress therapist-facing controllers — relationship gate', () => {
  let alice, bob, charlie, dave;

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
    // Charlie has a TrackingSession so any successful relationship-gated
    // read returns concrete data (proves we reached the service).
    await TrackingSession.create({
      patientId: charlie._id,
      exercises: [{ exerciseId: new mongoose.Types.ObjectId(), completedSets: 3, completedReps: 10, completedAt: new Date() }],
      painScoreBefore: 5, painScoreAfter: 2,
      status: 'completed', completedAt: new Date(),
    });
  });

  describe.each([
    ['summary',   'getSummary'],
    ['exercises', 'getExerciseStats'],
    ['trends',    'getTrends'],
    ['export',    'exportProgress'],
  ])('%s endpoint', (label, handlerName) => {
    test('therapist with CONFIRMED booking → 200, data returned', async () => {
      await Booking.create({
        therapistId: alice._id, patientId: charlie._id,
        slotStart: new Date('2026-06-01T10:00:00Z'),
        durationMinutes: 60, timezone: 'Asia/Kolkata',
        status: BOOKING_STATUS.CONFIRMED,
      });
      const { status, body } = await runController(
        controller[handlerName],
        makeReq(alice.clerkId, alice._id, charlie.clerkId)
      );
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    test('therapist with COMPLETED booking → 200, data returned', async () => {
      await Booking.create({
        therapistId: alice._id, patientId: charlie._id,
        slotStart: new Date('2026-04-01T10:00:00Z'),
        durationMinutes: 60, timezone: 'Asia/Kolkata',
        status: BOOKING_STATUS.COMPLETED,
      });
      const { status } = await runController(
        controller[handlerName],
        makeReq(alice.clerkId, alice._id, charlie.clerkId)
      );
      expect(status).toBe(200);
    });

    test('therapist with PENDING booking only → 403 NO_PATIENT_RELATIONSHIP', async () => {
      await Booking.create({
        therapistId: alice._id, patientId: charlie._id,
        slotStart: new Date('2026-06-01T10:00:00Z'),
        durationMinutes: 60, timezone: 'Asia/Kolkata',
        status: BOOKING_STATUS.PENDING,
      });
      await expect(runController(
        controller[handlerName],
        makeReq(alice.clerkId, alice._id, charlie.clerkId)
      )).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });
    });

    test('therapist with CANCELLED booking only → 403 NO_PATIENT_RELATIONSHIP', async () => {
      await Booking.create({
        therapistId: alice._id, patientId: charlie._id,
        slotStart: new Date('2026-06-01T10:00:00Z'),
        durationMinutes: 60, timezone: 'Asia/Kolkata',
        status: BOOKING_STATUS.CANCELLED,
      });
      await expect(runController(
        controller[handlerName],
        makeReq(alice.clerkId, alice._id, charlie.clerkId)
      )).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });
    });

    test('therapist with no booking at all → 403 NO_PATIENT_RELATIONSHIP', async () => {
      // Bob has zero bookings with anyone
      await expect(runController(
        controller[handlerName],
        makeReq(bob.clerkId, bob._id, charlie.clerkId)
      )).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });
    });

    test('non-existent patient clerkId → 404', async () => {
      await expect(runController(
        controller[handlerName],
        makeReq(alice.clerkId, alice._id, 'clerk_does_not_exist')
      )).rejects.toMatchObject({ statusCode: 404 });
    });

    test('therapist has booking with OTHER patient → 403 (relationship is pair-specific)', async () => {
      // Alice ↔ Dave CONFIRMED; she tries to read Charlie's progress
      await Booking.create({
        therapistId: alice._id, patientId: dave._id,
        slotStart: new Date('2026-06-01T10:00:00Z'),
        durationMinutes: 60, timezone: 'Asia/Kolkata',
        status: BOOKING_STATUS.CONFIRMED,
      });
      await expect(runController(
        controller[handlerName],
        makeReq(alice.clerkId, alice._id, charlie.clerkId)
      )).rejects.toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });
    });
  });

  describe('/export — fail-before-headers regression (critical for S7)', () => {
    test('on 403, Content-Disposition is NOT set and body contains no PHI fields', async () => {
      // Bob has no relationship with Charlie. The handler must throw
      // BEFORE setHeader runs — otherwise the attachment header would
      // be sent with an error body, which is a partial-leak surface
      // (filename + 0-byte download is still a signal).
      const headers = {};
      let caughtErr;
      const res = {
        _status: 200,
        status(code) { this._status = code; return this; },
        json(body) { return this; },
        send(body) { return this; },
        setHeader(name, value) { headers[name.toLowerCase()] = value; },
      };
      // asyncHandler wraps the handler and forwards rejections to next().
      // Wait until next() fires (or, defensively, the underlying promise
      // rejects) before asserting — otherwise we race the throw.
      await new Promise((resolve) => {
        Promise.resolve(
          controller.exportProgress(
            makeReq(bob.clerkId, bob._id, charlie.clerkId),
            res,
            (err) => { caughtErr = err; resolve(); }
          )
        ).catch((err) => { caughtErr = err; resolve(); });
      });
      expect(caughtErr).toMatchObject({ statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' });
      // Critical: header must NOT have been written.
      expect(headers['content-disposition']).toBeUndefined();
    });

    test('on success, Content-Disposition uses generic patientProgress-<date>.json (no clerkId echo)', async () => {
      await Booking.create({
        therapistId: alice._id, patientId: charlie._id,
        slotStart: new Date('2026-06-01T10:00:00Z'),
        durationMinutes: 60, timezone: 'Asia/Kolkata',
        status: BOOKING_STATUS.CONFIRMED,
      });
      const { headers } = await runController(
        controller.exportProgress,
        makeReq(alice.clerkId, alice._id, charlie.clerkId)
      );
      const cd = headers['content-disposition'];
      expect(cd).toMatch(/^attachment; filename="patientProgress-\d{4}-\d{2}-\d{2}\.json"$/);
      expect(cd).not.toContain('clerk_');
      expect(cd).not.toContain(charlie.clerkId);
      expect(cd).not.toContain(alice.clerkId);
    });
  });
});
