/**
 * chatService.js — Real backend implementation for MWP Patient chat.
 *
 * Talks to:
 *   REST     /api/v1/chat/*  (Clerk Bearer auth)
 *   Socket   /chat namespace (Clerk auth in handshake)
 *
 * Exports the same method surface as the previous mock so MessagesScreen and
 * ChatRoomScreen need no signature changes. Backend message/room shapes are
 * normalized to the UI's existing contract (senderRole, isOnline, etc.).
 *
 * Conversation shape (returned to UI):
 *   { roomId, therapistId, therapistName, therapistAvatar, lastMessage,
 *     lastMessageTime, unreadCount, isOnline }
 *
 * Normalized message shape (returned to UI):
 *   { id, roomId, senderId, senderRole: 'patient'|'therapist', text,
 *     timestamp, status: 'sent'|'delivered'|'read', replyTo, sequenceNumber }
 */

import { apiClient } from '../lib/apiClient';
import { chatSocket } from '../lib/chatSocket';
import { tokenProvider } from '../lib/tokenProvider';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Identify the "other" participant in a direct chat for the patient view.
 * Falls back to the first participant when myId is unknown.
 *
 * `participants` may arrive in TWO shapes depending on the producing endpoint:
 *   - GET /chat/rooms          → populated User docs (objects with `_id`)
 *   - POST /chat/rooms (new)   → raw ObjectId strings (NOT populated)
 * Both forms are handled — `idOf` normalizes the comparison.
 *
 * TODO(backend): make POST /chat/rooms `.populate('participants')` to match
 * the GET shape. Once that lands, this dual-shape handling + the matching
 * defensive branch in `normalizeRoom` below can be removed.
 *
 * @param {Array} participants - populated User docs OR raw ObjectId strings
 * @param {string|null} myId
 * @returns {object|string|null}
 */
function pickTherapist(participants, myId) {
  if (!Array.isArray(participants) || participants.length === 0) return null;
  function idOf(p) {
    if (!p) return null;
    if (typeof p === 'object') return p._id;
    return p;
  }
  if (myId) {
    var other = participants.find(function (p) {
      var pid = idOf(p);
      return pid && String(pid) !== String(myId);
    });
    if (other) return other;
  }
  return participants[0];
}

/**
 * Map a backend ChatRoom into the UI's Conversation shape.
 *
 * Tolerates both `pickTherapist` return shapes (populated user object OR
 * raw ObjectId string) — see TODO above re: backend POST /chat/rooms
 * populate symmetry.
 *
 * @param {object} room
 * @param {string|null} myId
 * @returns {object|null}
 */
function normalizeRoom(room, myId) {
  if (!room) return null;
  var therapist = pickTherapist(room.participants, myId);
  var isObj = therapist && typeof therapist === 'object';
  return {
    roomId: String(room._id),
    therapistId: isObj ? String(therapist._id || '') : (therapist ? String(therapist) : ''),
    therapistName: isObj ? (therapist.name || therapist.email || 'Therapist') : 'Therapist',
    therapistAvatar: isObj && therapist.avatarUrl ? therapist.avatarUrl : null,
    lastMessage: room.lastMessage && room.lastMessage.text ? room.lastMessage.text : '',
    lastMessageTime: room.lastMessage && room.lastMessage.sentAt
      ? room.lastMessage.sentAt
      : room.updatedAt || new Date().toISOString(),
    unreadCount: 0, // backend doesn't expose this yet; recomputed client-side as messages arrive
    isOnline: false, // presence not yet wired — leave false until backend supports it
  };
}

/**
 * Map a backend Message into the UI's normalized shape.
 * @param {object} m
 * @param {string|null} myId
 * @returns {object}
 */
function normalizeMessage(m, myId) {
  // sender can be a string id (raw insert) or a populated user object
  var senderObj = (m && m.sender && typeof m.sender === 'object') ? m.sender : null;
  var senderId = senderObj ? String(senderObj._id) : (m && m.sender ? String(m.sender) : '');
  var isMine = !!(myId && senderId && senderId === String(myId));

  // Read receipt status:
  //   readBy contains any non-sender? → 'read'
  //   otherwise treat persisted messages as 'delivered'
  var status = 'delivered';
  if (Array.isArray(m && m.readBy)) {
    var seenByOther = m.readBy.some(function (r) {
      return r && r.userId && String(r.userId) !== senderId;
    });
    if (seenByOther) status = 'read';
  }

  return {
    id: String(m._id || m.id),
    roomId: String(m.roomId),
    senderId: senderId,
    senderRole: isMine ? 'patient' : 'therapist',
    text: m.text || '',
    timestamp: m.createdAt || m.timestamp || new Date().toISOString(),
    status: status,
    replyTo: m.replyTo || null,
    sequenceNumber: typeof m.sequenceNumber === 'number' ? m.sequenceNumber : 0,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the patient's conversation list.
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
async function getConversations() {
  var res = await apiClient.get('/chat/rooms');
  if (!res.success) return { success: false, error: res.error };
  var myId = tokenProvider.getMyUserId();
  var rooms = Array.isArray(res.data) ? res.data : [];
  return {
    success: true,
    data: rooms.map(function (r) { return normalizeRoom(r, myId); }).filter(Boolean),
  };
}

/**
 * Fetch paginated message history for a room.
 * Backend uses sequence-number pagination; we expose `afterSeq` directly but
 * also accept the older { page, limit } shape for back-compat.
 *
 * @param {string} roomId
 * @param {{ afterSeq?: number, limit?: number, page?: number }} [options]
 * @returns {Promise<{ success: boolean, data?: { messages: Array, hasMore: boolean }, error?: string }>}
 */
async function getMessages(roomId, options) {
  var opts = options || {};
  var limit = opts.limit || 50;
  var afterSeq = typeof opts.afterSeq === 'number' ? opts.afterSeq : 0;

  var res = await apiClient.get('/chat/rooms/' + roomId + '/messages', {
    afterSeq: afterSeq,
    limit: limit,
  });
  if (!res.success) return { success: false, error: res.error };

  var myId = tokenProvider.getMyUserId();
  var raw = Array.isArray(res.data) ? res.data : [];
  var normalized = raw.map(function (m) { return normalizeMessage(m, myId); });

  // UI uses an inverted FlatList — newest first.
  normalized.sort(function (a, b) { return b.sequenceNumber - a.sequenceNumber; });

  return {
    success: true,
    data: {
      messages: normalized,
      hasMore: normalized.length === limit,
      total: normalized.length,
    },
  };
}

/**
 * Send a message in a room. Uses REST for guaranteed persistence; the socket
 * delivers the resulting message to other participants automatically.
 *
 * @param {string} roomId
 * @param {string} text
 * @param {{ id: string, text: string } | null} [replyTo]
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function sendMessage(roomId, text, replyTo) {
  var body = { text: text };
  if (replyTo) body.replyTo = replyTo;

  var res = await apiClient.post('/chat/rooms/' + roomId + '/messages', body);
  if (!res.success) return { success: false, error: res.error };

  var myId = tokenProvider.getMyUserId();
  return { success: true, data: normalizeMessage(res.data, myId) };
}

/**
 * Mark all messages in a room as read.
 * @param {string} roomId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function markAsRead(roomId /*, messageId */) {
  var res = await apiClient.post('/chat/rooms/' + roomId + '/read', {});
  if (!res.success) return { success: false, error: res.error };
  // Also notify peers in real-time when socket is up.
  chatSocket.emit('mark_read', { roomId: roomId });
  return { success: true };
}

/**
 * Create (or look up) a direct room with a given therapist.
 * @param {string} therapistUserId
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function createRoom(therapistUserId) {
  var res = await apiClient.post('/chat/rooms', { participantIds: [therapistUserId] });
  if (!res.success) return { success: false, error: res.error };
  var myId = tokenProvider.getMyUserId();
  return { success: true, data: normalizeRoom(res.data, myId) };
}

/**
 * List therapists the patient can start a chat with. Falls back to the full
 * verified list while the booking-aware "my therapists" endpoint doesn't
 * exist yet — includeUnverified=true matches Book tab's behavior so the
 * picker is never empty in dev.
 * @returns {Promise<{ success: boolean, data?: Array<{ id, name, email, specialty }>, error?: string }>}
 */
async function listAvailableTherapists() {
  var res = await apiClient.get('/therapists', { limit: 50, includeUnverified: true });
  if (!res.success) return { success: false, error: res.error };
  var raw = res.data && Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  return {
    success: true,
    data: raw.map(function (t) {
      return {
        id: String(t._id),
        name: t.name || t.email || 'Therapist',
        email: t.email || '',
        specialty: t.specialty || '',
      };
    }),
  };
}

// ── Real-time subscription helpers ─────────────────────────────────────────

/**
 * Subscribe to live events for a room. Returns an unsubscribe function that
 * detaches every listener registered here.
 *
 * Callbacks receive normalized payloads where appropriate.
 *
 * @param {string} roomId
 * @param {{
 *   onMessage?: (msg: object) => void,
 *   onTyping?: (info: { userId: string, isTyping: boolean }) => void,
 *   onReadBy?: (info: { userId: string }) => void,
 * }} handlers
 * @returns {() => void}
 */
function subscribeToRoom(roomId, handlers) {
  var unsubs = [];

  // Ensure the socket is alive — connect() is idempotent.
  chatSocket.connect().then(function () {
    chatSocket.emit('join_room', { roomId: roomId });
  });

  if (handlers && handlers.onMessage) {
    var msgHandler = function (msg) {
      // Backend emits the raw Message — normalize for the UI.
      if (!msg || String(msg.roomId) !== String(roomId)) return;
      var myId = tokenProvider.getMyUserId();
      handlers.onMessage(normalizeMessage(msg, myId));
    };
    unsubs.push(chatSocket.on('new_message', msgHandler));
  }

  if (handlers && handlers.onTyping) {
    var typingHandler = function (info) {
      if (!info || String(info.roomId) !== String(roomId)) return;
      var myId = tokenProvider.getMyUserId();
      // Ignore our own typing echoes.
      if (myId && String(info.userId) === String(myId)) return;
      handlers.onTyping({ userId: String(info.userId), isTyping: !!info.isTyping });
    };
    unsubs.push(chatSocket.on('typing', typingHandler));
  }

  if (handlers && handlers.onReadBy) {
    var readHandler = function (info) {
      if (!info || String(info.roomId) !== String(roomId)) return;
      handlers.onReadBy({ userId: String(info.userId) });
    };
    unsubs.push(chatSocket.on('read_by', readHandler));
  }

  return function () {
    unsubs.forEach(function (u) { try { u(); } catch (e) {} });
  };
}

/**
 * Emit a typing indicator for the current user.
 * @param {string} roomId
 * @param {boolean} isTyping
 */
function setTyping(roomId, isTyping) {
  chatSocket.emit('typing', { roomId: roomId, isTyping: !!isTyping });
}

/**
 * Legacy mock kept for compatibility — typing now arrives via socket events,
 * so this resolves to a steady "not typing" reply. ChatRoomScreen has been
 * updated to subscribe via subscribeToRoom() instead of polling.
 * @returns {Promise<{ success: boolean, data: { isTyping: boolean } }>}
 */
async function getTypingStatus() {
  return { success: true, data: { isTyping: false } };
}

export var chatService = {
  // REST
  getConversations: getConversations,
  getMessages: getMessages,
  sendMessage: sendMessage,
  markAsRead: markAsRead,
  createRoom: createRoom,
  listAvailableTherapists: listAvailableTherapists,
  // Real-time
  subscribeToRoom: subscribeToRoom,
  setTyping: setTyping,
  // Legacy (no-op)
  getTypingStatus: getTypingStatus,
};
