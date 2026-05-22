'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const TrackingSession = require('../../../models/TrackingSession.model');
const assessmentService = require('../assessment.service');
const { ROLES } = require('../../../core/utils/constants');

// Defensive — completeTrackingSession doesn't currently enqueue a job,
// but future PDF/notification hooks landing on tracking completion
// would. Mirror assessment-rbac.test.js pattern.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
}));

describe('completeTrackingSession — patient ownership gate', () => {
  let patientId, otherPatientId, therapistId, adminId, exerciseId;
  let originalExercises;
  let session;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    patientId = new mongoose.Types.ObjectId();
    otherPatientId = new mongoose.Types.ObjectId();
    therapistId = new mongoose.Types.ObjectId();
    adminId = new mongoose.Types.ObjectId();
    exerciseId = new mongoose.Types.ObjectId();

    originalExercises = [
      { exerciseId, completedSets: 3, completedReps: 10, durationSeconds: 60, painBefore: 4, painAfter: 2 },
    ];
    session = await TrackingSession.create({
      patientId,
      therapistId,
      exercises: originalExercises,
      painScoreBefore: 4,
      status: 'in_progress',
    });
  });

  // ── Service-level (6) ────────────────────────────────────────────────

  test('patient completes own session → 200, mutation applied', async () => {
    const newExercises = [
      { exerciseId, completedSets: 5, completedReps: 15, durationSeconds: 120, painBefore: 4, painAfter: 1 },
    ];
    const updated = await assessmentService.completeTrackingSession(
      session._id,
      { exercises: newExercises, painScoreAfter: 2, notes: 'felt good' },
      { mongoId: String(patientId), role: ROLES.PATIENT }
    );
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeInstanceOf(Date);
    expect(updated.painScoreAfter).toBe(2);
    expect(updated.notes).toBe('felt good');
    expect(updated.exercises).toHaveLength(1);
    expect(updated.exercises[0].completedSets).toBe(5);
    expect(updated.exercises[0].completedReps).toBe(15);
  });

  test('different patient → 403 TRACKING_SESSION_PATIENT_ONLY, exercises UNCHANGED (clobber-prevention)', async () => {
    const maliciousExercises = [
      { exerciseId, completedSets: 999, completedReps: 999, durationSeconds: 0, painBefore: 10, painAfter: 0 },
    ];
    await expect(assessmentService.completeTrackingSession(
      session._id,
      { exercises: maliciousExercises, painScoreAfter: 0, notes: 'CLOBBERED' },
      { mongoId: String(otherPatientId), role: ROLES.PATIENT }
    )).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_PATIENT_ONLY' });

    // The whole point of this test: confirm the 403 fires BEFORE the
    // write, not after. If the gate ran post-mutation, victim data
    // would already be destroyed.
    const reloaded = await TrackingSession.findById(session._id).lean();
    expect(reloaded.status).toBe('in_progress');
    expect(reloaded.completedAt).toBeNull();
    expect(reloaded.notes).toBeNull();
    expect(reloaded.painScoreAfter).toBeNull();
    expect(reloaded.exercises).toHaveLength(1);
    expect(reloaded.exercises[0].completedSets).toBe(originalExercises[0].completedSets);
    expect(reloaded.exercises[0].completedReps).toBe(originalExercises[0].completedReps);
    expect(String(reloaded.exercises[0].exerciseId)).toBe(String(exerciseId));
  });

  test('therapist actor → 403 (defense-in-depth, route layer also blocks)', async () => {
    await expect(assessmentService.completeTrackingSession(
      session._id,
      { exercises: [], painScoreAfter: 0, notes: 'forged by therapist' },
      { mongoId: String(therapistId), role: ROLES.THERAPIST }
    )).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_PATIENT_ONLY' });

    const reloaded = await TrackingSession.findById(session._id).lean();
    expect(reloaded.status).toBe('in_progress');
  });

  test('admin actor → 403 on complete (read OK by helper, complete is patient-only)', async () => {
    await expect(assessmentService.completeTrackingSession(
      session._id,
      { exercises: [], painScoreAfter: 0, notes: null },
      { mongoId: String(adminId), role: ROLES.ADMIN }
    )).rejects.toMatchObject({ statusCode: 403, code: 'TRACKING_SESSION_PATIENT_ONLY' });
  });

  test('non-existent sessionId → 404 (precedes auth check)', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(assessmentService.completeTrackingSession(
      fakeId,
      { exercises: [], painScoreAfter: 0, notes: null },
      { mongoId: String(patientId), role: ROLES.PATIENT }
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test('invalid (non-ObjectId) sessionId → CastError propagates', async () => {
    await expect(assessmentService.completeTrackingSession(
      'not-an-objectid',
      { exercises: [], painScoreAfter: 0, notes: null },
      { mongoId: String(patientId), role: ROLES.PATIENT }
    )).rejects.toThrow(); // Mongoose throws CastError; pins down behavior
  });

  // ── Helper-level (3) ─────────────────────────────────────────────────

  test('helper: owner + complete → ok with full scope', () => {
    const r = assessmentService.authorizeTrackingSessionAction(
      { patientId }, { mongoId: String(patientId), role: ROLES.PATIENT }, 'complete'
    );
    expect(r).toEqual({ ok: true, scope: 'full' });
  });

  test('helper: non-owner + complete → 403 TRACKING_SESSION_PATIENT_ONLY', () => {
    expect(() => assessmentService.authorizeTrackingSessionAction(
      { patientId }, { mongoId: String(otherPatientId), role: ROLES.PATIENT }, 'complete'
    )).toThrow(expect.objectContaining({ statusCode: 403, code: 'TRACKING_SESSION_PATIENT_ONLY' }));
  });

  test('helper: admin + complete → 403 TRACKING_SESSION_PATIENT_ONLY', () => {
    expect(() => assessmentService.authorizeTrackingSessionAction(
      { patientId }, { mongoId: String(adminId), role: ROLES.ADMIN }, 'complete'
    )).toThrow(expect.objectContaining({ statusCode: 403, code: 'TRACKING_SESSION_PATIENT_ONLY' }));
  });
});
