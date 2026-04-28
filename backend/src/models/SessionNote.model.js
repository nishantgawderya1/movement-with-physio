'use strict';

const mongoose = require('mongoose');

/**
 * SessionNote — therapist-authored notes attached to a completed booking.
 *
 * Medical records are NEVER deleted during account anonymization (DPDP compliance).
 * The therapistId field is anonymized but the note content is retained.
 */
const SessionNoteSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    therapistId: {
      type: String, // Clerk user ID
      required: true,
      index: true,
    },
    patientId: {
      type: String, // Clerk user ID
      required: true,
      index: true,
    },
    notes: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    // Optional structured fields
    painLevel: { type: Number, min: 0, max: 10, default: null },
    mobility: { type: String, enum: ['poor', 'fair', 'good', 'excellent', null], default: null },
    nextSteps: { type: String, maxlength: 2000, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for therapist querying a patient's notes
SessionNoteSchema.index({ therapistId: 1, patientId: 1, createdAt: -1 });
SessionNoteSchema.index({ bookingId: 1 }, { unique: true }); // One note per booking

const SessionNote = mongoose.model('SessionNote', SessionNoteSchema);
module.exports = SessionNote;
