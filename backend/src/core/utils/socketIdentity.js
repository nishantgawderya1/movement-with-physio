'use strict';

const { LRUCache } = require('lru-cache');
const User = require('../../models/User.model');

/**
 * Bridge between Clerk session identity (socket.data.user.id, set by
 * socketAuthMiddleware) and our Mongo User collection, for the Socket.IO
 * surface. Counterpart to ./resolveMongoUserId for the REST surface.
 *
 * Clerk's verifyToken populates `socket.data.user.id` with the Clerk
 * session ID (e.g. "user_2abc..."), NOT our Mongo `_id`. Authorization
 * checks against Mongo-ObjectId-keyed collections (VideoCall.participants,
 * ChatRoom.participants) need the resolved Mongo ID.
 *
 * Originally lived in chat/index.js as `_socketUserIdCache` /
 * `resolveMongoIdForSocket`; extracted in Phase S Item S3 so the video
 * plugin's new participant gate can share the same cache rather than
 * fragment lookups.
 *
 * Cache is bounded by an LRU with TTL (S-followup-2): 10k entries cap
 * provides ~10x safety over plausible peak concurrent sockets, and the
 * 24h TTL aligns with Clerk session/JWT refresh cadence — defense in
 * depth against stuck entries even after LRU bound, and protection
 * against stale Clerk→Mongo mappings if the underlying User._id ever
 * changes (account merge, soft-delete + recreate).
 */

const MAX_ENTRIES = 10_000;
const TTL_MS = 24 * 60 * 60 * 1000;

const _socketUserIdCache = new LRUCache({ max: MAX_ENTRIES, ttl: TTL_MS });

/**
 * Resolve `socket.data.user.id` (Clerk session ID) → Mongo `User._id`
 * (stringified ObjectId). Cached per-process with LRU bound + 24h TTL.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {Promise<string>} stringified Mongo ObjectId
 * @throws {Error} if no matching Mongo User exists
 */
async function resolveMongoUserIdForSocket(socket) {
  const clerkId = socket.data.user.id;
  let mongoId = _socketUserIdCache.get(clerkId);
  if (mongoId) return mongoId;
  const user = await User.findOne({ clerkId }).select('_id').lean();
  if (!user) throw new Error('User profile not found');
  mongoId = String(user._id);
  _socketUserIdCache.set(clerkId, mongoId);
  return mongoId;
}

/**
 * Drop the cached Clerk → Mongo mapping for a socket. Call from the
 * `disconnect` handler so stale entries don't accumulate. Idempotent
 * on unknown keys.
 *
 * @param {string} clerkId
 */
function forgetSocketIdentity(clerkId) {
  _socketUserIdCache.delete(clerkId);
}

module.exports = {
  resolveMongoUserIdForSocket,
  forgetSocketIdentity,
  // exported for tests / observability only
  _socketUserIdCache,
};
