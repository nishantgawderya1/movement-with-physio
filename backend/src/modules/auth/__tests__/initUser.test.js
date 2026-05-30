'use strict';

/**
 * Regression tests for auth.service.initUser — the patient/therapist
 * /me/init code path. Specifically covers the E11000 collision-safety
 * added in Bug 1 (signup 500 fix).
 *
 * Strategy: real MongoDB via the shared mongodb-memory-server setup. We
 * drive each case through the real initUser export so the test asserts
 * the behavior actually shipped, not a mocked-out approximation.
 */

const { connect, close, clearDb } = require('../../../../tests/setup');
const User = require('../../../models/User.model');
const { initUser } = require('../auth.service');

/**
 * Minimal authProvider double — initUser only invokes authProvider.getUser
 * to fetch the email/name. We map clerkId → email here and leave firstName/
 * lastName blank so the test asserts the explicit fields, not the fallback.
 */
function fakeAuth(emailByClerkId) {
  return {
    getUser: async (clerkId) => ({
      emailAddresses: emailByClerkId[clerkId]
        ? [{ emailAddress: emailByClerkId[clerkId] }]
        : [],
      firstName: '',
      lastName: '',
    }),
  };
}

describe('auth.service.initUser — collision-safe creation + onboardingCompleted propagation', () => {
  beforeAll(connect);
  afterAll(close);
  afterEach(clearDb);

  test('creates a fresh user with onboardingCompleted:true when caller sends it', async () => {
    const auth = fakeAuth({ clerk_new_1: 'new1@example.com' });
    const { user, isNew } = await initUser({
      clerkId: 'clerk_new_1',
      role: 'patient',
      onboardingCompleted: true,
      authProvider: auth,
    });
    expect(isNew).toBe(true);
    expect(user.email).toBe('new1@example.com');
    expect(user.onboardingCompleted).toBe(true);
  });

  test('omits onboardingCompleted on a fresh user when caller did not send it (default false)', async () => {
    const auth = fakeAuth({ clerk_new_2: 'new2@example.com' });
    const { user, isNew } = await initUser({
      clerkId: 'clerk_new_2',
      role: 'patient',
      authProvider: auth,
    });
    expect(isNew).toBe(true);
    expect(user.onboardingCompleted).toBe(false);
  });

  test('backfills onboardingCompleted on an existing user that was incomplete', async () => {
    await User.create({
      clerkId: 'clerk_x',
      email: 'x@example.com',
      role: 'patient',
    });
    const { user, isNew } = await initUser({
      clerkId: 'clerk_x',
      role: 'patient',
      onboardingCompleted: true,
      authProvider: fakeAuth({}),
    });
    expect(isNew).toBe(false);
    expect(user.onboardingCompleted).toBe(true);
  });

  test('throws 409 USER_EMAIL_TAKEN when email belongs to another live account', async () => {
    await User.create({
      clerkId: 'clerk_old',
      email: 'taken@example.com',
      role: 'patient',
    });
    await expect(
      initUser({
        clerkId: 'clerk_new',
        role: 'patient',
        authProvider: fakeAuth({ clerk_new: 'taken@example.com' }),
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'USER_EMAIL_TAKEN' });
  });

  test('throws 409 USER_EMAIL_TAKEN when email belongs to a soft-deleted account', async () => {
    const old = await User.create({
      clerkId: 'clerk_old2',
      email: 'gone@example.com',
      role: 'patient',
    });
    await old.softDelete();
    await expect(
      initUser({
        clerkId: 'clerk_new2',
        role: 'patient',
        authProvider: fakeAuth({ clerk_new2: 'gone@example.com' }),
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'USER_EMAIL_TAKEN' });
  });

  test('race recovery: clerkId-collision E11000 returns the racing doc as isNew:false', async () => {
    // Simulate the webhook race: a concurrent writer inserts a live User
    // with the same clerkId between initUser's findOne and User.create.
    // We achieve this by spying on User.create — on first invocation, we
    // inject the racing doc via the native collection driver (bypassing
    // Mongoose pre-hooks and validators so it really mimics another
    // process writing concurrently), restore the spy, then forward to the
    // real create — which now hits E11000 on clerkId_1 and exercises the
    // recovery branch in initUser's catch block.
    const realCreate = User.create.bind(User);
    const spy = jest.spyOn(User, 'create').mockImplementation(async (data) => {
      await User.collection.insertOne({
        clerkId: data.clerkId,
        email: 'race-winner@example.com',
        role: 'patient',
        isDeleted: false,
        onboardingCompleted: false,
        isVerified: false,
        availableNow: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      spy.mockRestore();
      return realCreate(data);
    });

    const { user, isNew } = await initUser({
      clerkId: 'clerk_race',
      role: 'patient',
      authProvider: fakeAuth({ clerk_race: 'me@example.com' }),
    });

    expect(isNew).toBe(false);
    expect(user.clerkId).toBe('clerk_race');
    // The racing-doc email wins — the recovery branch returned the doc
    // that existed in the DB, not the one we tried to create.
    expect(user.email).toBe('race-winner@example.com');
  });

  test('rejects when existing account has a different role', async () => {
    await User.create({
      clerkId: 'clerk_rolemix',
      email: 'mix@example.com',
      role: 'therapist',
    });
    await expect(
      initUser({
        clerkId: 'clerk_rolemix',
        role: 'patient',
        authProvider: fakeAuth({ clerk_rolemix: 'mix@example.com' }),
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
