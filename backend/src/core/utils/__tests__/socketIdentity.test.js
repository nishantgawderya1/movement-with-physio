'use strict';

// S-followup-2: socketIdentity cache bounded by LRU + 24h TTL.
// Tests focus on the module's contract (cache hit / miss / evict /
// TTL / null-user safety / idempotency) — NOT on lru-cache library
// internals (eviction-at-bound, LRU recency ordering). lru-cache has
// its own test suite.

// Mock the User model BEFORE requiring the module under test so the
// module's `require('../../../models/User.model')` returns the mock.
const mockFindOneLeanFn = jest.fn();
jest.mock('../../../models/User.model', () => {
  // Mongoose chainable: User.findOne(...).select(...).lean()
  const chain = {
    select: jest.fn().mockReturnThis(),
    lean: (...args) => mockFindOneLeanFn(...args),
  };
  return {
    findOne: jest.fn().mockReturnValue(chain),
  };
});

const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const {
  resolveMongoUserIdForSocket,
  forgetSocketIdentity,
  _socketUserIdCache,
} = require('../socketIdentity');

function makeSocket(clerkId) {
  return { data: { user: { id: clerkId } } };
}

describe('socketIdentity — LRU + TTL bounded cache (S-followup-2)', () => {
  beforeEach(() => {
    _socketUserIdCache.clear();
    User.findOne.mockClear();
    mockFindOneLeanFn.mockReset();
  });

  test('cache hit: second resolveMongoUserIdForSocket call returns cached value without re-querying User', async () => {
    const mongoId = new mongoose.Types.ObjectId();
    mockFindOneLeanFn.mockResolvedValueOnce({ _id: mongoId });
    const socket = makeSocket('clerk_alice');

    const first = await resolveMongoUserIdForSocket(socket);
    const second = await resolveMongoUserIdForSocket(socket);

    expect(first).toBe(String(mongoId));
    expect(second).toBe(String(mongoId));
    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(mockFindOneLeanFn).toHaveBeenCalledTimes(1);
  });

  test('cache miss → DB lookup → cache populated', async () => {
    const mongoId = new mongoose.Types.ObjectId();
    mockFindOneLeanFn.mockResolvedValueOnce({ _id: mongoId });
    const socket = makeSocket('clerk_bob');

    expect(_socketUserIdCache.get('clerk_bob')).toBeUndefined();
    const resolved = await resolveMongoUserIdForSocket(socket);

    expect(resolved).toBe(String(mongoId));
    expect(_socketUserIdCache.get('clerk_bob')).toBe(String(mongoId));
    expect(User.findOne).toHaveBeenCalledWith({ clerkId: 'clerk_bob' });
  });

  test('forgetSocketIdentity evicts entry → next resolve triggers fresh DB call', async () => {
    const mongoId = new mongoose.Types.ObjectId();
    mockFindOneLeanFn.mockResolvedValue({ _id: mongoId });
    const socket = makeSocket('clerk_carol');

    await resolveMongoUserIdForSocket(socket);
    expect(_socketUserIdCache.get('clerk_carol')).toBe(String(mongoId));

    forgetSocketIdentity('clerk_carol');
    expect(_socketUserIdCache.get('clerk_carol')).toBeUndefined();

    await resolveMongoUserIdForSocket(socket);
    expect(User.findOne).toHaveBeenCalledTimes(2);
  });

  test('TTL is configured at 24h on each set entry (config-correctness via getRemainingTTL)', async () => {
    // Verifies the module's contract — the cache is configured with a
    // 24h TTL — without exercising lru-cache's expiration behavior
    // (which is library internals, see Q4 reasoning: tests should
    // assert what the module owns, not what the library guarantees).
    // Tolerance accounts for the small elapsed time between set and
    // assertion.
    const mongoId = new mongoose.Types.ObjectId();
    mockFindOneLeanFn.mockResolvedValueOnce({ _id: mongoId });
    await resolveMongoUserIdForSocket(makeSocket('clerk_dan'));

    const remaining = _socketUserIdCache.getRemainingTTL('clerk_dan');
    const expected = 24 * 60 * 60 * 1000;
    const tolerance = 1000;
    // Two-sided tolerance: lru-cache's perf.now() debounce can let
    // remaining drift slightly above the literal TTL near a set.
    expect(remaining).toBeGreaterThan(expected - tolerance);
    expect(remaining).toBeLessThan(expected + tolerance);
  });

  test('no-profile path: User.findOne returns null → throws AND cache is NOT populated (no-leak regression)', async () => {
    mockFindOneLeanFn.mockResolvedValueOnce(null);
    const socket = makeSocket('clerk_ghost');

    await expect(resolveMongoUserIdForSocket(socket))
      .rejects.toThrow('User profile not found');
    expect(_socketUserIdCache.get('clerk_ghost')).toBeUndefined();
  });

  test('forgetSocketIdentity is idempotent on unknown keys (no throw, no side effect)', () => {
    expect(() => forgetSocketIdentity('clerk_never_existed')).not.toThrow();
    expect(_socketUserIdCache.size).toBe(0);
  });
});
