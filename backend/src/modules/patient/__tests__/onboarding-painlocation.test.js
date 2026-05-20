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

  // Encryption rewritten in Phase 3A.1 (AES-GCM helper, Mongoose 8 compatible).
  // This test now exercises the full completeOnboarding flow including phone
  // encryption — proves the pre('findOneAndUpdate') hook on the new plugin
  // both encrypts the phone payload AND post('init') decrypts it on the
  // returned document, while the new painLocation field still persists.
  test('completeOnboarding can include painLocation alongside an encrypted phone', async () => {
    const clerkId = 'pat3_' + Date.now();
    await User.create({
      email: 'pat3@x.com', role: ROLES.PATIENT,
      clerkId, name: 'Pat3',
    });

    const result = await patientService.completeOnboarding(clerkId, {
      name: 'Pat3',
      phone: '+919876543210',
      painLocation: 'shoulder',
    });
    expect(result.painLocation).toBe('shoulder');
    expect(result.onboardingCompleted).toBe(true);
    // The Mongoose doc that completeOnboarding returns should expose the
    // decrypted phone (post('init') fired during findOneAndUpdate's hydration).
    expect(result.phone).toBe('+919876543210');

    // But the raw DB doc should hold ciphertext — proof the pre-update hook
    // encrypted before persistence.
    const raw = await User.db.collection('users').findOne({ clerkId });
    expect(raw.phone).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(raw.phone).not.toBe('+919876543210');
  });
});
