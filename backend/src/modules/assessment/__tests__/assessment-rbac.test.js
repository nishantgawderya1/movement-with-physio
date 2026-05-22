'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const assessmentService = require('../assessment.service');
const Assessment = require('../../../models/Assessment.model');
const User = require('../../../models/User.model');
const mongoose = require('mongoose');
const { ASSESSMENT_MODE, ROLES } = require('../../../core/utils/constants');

// Mock the job queue so addJob doesn't hit Redis during tests.
jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
}));

describe('assessment RBAC + mode-aware behavior', () => {
  let patientId, therapistId, otherId;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => {
    await clearDb();
    patientId = new mongoose.Types.ObjectId();
    therapistId = new mongoose.Types.ObjectId();
    otherId = new mongoose.Types.ObjectId();
  });

  function makeAssessment(mode, opts = {}) {
    return Assessment.create({
      patientId,
      therapistId,
      bodyParts: ['knee'],
      mode,
      status: opts.status || 'pending',
      questions: [
        { questionId: 'knee-001', questionText: 'Q1', answerType: 'text', options: [] },
        { questionId: 'knee-002', questionText: 'Q2', answerType: 'scale', options: [] },
      ],
      responses: [],
    });
  }

  describe('authorizeAssessmentAction — therapist_driven mode', () => {
    test('therapist gets full scope on read', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      const r = assessmentService.authorizeAssessmentAction(
        a, { mongoId: String(therapistId), role: ROLES.THERAPIST }, 'read'
      );
      expect(r.scope).toBe('full');
    });

    test('patient gets metadata scope on read', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      const r = assessmentService.authorizeAssessmentAction(
        a, { mongoId: String(patientId), role: ROLES.PATIENT }, 'read'
      );
      expect(r.scope).toBe('metadata');
    });

    test('patient gets 403 THERAPIST_ONLY on respond', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      expect(() =>
        assessmentService.authorizeAssessmentAction(
          a, { mongoId: String(patientId), role: ROLES.PATIENT }, 'respond'
        )
      ).toThrow(expect.objectContaining({ statusCode: 403, code: 'THERAPIST_ONLY' }));
    });

    test('patient gets 403 ASSESSMENT_PDF_FORBIDDEN on pdf', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      expect(() =>
        assessmentService.authorizeAssessmentAction(
          a, { mongoId: String(patientId), role: ROLES.PATIENT }, 'pdf'
        )
      ).toThrow(expect.objectContaining({ statusCode: 403, code: 'ASSESSMENT_PDF_FORBIDDEN' }));
    });

    test('unrelated user gets 403 NOT_PARTICIPANT', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      expect(() =>
        assessmentService.authorizeAssessmentAction(
          a, { mongoId: String(otherId), role: ROLES.PATIENT }, 'read'
        )
      ).toThrow(expect.objectContaining({ statusCode: 403, code: 'NOT_PARTICIPANT' }));
    });

    test('admin can read with full scope', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      // Note: admin id doesn't have to match patient/therapist — role grants access.
      const r = assessmentService.authorizeAssessmentAction(
        a, { mongoId: String(otherId), role: ROLES.ADMIN }, 'read'
      );
      expect(r.scope).toBe('full');
    });
  });

  describe('authorizeAssessmentAction — patient_self mode', () => {
    test('patient can read, respond, complete (regression)', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.PATIENT_SELF);
      const actor = { mongoId: String(patientId), role: ROLES.PATIENT };
      expect(assessmentService.authorizeAssessmentAction(a, actor, 'read').scope).toBe('full');
      expect(assessmentService.authorizeAssessmentAction(a, actor, 'respond').scope).toBe('full');
      expect(assessmentService.authorizeAssessmentAction(a, actor, 'complete').scope).toBe('full');
    });

    test('therapist cannot respond to patient_self assessment', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.PATIENT_SELF);
      expect(() =>
        assessmentService.authorizeAssessmentAction(
          a, { mongoId: String(therapistId), role: ROLES.THERAPIST }, 'respond'
        )
      ).toThrow(expect.objectContaining({ statusCode: 403, code: 'PATIENT_ONLY' }));
    });
  });

  describe('toMetadataView', () => {
    test('strips questions/responses', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      const v = assessmentService.toMetadataView(a);
      expect(v.questions).toEqual([]);
      expect(v.responses).toEqual([]);
      expect(v.status).toBe('pending');
      expect(v.mode).toBe(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      expect(v.bodyParts).toEqual(['knee']);
    });
  });

  describe('respondToQuestion validation', () => {
    test('rejects unknown questionId', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      await expect(
        assessmentService.respondToQuestion(a._id, 'bogus-id', 'whatever')
      ).rejects.toMatchObject({ statusCode: 400, code: 'UNKNOWN_QUESTION' });
    });

    test('rejects scale answer outside 0-10', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      await expect(
        assessmentService.respondToQuestion(a._id, 'knee-002', 11)
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ANSWER' });
    });

    test('accepts valid text answer, sets answeredBy, flips status to in_progress', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      const updated = await assessmentService.respondToQuestion(
        a._id, 'knee-001', '3 days', { answeredBy: String(therapistId) }
      );
      expect(updated.status).toBe('in_progress');
      expect(updated.responses).toHaveLength(1);
      expect(updated.responses[0].questionId).toBe('knee-001');
      expect(updated.responses[0].answer).toBe('3 days');
      expect(String(updated.responses[0].answeredBy)).toBe(String(therapistId));
    });

    test('idempotent overwrite — second call replaces, does not duplicate', async () => {
      const a = await makeAssessment(ASSESSMENT_MODE.THERAPIST_DRIVEN);
      await assessmentService.respondToQuestion(a._id, 'knee-001', 'first');
      const updated = await assessmentService.respondToQuestion(a._id, 'knee-001', 'second');
      expect(updated.responses).toHaveLength(1);
      expect(updated.responses[0].answer).toBe('second');
    });
  });
});
