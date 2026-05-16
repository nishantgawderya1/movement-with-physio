/**
 * chatService.js — Real backend bridge for therapist chat.
 *
 * REST   /api/v1/chat/*
 * Socket /chat namespace
 *
 * Normalises backend rooms/messages into the existing therapist UI shapes:
 *
 * Conversation (used by MessagesScreen):
 *   { id, roomId, name, lastMessage, time, unread, online, avatarBg, avatarEmoji }
 *
 * Message (used by ChatScreen):
 *   { id, type, content, sender, timestamp, status, replyTo, reactions,
 *     imageUri, voiceDuration, exercise, sequenceNumber }
 *
 * Features the backend doesn't yet support (reactions / voice / exercise /
 * presence / unread counts) keep their mock-friendly defaults so existing UI
 * components don't break.
 */

import { apiClient } from '../lib/apiClient';
import { chatSocket } from '../lib/chatSocket';
import { tokenProvider } from '../lib/tokenProvider';

// ── Avatar helpers (matches existing mock palette) ─────────────────────────

const AVATAR_BG_PALETTE = ['#FDE68A', '#BFDBFE', '#FCA5A5', '#DDD6FE', '#A7F3D0', '#FBCFE8'];
const AVATAR_EMOJI_PALETTE = ['👩', '🧑', '👨', '👩‍🦰', '🧓', '👦'];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function avatarFor(id) {
  const h = hashCode(String(id || ''));
  return {
    bg: AVATAR_BG_PALETTE[h % AVATAR_BG_PALETTE.length],
    emoji: AVATAR_EMOJI_PALETTE[h % AVATAR_EMOJI_PALETTE.length],
  };
}

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return diffMin + ' min ago';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + ' hour' + (diffHr > 1 ? 's' : '') + ' ago';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return diffDay + ' day' + (diffDay > 1 ? 's' : '') + ' ago';
  return d.toLocaleDateString();
}

// ── Normalizers ────────────────────────────────────────────────────────────

function pickOther(participants, myId) {
  if (!Array.isArray(participants) || participants.length === 0) return null;
  if (myId) {
    const other = participants.find((p) => String(p && p._id) !== String(myId));
    if (other) return other;
  }
  return participants[0];
}

function normalizeRoom(room, myId) {
  if (!room) return null;
  const other = pickOther(room.participants, myId);
  const id = String(room._id);
  const av = avatarFor(other ? other._id : id);
  return {
    id,
    roomId: id,
    clientId: other ? String(other._id) : '',
    name: other ? (other.name || other.email || 'Patient') : 'Patient',
    lastMessage: (room.lastMessage && room.lastMessage.text) || '',
    time: formatRelative((room.lastMessage && room.lastMessage.sentAt) || room.updatedAt),
    unread: 0,
    online: false,
    avatarBg: av.bg,
    avatarEmoji: av.emoji,
  };
}

function normalizeMessage(m, myId) {
  const senderObj = (m && m.sender && typeof m.sender === 'object') ? m.sender : null;
  const senderId = senderObj ? String(senderObj._id) : (m && m.sender ? String(m.sender) : '');
  const isMine = !!(myId && senderId && senderId === String(myId));

  let status = null;
  if (isMine) {
    status = 'delivered';
    if (Array.isArray(m && m.readBy)) {
      const seenByOther = m.readBy.some((r) => r && r.userId && String(r.userId) !== senderId);
      if (seenByOther) status = 'seen';
    }
  }

  return {
    id: String(m._id || m.id),
    roomId: String(m.roomId),
    type: 'text',
    content: m.text || '',
    sender: isMine ? 'therapist' : 'client',
    timestamp: new Date(m.createdAt || m.timestamp || Date.now()),
    status,
    replyTo: null,
    reactions: [],
    imageUri: null,
    voiceDuration: null,
    exercise: null,
    sequenceNumber: typeof m.sequenceNumber === 'number' ? m.sequenceNumber : 0,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

async function getConversations() {
  const res = await apiClient.get('/chat/rooms');
  if (!res.success) return { success: false, error: res.error };
  const myId = tokenProvider.getMyUserId();
  const rooms = Array.isArray(res.data) ? res.data : [];
  return {
    success: true,
    data: rooms.map((r) => normalizeRoom(r, myId)).filter(Boolean),
  };
}

async function getMessages(roomId, options) {
  const opts = options || {};
  const limit = opts.limit || 50;
  const afterSeq = typeof opts.afterSeq === 'number' ? opts.afterSeq : 0;

  const res = await apiClient.get('/chat/rooms/' + roomId + '/messages', { afterSeq, limit });
  if (!res.success) return { success: false, error: res.error };

  const myId = tokenProvider.getMyUserId();
  const raw = Array.isArray(res.data) ? res.data : [];
  const normalized = raw.map((m) => normalizeMessage(m, myId));
  // ChatScreen uses an inverted FlatList — newest first.
  normalized.sort((a, b) => b.sequenceNumber - a.sequenceNumber);

  return {
    success: true,
    data: { messages: normalized, hasMore: normalized.length === limit, total: normalized.length },
  };
}

async function sendMessage(roomId, text) {
  const res = await apiClient.post('/chat/rooms/' + roomId + '/messages', { text });
  if (!res.success) return { success: false, error: res.error };
  const myId = tokenProvider.getMyUserId();
  return { success: true, data: normalizeMessage(res.data, myId) };
}

async function markAsRead(roomId) {
  const res = await apiClient.post('/chat/rooms/' + roomId + '/read', {});
  if (!res.success) return { success: false, error: res.error };
  chatSocket.emit('mark_read', { roomId });
  return { success: true };
}

/**
 * Create or find a direct room with a patient.
 * @param {string} patientUserId - patient User._id (Mongo ObjectId)
 */
async function createRoomWithPatient(patientUserId) {
  const res = await apiClient.post('/chat/rooms', { participantIds: [patientUserId] });
  if (!res.success) return { success: false, error: res.error };
  const myId = tokenProvider.getMyUserId();
  return { success: true, data: normalizeRoom(res.data, myId) };
}

/**
 * List patients this therapist can chat with (used by the new-chat sheet).
 * Falls back to an empty array on error so the UI can still render.
 */
async function listMyClients() {
  // includeAll bypasses the "must have a confirmed booking" filter so the
  // therapist can start a chat with any patient — needed while the booking
  // flow is still in development.
  const res = await apiClient.get('/therapists/me/clients', { limit: 50, includeAll: true });
  if (!res.success) return { success: false, error: res.error };
  const arr = Array.isArray(res.data) ? res.data : [];
  return {
    success: true,
    data: arr.map((u) => {
      const av = avatarFor(u._id);
      return {
        id: String(u._id),
        name: u.name || u.email || 'Patient',
        avatarBg: av.bg,
        avatarEmoji: av.emoji,
      };
    }),
  };
}

// ── Real-time subscription helpers ─────────────────────────────────────────

function subscribeToRoom(roomId, handlers) {
  const unsubs = [];

  chatSocket.connect().then(() => {
    chatSocket.emit('join_room', { roomId });
  });

  if (handlers && handlers.onMessage) {
    const msgHandler = (msg) => {
      if (!msg || String(msg.roomId) !== String(roomId)) return;
      const myId = tokenProvider.getMyUserId();
      handlers.onMessage(normalizeMessage(msg, myId));
    };
    unsubs.push(chatSocket.on('new_message', msgHandler));
  }

  if (handlers && handlers.onTyping) {
    const typingHandler = (info) => {
      if (!info || String(info.roomId) !== String(roomId)) return;
      const myId = tokenProvider.getMyUserId();
      if (myId && String(info.userId) === String(myId)) return;
      handlers.onTyping({ userId: String(info.userId), isTyping: !!info.isTyping });
    };
    unsubs.push(chatSocket.on('typing', typingHandler));
  }

  if (handlers && handlers.onReadBy) {
    const readHandler = (info) => {
      if (!info || String(info.roomId) !== String(roomId)) return;
      handlers.onReadBy({ userId: String(info.userId) });
    };
    unsubs.push(chatSocket.on('read_by', readHandler));
  }

  return () => { unsubs.forEach((u) => { try { u(); } catch (e) {} }); };
}

function setTyping(roomId, isTyping) {
  chatSocket.emit('typing', { roomId, isTyping: !!isTyping });
}

export const chatService = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  createRoomWithPatient,
  listMyClients,
  subscribeToRoom,
  setTyping,
};
