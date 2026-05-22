'use strict';

// S-followup-15 (assessment module): assert .code on every 404 throw +
// .code on every controller-direct apiResponse.error 404. Combines
// service-layer integration tests (real mongo) with apiResponse unit
// tests for the extended 5th-param signature.

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const apiResponse = require('../../../core/utils/apiResponse');

jest.mock('../../../core/jobs/jobQueue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock' }),
}));

const assessmentService = require('../assessment.service');

describe('apiResponse.error — typed code 5th param', () => {
  function makeRes() {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
  }

  test('forwards code into response payload when 5th param present', () => {
    const res = makeRes();
    apiResponse.error(res, 'Assessment not found', 404, 'corr-1', 'ASSESSMENT_NOT_FOUND');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: 'Assessment not found',
      correlationId: 'corr-1',
      code: 'ASSESSMENT_NOT_FOUND',
    });
  });

  test('omits code field when 5th param absent (backward compat for ~28 existing callers)', () => {
    const res = makeRes();
    apiResponse.error(res, 'Some error', 500, 'corr-2');
    expect(res.body.code).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(res.body, 'code')).toBe(false);
  });

  test('omits code when 5th param is empty string (no false-positive code field)', () => {
    const res = makeRes();
    apiResponse.error(res, 'Some error', 400, 'corr-3', '');
    expect(res.body.code).toBeUndefined();
  });
});

describe('assessment.service — typed 404 codes (S-followup-15)', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  const fakeId = new mongoose.Types.ObjectId();
  const actor = (role = 'patient') => ({
    mongoId: String(new mongoose.Types.ObjectId()), role,
  });

  test('respondToQuestion with unknown assessmentId throws typed 404 ASSESSMENT_NOT_FOUND', async () => {
    await expect(assessmentService.respondToQuestion(fakeId, 'q1', 'answer'))
      .rejects.toMatchObject({ statusCode: 404, code: 'ASSESSMENT_NOT_FOUND' });
  });

  test('completeAssessment with unknown assessmentId throws typed 404 ASSESSMENT_NOT_FOUND', async () => {
    await expect(assessmentService.completeAssessment(fakeId, { painScore: 5, notes: 'x' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'ASSESSMENT_NOT_FOUND' });
  });

  test('completeTrackingSession with unknown sessionId throws typed 404 TRACKING_SESSION_NOT_FOUND', async () => {
    await expect(assessmentService.completeTrackingSession(
      fakeId,
      { exercises: [], painScoreAfter: 3, notes: 'x' },
      actor('patient')
    )).rejects.toMatchObject({ statusCode: 404, code: 'TRACKING_SESSION_NOT_FOUND' });
  });

  // The second TRACKING_SESSION_NOT_FOUND throw is the race-tolerant path
  // (read found doc, then findByIdAndUpdate returned null because it was
  // deleted between read and write). Hard to trigger deterministically
  // without forking the service; verified via static grep at
  // assessment.service.js:484 (commit diff).
});
