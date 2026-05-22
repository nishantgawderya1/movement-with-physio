'use strict';

const errorHandler = require('../errorHandler');
const ApiError = require('../../utils/ApiError');

// Minimal req/res factories — errorHandler is a pure express middleware so
// no DB / HTTP stack is needed. Keeps this suite fast and decoupled.
function makeReq() {
  return {
    correlationId: 'corr-test-123',
    method: 'GET',
    originalUrl: '/test',
  };
}

function makeRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

describe('errorHandler — typed .code forwarding', () => {
  let prevEnv;
  beforeAll(() => { prevEnv = process.env.NODE_ENV; });
  afterAll(() => { process.env.NODE_ENV = prevEnv; });

  test('forwards err.code into response payload when present', () => {
    process.env.NODE_ENV = 'test';
    const err = Object.assign(new Error('Forbidden — not your booking'), {
      statusCode: 403,
      code: 'BOOKING_NOT_PARTICIPANT',
    });
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Forbidden — not your booking',
      correlationId: 'corr-test-123',
      code: 'BOOKING_NOT_PARTICIPANT',
    });
  });

  test('omits code field when err.code is undefined (backward compat for untyped throws)', () => {
    process.env.NODE_ENV = 'test';
    const err = Object.assign(new Error('Booking not found'), { statusCode: 404 });
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(res.body, 'code')).toBe(false);
  });

  test('forwards code from ApiError instances (constructed via { code })', () => {
    process.env.NODE_ENV = 'test';
    const err = new ApiError(404, 'Video call not found', { code: 'CALL_NOT_FOUND' });
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('CALL_NOT_FOUND');
  });

  test('does not forward falsy non-undefined codes (empty string, null are intentional)', () => {
    process.env.NODE_ENV = 'test';
    // Empty string: surfaces (caller chose to set it explicitly)
    const errEmpty = Object.assign(new Error('x'), { statusCode: 400, code: '' });
    const res1 = makeRes();
    errorHandler(errEmpty, makeReq(), res1);
    expect(res1.body.code).toBe('');

    // null: surfaces (explicit reset)
    const errNull = Object.assign(new Error('x'), { statusCode: 400, code: null });
    const res2 = makeRes();
    errorHandler(errNull, makeReq(), res2);
    expect(res2.body.code).toBeNull();
  });
});

describe('ApiError — code option', () => {
  test('constructor accepts and stores code', () => {
    const err = new ApiError(404, 'Not found', { code: 'RESOURCE_NOT_FOUND' });
    expect(err.code).toBe('RESOURCE_NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
  });

  test('omitting code leaves .code undefined (not null)', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.code).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(err, 'code')).toBe(false);
  });

  test('code is enumerable for spread / JSON serialization', () => {
    const err = new ApiError(403, 'denied', { code: 'DENIED' });
    expect(Object.keys(err)).toContain('code');
  });
});
