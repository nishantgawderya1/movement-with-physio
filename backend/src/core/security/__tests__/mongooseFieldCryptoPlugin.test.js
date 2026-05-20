'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const { isEncrypted } = require('../fieldCrypto');
const { ROLES } = require('../../utils/constants');

describe('mongooseFieldCryptoPlugin — User.phone', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });
  beforeEach(async () => { await clearDb(); });

  /**
   * Read the raw document directly from the collection, bypassing Mongoose
   * middleware. Lets us assert what actually landed in the DB.
   */
  async function rawUser(clerkId) {
    return User.db.collection('users').findOne({ clerkId });
  }

  test('User.save() encrypts phone before persisting', async () => {
    const u = new User({
      clerkId: 'a1', email: 'a1@x.com', role: ROLES.PATIENT,
      phone: '+919876543210', name: 'A1',
    });
    await u.save();

    const raw = await rawUser('a1');
    expect(raw.phone).not.toBe('+919876543210');
    expect(isEncrypted(raw.phone)).toBe(true);
    expect(raw.phone).toMatch(/^v1:/);
  });

  test('User.findOne() decrypts phone on the returned document', async () => {
    await new User({
      clerkId: 'a2', email: 'a2@x.com', role: ROLES.PATIENT,
      phone: '+919999999999',
    }).save();

    const reloaded = await User.findOne({ clerkId: 'a2' });
    expect(reloaded.phone).toBe('+919999999999');
  });

  test('User.findById() decrypts phone via post-init', async () => {
    const u = new User({
      clerkId: 'a3', email: 'a3@x.com', role: ROLES.PATIENT,
      phone: '+918888888888',
    });
    await u.save();
    const reloaded = await User.findById(u._id);
    expect(reloaded.phone).toBe('+918888888888');
  });

  test('re-saving an already-decrypted document does NOT double-encrypt', async () => {
    const u = new User({
      clerkId: 'a4', email: 'a4@x.com', role: ROLES.PATIENT,
      phone: '+917777777777', name: 'A4',
    });
    await u.save();

    const reloaded = await User.findOne({ clerkId: 'a4' });
    reloaded.name = 'A4-updated';      // touch a different field
    await reloaded.save();              // phone is NOT modified

    const raw = await rawUser('a4');
    // Ciphertext is still a v1 envelope (not v1:...v1:... etc.)
    expect(raw.phone).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(raw.phone.split(':').length).toBe(4);
    // Still decryptable to the original value
    const reloaded2 = await User.findOne({ clerkId: 'a4' });
    expect(reloaded2.phone).toBe('+917777777777');
    expect(reloaded2.name).toBe('A4-updated');
  });

  test('modifying phone and saving re-encrypts with a new IV', async () => {
    const u = new User({
      clerkId: 'a5', email: 'a5@x.com', role: ROLES.PATIENT,
      phone: '+916666666666',
    });
    await u.save();
    const firstCipher = (await rawUser('a5')).phone;

    const reloaded = await User.findOne({ clerkId: 'a5' });
    reloaded.phone = '+915555555555';
    await reloaded.save();

    const raw2 = await rawUser('a5');
    expect(raw2.phone).not.toBe(firstCipher);
    expect(isEncrypted(raw2.phone)).toBe(true);
    const reloaded2 = await User.findOne({ clerkId: 'a5' });
    expect(reloaded2.phone).toBe('+915555555555');
  });

  test('findOneAndUpdate encrypts phone via the update hook', async () => {
    await new User({
      clerkId: 'a6', email: 'a6@x.com', role: ROLES.PATIENT,
    }).save();

    await User.findOneAndUpdate({ clerkId: 'a6' }, { phone: '+914444444444' });

    const raw = await rawUser('a6');
    expect(raw.phone).not.toBe('+914444444444');
    expect(isEncrypted(raw.phone)).toBe(true);
  });

  test('findOneAndUpdate with $set form also encrypts phone', async () => {
    await new User({
      clerkId: 'a7', email: 'a7@x.com', role: ROLES.PATIENT,
    }).save();

    await User.findOneAndUpdate({ clerkId: 'a7' }, { $set: { phone: '+913333333333' } });

    const raw = await rawUser('a7');
    expect(isEncrypted(raw.phone)).toBe(true);
    const reloaded = await User.findOne({ clerkId: 'a7' });
    expect(reloaded.phone).toBe('+913333333333');
  });

  test('User without phone saves and reloads cleanly (null pass-through)', async () => {
    await new User({
      clerkId: 'a8', email: 'a8@x.com', role: ROLES.PATIENT,
    }).save();

    const raw = await rawUser('a8');
    // phone may be absent or null; either way must not be a ciphertext-looking string
    expect(raw.phone == null).toBe(true);
    const reloaded = await User.findOne({ clerkId: 'a8' });
    expect(reloaded.phone == null).toBe(true);
  });
});
