'use strict';

const mongoose = require('mongoose');

const JoinStateSchema = new mongoose.Schema({
  joinedAt: Date,
  leftAt: Date,
}, { _id: false });

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
    enum: ['scheduled', 'initiated', 'ongoing', 'ended', 'missed'],
    default: 'scheduled',
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
  // ── Phase 2: booking linkage + per-participant join state ──
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: true,
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    default: null,
  },
  scheduledAt: { type: Date, default: null, index: true },
  joinState: {
    type: Map,
    of: JoinStateSchema,
    default: () => new Map(),
  },
}, {
  timestamps: true,
});

VideoCallSchema.index({ participants: 1, status: 1 });

module.exports = mongoose.model('VideoCall', VideoCallSchema);
