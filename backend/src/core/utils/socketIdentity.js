'use strict';

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
 * TODO(infra): the cache is currently unbounded — only cleared on
 * `disconnect`. Practical bound ≈ max concurrent sockets, but a long-
 * running process under churn could leak. Replace with a bounded LRU
 * (e.g. lru-cache) as a separate item; not blocking for S3.
 */

/** @type {Map<string, string>} */
const _socketUserIdCache = new Map();

/**
 * Resolve `socket.data.user.id` (Clerk session ID) → Mongo `User._id`
 * (stringified ObjectId). Cached per-process for the lifetime of the
 * socket connection.
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
 * `disconnect` handler so stale entries don't accumulate.
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
