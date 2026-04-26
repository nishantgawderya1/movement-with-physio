'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');

/**
 * TrackingSession — tracks a patient's progress session.
 * Each session records exercises performed, pain levels, and completion.
 */
const TrackingSessionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Optional: linked booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    // Assessment that triggered this tracking session
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      default: null,
    },
    exercises: [
      {
        exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
        completedSets: { type: Number, default: 0 },
        completedReps: { type: Number, default: 0 },
        durationSeconds: { type: Number, default: 0 },
        painBefore: { type: Number, min: 0, max: 10, default: null },
        painAfter: { type: Number, min: 0, max: 10, default: null },
        completedAt: { type: Date, default: null },
      },
    ],
    painScoreBefore: { type: Number, min: 0, max: 10, default: null },
    painScoreAfter: { type: Number, min: 0, max: 10, default: null },
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'skipped'],
      default: 'in_progress',
      index: true,
    },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

TrackingSessionSchema.plugin(softDeletePlugin);
TrackingSessionSchema.index({ patientId: 1, status: 1, createdAt: -1 });

const TrackingSession = mongoose.model('TrackingSession', TrackingSessionSchema);
module.exports = TrackingSession;
