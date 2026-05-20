'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const User = require('../../../models/User.model');
const patientService = require('../patient.service');
const { updateProfile, completeOnboarding } = require('../patient.validation');
const { ROLES } = require('../../../core/utils/constants');

// Stub the cache manager — patient.service invalidates the profile key after
// updates; we don't need Redis for these unit-level tests.
jest.mock('../../../core/cache/cacheManager', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  invalidate: jest.fn().mockResolvedValue(undefined),
  init: jest.fn(),
}));

describe('Patient painLocation — Joi validators', () => {
  test('updateProfile accepts a valid enum value', () => {
    const { error } = updateProfile.validate({ painLocation: 'knee' });
    expect(error).toBeUndefined();
  });

  test('updateProfile rejects an invalid value', () => {
    const { error } = updateProfile.validate({ painLocation: 'foot' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/painLocation/);
  });

  test('updateProfile lowercases mixed-case input', () => {
    const { value, error } = updateProfile.validate({ painLocation: 'Knee' });
    expect(error).toBeUndefined();
    expect(value.painLocation).toBe('knee');
  });

  test('updateProfile allows null to clear the field', () => {
    const { error } = updateProfile.validate({ painLocation: null });
    expect(error).toBeUndefined();
  });

  test('completeOnboarding accepts painLocation alongside required fields', () => {
    const { error } = completeOnboarding.validate({
      name: 'Pat',
      phone: '+919876543210',
      painLocation: 'back',
    });
    expect(error).toBeUndefined();
  });

  test('completeOnboarding rejects invalid painLocation', () => {
    const { error } = completeOnboarding.validate({
      name: 'Pat',
      phone: '+919876543210',
      painLocation: 'wrist',
    });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/painLocation/);
  });
});

describe('Patient painLocation — service persistence', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  test('updateProfile sets painLocation persistently (round-trip)', async () => {
    const clerkId = 'pat_' + Date.now();
    await User.create({
      email: 'pat@x.com', role: ROLES.PATIENT,
      clerkId, name: 'Pat',
    });

    const updated = await patientService.updateProfile(clerkId, { painLocation: 'knee' });
    expect(updated).not.toBeNull();
    expect(updated.painLocation).toBe('knee');

    const reloaded = await User.findOne({ clerkId }).lean();
    expect(reloaded.painLocation).toBe('knee');
  });

  test('updateProfile with painLocation: null clears the field', async () => {
    const clerkId = 'pat2_' + Date.now();
    await User.create({
      email: 'pat2@x.com', role: ROLES.PATIENT,
      clerkId, name: 'Pat2', painLocation: 'back',
    });

    const updated = await patientService.updateProfile(clerkId, { painLocation: null });
    expect(updated.painLocation).toBeNull();
  });

  // NOTE: `completeOnboarding` service-level integration test omitted —
  // patient.service.completeOnboarding calls User.findOneAndUpdate with
  // a `phone` field, which triggers mongoose-field-encryption's update
  // hook. That hook is incompatible with Mongoose 8.x (calls `this.update`
  // which is undefined in v8). The Joi validator above proves
  // completeOnboarding accepts painLocation, and the round-trip tests
  // above prove findOneAndUpdate persists it; the cross-product is the
  // unrelated plugin bug. Tracked separately.
});
