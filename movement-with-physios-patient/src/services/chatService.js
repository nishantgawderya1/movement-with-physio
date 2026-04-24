/**
 * chatService.js — Mock-first chat service for MWP Patient.
 *
 * All methods return a Promise<{ success: boolean, data?: any, error?: string }>.
 * Swap the mock implementations for real REST/WebSocket calls with zero UI changes.
 *
 * Message shape (matches therapist-side contract):
 *   {
 *     id: string,
 *     roomId: string,
 *     senderId: string,        // 'patient' | therapist userId
 *     senderRole: 'patient' | 'therapist',
 *     text: string,
 *     timestamp: ISO string,
 *     status: 'sent' | 'delivered' | 'read',
 *     replyTo: { id, text } | null
 *   }
 *
 * Conversation shape:
 *   {
 *     roomId: string,
 *     therapistId: string,
 *     therapistName: string,
 *     therapistAvatar: string | null,
 *     lastMessage: string,
 *     lastMessageTime: ISO string,
 *     unreadCount: number,
 *     isOnline: boolean
 *   }
 */

// ── Mock Data ──────────────────────────────────────────────────────────────

var MOCK_CONVERSATIONS = [
  {
    roomId: 'room-001',
    therapistId: 'therapist-sarah',
    therapistName: 'Dr. Sarah Mitchell',
    therapistAvatar: null,
    lastMessage: 'Great progress on your knee exercises! Keep it up.',
    lastMessageTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    unreadCount: 2,
    isOnline: true,
  },
  {
    roomId: 'room-002',
    therapistId: 'therapist-james',
    therapistName: 'Dr. James Okafor',
    therapistAvatar: null,
    lastMessage: "I've updated your plan, please review when you get a chance.",
    lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    isOnline: false,
  },
];

var MOCK_MESSAGES = {
  'room-001': [
    {
      id: 'msg-001-1',
      roomId: 'room-001',
      senderId: 'therapist-sarah',
      senderRole: 'therapist',
      text: 'Good morning! How is the pain level today compared to yesterday?',
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-001-2',
      roomId: 'room-001',
      senderId: 'patient',
      senderRole: 'patient',
      text: "Morning Dr. Sarah! It's around a 4 today, down from 6 yesterday.",
      timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-001-3',
      roomId: 'room-001',
      senderId: 'therapist-sarah',
      senderRole: 'therapist',
      text: "That's wonderful improvement! The stretching routine is clearly helping.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: { id: 'msg-001-2', text: "It's around a 4 today, down from 6 yesterday." },
    },
    {
      id: 'msg-001-4',
      roomId: 'room-001',
      senderId: 'patient',
      senderRole: 'patient',
      text: 'Yes! The hip flexor stretch especially. Should I increase the hold time?',
      timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-001-5',
      roomId: 'room-001',
      senderId: 'therapist-sarah',
      senderRole: 'therapist',
      text: 'Try holding for 45 seconds instead of 30. But listen to your body — if it feels too intense, go back to 30.',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: { id: 'msg-001-4', text: 'Should I increase the hold time?' },
    },
    {
      id: 'msg-001-6',
      roomId: 'room-001',
      senderId: 'patient',
      senderRole: 'patient',
      text: 'Perfect, will do. Thanks for always being so responsive!',
      timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-001-7',
      roomId: 'room-001',
      senderId: 'therapist-sarah',
      senderRole: 'therapist',
      text: 'Great progress on your knee exercises! Keep it up.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: 'delivered',
      replyTo: null,
    },
    {
      id: 'msg-001-8',
      roomId: 'room-001',
      senderId: 'therapist-sarah',
      senderRole: 'therapist',
      text: "Don't forget your session tomorrow at 10am. See you then!",
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      status: 'delivered',
      replyTo: null,
    },
  ],
  'room-002': [
    {
      id: 'msg-002-1',
      roomId: 'room-002',
      senderId: 'patient',
      senderRole: 'patient',
      text: 'Hi Dr. James! I completed all 3 sets today.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-002-2',
      roomId: 'room-002',
      senderId: 'therapist-james',
      senderRole: 'therapist',
      text: 'Excellent work! How did the resistance band feel — too easy or just right?',
      timestamp: new Date(Date.now() - 4.8 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: { id: 'msg-002-1', text: 'I completed all 3 sets today.' },
    },
    {
      id: 'msg-002-3',
      roomId: 'room-002',
      senderId: 'patient',
      senderRole: 'patient',
      text: 'Honestly, by the third set it got pretty challenging. Is that normal?',
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-002-4',
      roomId: 'room-002',
      senderId: 'therapist-james',
      senderRole: 'therapist',
      text: "That's exactly where we want you — challenging but manageable. The muscle fatigue means it's working!",
      timestamp: new Date(Date.now() - 4.3 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: { id: 'msg-002-3', text: 'By the third set it got pretty challenging.' },
    },
    {
      id: 'msg-002-5',
      roomId: 'room-002',
      senderId: 'patient',
      senderRole: 'patient',
      text: 'Great to know! When should I progress to the blue band?',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-002-6',
      roomId: 'room-002',
      senderId: 'therapist-james',
      senderRole: 'therapist',
      text: "Once you can complete all 3 sets with the yellow band without difficulty for two consecutive sessions, we'll progress.",
      timestamp: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-002-7',
      roomId: 'room-002',
      senderId: 'patient',
      senderRole: 'patient',
      text: 'Makes sense! I will stick with yellow for now.',
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
    {
      id: 'msg-002-8',
      roomId: 'room-002',
      senderId: 'therapist-james',
      senderRole: 'therapist',
      text: "I've updated your plan, please review when you get a chance.",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      replyTo: null,
    },
  ],
};

// In-memory message store for optimistic updates
var _messages = JSON.parse(JSON.stringify(MOCK_MESSAGES));
var _conversations = JSON.parse(JSON.stringify(MOCK_CONVERSATIONS));

// ── Simulation helpers ─────────────────────────────────────────────────────

function _delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function _formatTime(isoString) {
  var d = new Date(isoString);
  var now = new Date();
  var diffMs = now - d;
  var diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm ago';
  var diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return diffHrs + 'h ago';
  return d.toLocaleDateString();
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns a list of conversation threads for the current patient.
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
async function getConversations() {
  await _delay(300);
  return {
    success: true,
    data: _conversations.map(function (c) {
      return Object.assign({}, c);
    }),
  };
}

/**
 * Returns paginated messages for a given room.
 * @param {string} roomId
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ success: boolean, data?: { messages: Array, hasMore: boolean }, error?: string }>}
 */
async function getMessages(roomId, options) {
  await _delay(250);
  var opts = options || {};
  var page = opts.page || 1;
  var limit = opts.limit || 20;

  var all = _messages[roomId] || [];
  // Return in reverse chronological order for inverted FlatList
  var sorted = all.slice().reverse();
  var start = (page - 1) * limit;
  var end = start + limit;
  var slice = sorted.slice(start, end);

  return {
    success: true,
    data: {
      messages: slice,
      hasMore: end < sorted.length,
      total: sorted.length,
    },
  };
}

/**
 * Sends a message to a room. Adds optimistically to local state.
 * @param {string} roomId
 * @param {string} text
 * @param {{ id: string, text: string } | null} replyTo
 * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
 */
async function sendMessage(roomId, text, replyTo) {
  await _delay(150);

  var msg = {
    id: 'msg-' + Date.now(),
    roomId: roomId,
    senderId: 'patient',
    senderRole: 'patient',
    text: text.trim(),
    timestamp: new Date().toISOString(),
    status: 'sent',
    replyTo: replyTo || null,
  };

  // Persist in memory
  if (!_messages[roomId]) {
    _messages[roomId] = [];
  }
  _messages[roomId].push(msg);

  // Update conversation lastMessage
  var conv = _conversations.find(function (c) { return c.roomId === roomId; });
  if (conv) {
    conv.lastMessage = text.trim();
    conv.lastMessageTime = msg.timestamp;
  }

  // Simulate delivery after 800ms
  setTimeout(function () {
    msg.status = 'delivered';
  }, 800);

  return { success: true, data: msg };
}

/**
 * Marks a specific message as read.
 * @param {string} roomId
 * @param {string} messageId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function markAsRead(roomId, messageId) {
  await _delay(100);

  var msgs = _messages[roomId] || [];
  msgs.forEach(function (m) {
    if (m.id === messageId || !messageId) {
      m.status = 'read';
    }
  });

  // Clear unread badge for this room
  var conv = _conversations.find(function (c) { return c.roomId === roomId; });
  if (conv) {
    conv.unreadCount = 0;
  }

  return { success: true };
}

/**
 * Polls for typing status in a room.
 * Returns true ~25% of the time to simulate realistic typing.
 * @param {string} roomId
 * @returns {Promise<{ success: boolean, data?: { isTyping: boolean }, error?: string }>}
 */
async function getTypingStatus(roomId) {
  await _delay(200);
  // Simple mock: Dr. Sarah types occasionally
  var isTyping = roomId === 'room-001' && Math.random() < 0.25;
  return {
    success: true,
    data: { isTyping: isTyping },
  };
}

export var chatService = {
  getConversations: getConversations,
  getMessages: getMessages,
  sendMessage: sendMessage,
  markAsRead: markAsRead,
  getTypingStatus: getTypingStatus,
};
