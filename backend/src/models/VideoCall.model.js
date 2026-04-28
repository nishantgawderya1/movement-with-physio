'use strict';

const mongoose = require('mongoose');

const VideoCallSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
  },
  status: {
    type: String,
    enum: ['initiated', 'ongoing', 'ended', 'missed'],
    default: 'initiated',
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startedAt: Date,
  endedAt: Date,
  durationSeconds: Number,
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

VideoCallSchema.index({ participants: 1, status: 1 });

module.exports = mongoose.model('VideoCall', VideoCallSchema);
