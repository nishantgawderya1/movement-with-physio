'use strict';

const ChatRoom = require('../../models/ChatRoom.model');
const Message = require('../../models/Message.model');
const { NOTIFICATION_TYPES } = require('../../core/utils/constants');
const { addJob } = require('../../core/jobs/jobQueue');

class ChatService {
  constructor(container) {
    this.redis = container.redis;
    this.messaging = container.messaging;
    this.notification = container.notification;
    // Set later by the chat plugin once io.of('/chat') exists. Until then we
    // fall back to messaging.emitToRoom (default namespace) so the service
    // still works in isolation / tests.
    this.namespace = null;
  }

  /**
   * Inject the Socket.IO namespace (`/chat`) used for live message delivery.
   * @param {import('socket.io').Namespace} ns
   */
  setNamespace(ns) {
    this.namespace = ns;
  }

  /**
   * Create or find a direct chat room between participants.
   * @param {string[]} participantIds
   * @returns {Promise<ChatRoom>}
   */
  async createRoom(participantIds) {
    // Populate participants to match the contract of getUserRooms / getRoom —
    // the controller returns this room to the client, which expects participants
    // as hydrated User objects, not raw ObjectIds.
    // TODO: lastMessage.sender is also never populated anywhere in this service
    // — separate concern for a future chat-rendering pass.
    const room = await ChatRoom.findOne({
      participants: { $all: participantIds, $size: participantIds.length },
      type: 'direct',
    }).populate('participants', 'name email role');

    if (room) return room;

    const created = await ChatRoom.create({
      participants: participantIds,
      type: 'direct',
    });
    return created.populate('participants', 'name email role');
  }

  /**
   * Get all chat rooms for a user.
   * @param {string} userId
   * @returns {Promise<ChatRoom[]>}
   */
  async getUserRooms(userId) {
    return ChatRoom.find({ participants: userId, isActive: true })
      .populate('participants', 'name email role')
      .sort({ updatedAt: -1 });
  }

  /**
   * Get details of a single chat room.
   * @param {string} roomId
   * @param {string} userId
   * @returns {Promise<ChatRoom>}
   */
  async getRoom(roomId, userId) {
    const room = await ChatRoom.findOne({ _id: roomId, participants: userId, isActive: true })
      .populate('participants', 'name email role');
    if (!room) {
      const err = new Error('Chat room not found'); err.statusCode = 404; throw err;
    }
    return room;
  }

  /**
   * Soft-delete a chat room.
   * @param {string} roomId
   * @param {string} userId
   */
  async deleteRoom(roomId, userId) {
    const room = await ChatRoom.findOneAndUpdate(
      { _id: roomId, participants: userId },
      { isActive: false },
      { new: true }
    );
    if (!room) {
      const err = new Error('Chat room not found or unauthorized'); err.statusCode = 404; throw err;
    }
  }

  /**
   * Send a message in a room.
   * @param {string} roomId
   * @param {string} senderId
   * @param {string} text
   * @returns {Promise<Message>}
   */
  async sendMessage(roomId, senderId, text) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      const err = new Error('Chat room not found'); err.statusCode = 404; throw err;
    }

    // Compare ObjectIds via string form — Array#includes uses ===, which
    // fails on Mongoose ObjectIds even when the values match.
    const isParticipant = room.participants.some(
      (p) => p.toString() === String(senderId)
    );
    if (!isParticipant) {
      const err = new Error('You are not a participant in this room'); err.statusCode = 403; throw err;
    }

    // Atomic increment for sequence number
    const seqKey = `chat:seq:${roomId}`;
    const sequenceNumber = await this.redis.incr(seqKey);

    const message = await Message.create({
      roomId,
      sender: senderId,
      text,
      sequenceNumber,
    });

    // Update room last message info
    room.lastMessage = {
      text,
      sender: senderId,
      sentAt: message.createdAt,
    };
    room.lastSeq = sequenceNumber;
    await room.save();

    // Emit via socket on the `/chat` namespace (where clients connect).
    // Falls back to the default namespace if the chat plugin hasn't wired
    // setNamespace yet — keeps the path safe in startup races.
    if (this.namespace) {
      this.namespace.to(String(roomId)).emit('new_message', message);
    } else {
      this.messaging.emitToRoom(String(roomId), 'new_message', message);
    }

    // Notify other participants (offline push) via job queue
    const otherParticipants = room.participants.filter(p => p.toString() !== senderId.toString());
    for (const participantId of otherParticipants) {
      await addJob('send_notification', {
        userId: participantId,
        title: 'New Message',
        body: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        data: { roomId: roomId.toString() },
      });
    }

    return message;
  }

  /**
   * Get messages for a room with pagination.
   * @param {string} roomId
   * @param {number} afterSeq
   * @param {number} limit
   * @returns {Promise<Message[]>}
   */
  async getMessages(roomId, afterSeq = 0, limit = 50) {
    return Message.find({
      roomId,
      sequenceNumber: { $gt: afterSeq },
    })
      .sort({ sequenceNumber: 1 })
      .limit(limit)
      .populate('sender', 'name role');
  }

  /**
   * Mark messages as read in a room.
   * @param {string} roomId
   * @param {string} userId
   */
  async markRead(roomId, userId) {
    await Message.updateMany(
      { roomId, 'readBy.userId': { $ne: userId } },
      { $push: { readBy: { userId, readAt: new Date() } } }
    );
  }
}

module.exports = (container) => new ChatService(container);
