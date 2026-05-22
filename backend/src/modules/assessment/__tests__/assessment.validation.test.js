'use strict';

const schemas = require('../assessment.validation');

// Direct schema validation (not HTTP) — the validate middleware just wraps
// schema.validate with stripUnknown: true and emits 422. These tests
// exercise the validation rules directly so they stay fast and decoupled.
const validateOpts = { abortEarly: false, stripUnknown: true };

function check(schema, body) {
  return schema.validate(body, validateOpts);
}

describe('assessment.validation — createAssessment', () => {
  test('valid: bodyParts only', () => {
    const { error, value } = check(schemas.createAssessment, { bodyParts: ['knee'] });
    expect(error).toBeUndefined();
    expect(value.bodyParts).toEqual(['knee']);
  });

  test('valid: bodyParts + therapistId (ObjectId hex string)', () => {
    const { error, value } = check(schemas.createAssessment, {
      bodyParts: ['knee'],
      therapistId: 'a'.repeat(24),
    });
    expect(error).toBeUndefined();
    expect(value.therapistId).toBe('a'.repeat(24));
  });

  test('valid: therapistId explicitly null is accepted (S-followup-5 contract)', () => {
    const { error } = check(schemas.createAssessment, {
      bodyParts: ['knee'],
      therapistId: null,
    });
    expect(error).toBeUndefined();
  });

  test('reject: empty bodyParts array', () => {
    const { error } = check(schemas.createAssessment, { bodyParts: [] });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/bodyParts.*at least 1/i);
  });

  test('reject: missing bodyParts', () => {
    const { error } = check(schemas.createAssessment, {});
    expect(error).toBeDefined();
    expect(error.message).toMatch(/bodyParts.*required/i);
  });

  test('reject: therapistId is not a valid ObjectId hex string', () => {
    const { error } = check(schemas.createAssessment, {
      bodyParts: ['knee'],
      therapistId: 'not-an-objectid',
    });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/therapistId/);
  });

  test('strip: unknown fields (patientId from req.body is silently dropped — server resolves it)', () => {
    const { error, value } = check(schemas.createAssessment, {
      bodyParts: ['knee'],
      patientId: 'attacker-injected-id',
    });
    expect(error).toBeUndefined();
    expect(value.patientId).toBeUndefined();
  });
});

describe('assessment.validation — respondToQuestion', () => {
  test('valid: string answer', () => {
    const { error } = check(schemas.respondToQuestion, {
      questionId: 'q1',
      answer: 'a textual answer',
    });
    expect(error).toBeUndefined();
  });

  test('valid: number answer (for scale questions)', () => {
    const { error } = check(schemas.respondToQuestion, { questionId: 'q1', answer: 7 });
    expect(error).toBeUndefined();
  });

  test('valid: boolean answer', () => {
    const { error } = check(schemas.respondToQuestion, { questionId: 'q1', answer: true });
    expect(error).toBeUndefined();
  });

  test('valid: array answer (multiselect)', () => {
    const { error } = check(schemas.respondToQuestion, {
      questionId: 'q1',
      answer: ['opt1', 'opt2'],
    });
    expect(error).toBeUndefined();
  });

  test('reject: missing questionId', () => {
    const { error } = check(schemas.respondToQuestion, { answer: 'x' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/questionId.*required/);
  });

  test('reject: missing answer', () => {
    const { error } = check(schemas.respondToQuestion, { questionId: 'q1' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/answer.*required/);
  });

  test('reject: object answer (not in alternatives list)', () => {
    const { error } = check(schemas.respondToQuestion, {
      questionId: 'q1',
      answer: { nested: 'object' },
    });
    expect(error).toBeDefined();
  });

  test('strip: notes field (controller does not consume it)', () => {
    const { value } = check(schemas.respondToQuestion, {
      questionId: 'q1',
      answer: 'x',
      notes: 'ignored',
    });
    expect(value.notes).toBeUndefined();
  });
});

describe('assessment.validation — completeAssessment', () => {
  test('valid: empty body (both fields optional)', () => {
    const { error } = check(schemas.completeAssessment, {});
    expect(error).toBeUndefined();
  });

  test('valid: painScore + notes', () => {
    const { error } = check(schemas.completeAssessment, {
      painScore: 4,
      notes: 'feeling better after PT',
    });
    expect(error).toBeUndefined();
  });

  test('valid: painScore = null (explicit reset)', () => {
    const { error } = check(schemas.completeAssessment, { painScore: null });
    expect(error).toBeUndefined();
  });

  test('reject: painScore out of range (> 10)', () => {
    const { error } = check(schemas.completeAssessment, { painScore: 11 });
    expect(error).toBeDefined();
  });

  test('reject: painScore out of range (negative)', () => {
    const { error } = check(schemas.completeAssessment, { painScore: -1 });
    expect(error).toBeDefined();
  });

  test('reject: notes over 5000 chars', () => {
    const { error } = check(schemas.completeAssessment, { notes: 'x'.repeat(5001) });
    expect(error).toBeDefined();
  });

  test('strip: summary field (was the old broken schema name)', () => {
    const { value } = check(schemas.completeAssessment, { summary: 'ignored' });
    expect(value.summary).toBeUndefined();
  });
});

describe('assessment.validation — createTrackingSession', () => {
  const validHex = 'a'.repeat(24);

  test('valid: empty body (all fields optional, exercises defaults to [])', () => {
    const { error, value } = check(schemas.createTrackingSession, {});
    expect(error).toBeUndefined();
    expect(value.exercises).toEqual([]);
  });

  test('valid: bookingId + assessmentId + exercises + painScoreBefore', () => {
    const { error } = check(schemas.createTrackingSession, {
      bookingId: validHex,
      assessmentId: validHex,
      exercises: [{
        exerciseId: validHex,
        completedSets: 3,
        completedReps: 10,
        durationSeconds: 60,
        painBefore: 5,
        painAfter: 3,
      }],
      painScoreBefore: 5,
    });
    expect(error).toBeUndefined();
  });

  test('reject: bookingId not a valid ObjectId', () => {
    const { error } = check(schemas.createTrackingSession, { bookingId: 'bad-id' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/bookingId/);
  });

  test('reject: exercise without exerciseId', () => {
    const { error } = check(schemas.createTrackingSession, {
      exercises: [{ completedSets: 3 }],
    });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/exerciseId.*required/);
  });

  test('reject: painBefore out of range (>10)', () => {
    const { error } = check(schemas.createTrackingSession, {
      exercises: [{ exerciseId: validHex, painBefore: 15 }],
    });
    expect(error).toBeDefined();
  });

  test('reject: painScoreBefore out of range', () => {
    const { error } = check(schemas.createTrackingSession, { painScoreBefore: 99 });
    expect(error).toBeDefined();
  });

  test('strip: patientId field (server resolves it)', () => {
    const { value } = check(schemas.createTrackingSession, {
      patientId: 'attacker-injected',
    });
    expect(value.patientId).toBeUndefined();
  });

  test('defaults: exercise subdoc numeric fields default to 0', () => {
    const { value } = check(schemas.createTrackingSession, {
      exercises: [{ exerciseId: validHex }],
    });
    expect(value.exercises[0].completedSets).toBe(0);
    expect(value.exercises[0].completedReps).toBe(0);
    expect(value.exercises[0].durationSeconds).toBe(0);
  });
});

describe('assessment.validation — completeTrackingSession', () => {
  const validHex = 'a'.repeat(24);

  test('valid: empty body (exercises defaults to [])', () => {
    const { error, value } = check(schemas.completeTrackingSession, {});
    expect(error).toBeUndefined();
    expect(value.exercises).toEqual([]);
  });

  test('valid: exercises + painScoreAfter + notes', () => {
    const { error } = check(schemas.completeTrackingSession, {
      exercises: [{ exerciseId: validHex, completedSets: 2, painAfter: 4 }],
      painScoreAfter: 4,
      notes: 'completed all sets',
    });
    expect(error).toBeUndefined();
  });

  test('reject: painScoreAfter out of range', () => {
    const { error } = check(schemas.completeTrackingSession, { painScoreAfter: -5 });
    expect(error).toBeDefined();
  });

  test('reject: malformed exercise subdoc', () => {
    const { error } = check(schemas.completeTrackingSession, {
      exercises: [{ exerciseId: 'bad' }],
    });
    expect(error).toBeDefined();
  });
});
