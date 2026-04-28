'use strict';

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  sequenceNumber: {
    type: Number,
    required: true,
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isSystemMessage: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'file'],
    },
    url: String,
    key: String,
  }],
}, {
  timestamps: true,
});

// Composite index for fast message ordering and pagination within a room
MessageSchema.index({ roomId: 1, sequenceNumber: 1 });

module.exports = mongoose.model('Message', MessageSchema);
