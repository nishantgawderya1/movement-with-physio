'use strict';

const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
  },
  lastMessage: {
    text: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sentAt: Date,
  },
  lastSeq: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Index for fast participant lookups
ChatRoomSchema.index({ participants: 1 });

// Ensure direct chats between the same two users are unique (optional, but good for direct messages)
// For now, we'll keep it simple as the requirements might vary.

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
