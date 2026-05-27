'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');
const { PROPOSAL_STATUS, MEETING_TYPE } = require('../core/utils/constants');

// Therapist-initiated invitation for a patient to accept a single time slot.
// Lives in its own collection (not extending Booking) so its lifecycle —
// pending → accepted/declined/expired/cancelled_by_therapist — stays
// independent of the Booking state machine. On accept, the service creates
// a Booking and stores its id on `bookingId` for downstream traversal
// (smart-join, calendar render, etc.).
const BookingProposalSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Slot start time stored in UTC — always (matches Booking.model.js:26).
    slotStart: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    // IANA timezone — display-only (matches Booking.model.js:39-43). The
    // canonical instant lives in slotStart; this exists so the patient sees
    // the slot in the therapist's intended local time when it differs.
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    meetingType: {
      type: String,
      enum: Object.values(MEETING_TYPE),
      default: MEETING_TYPE.IN_PERSON,
      required: true,
    },
    // No Mongoose maxlength — Joi enforces the length cap at the route
    // boundary (matches the User.name / Booking.notes convention).
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(PROPOSAL_STATUS),
      default: PROPOSAL_STATUS.PENDING,
      index: true,
    },
    // Service (P2.1) computes as Date.now() + 24h on create. Required at
    // model level so a forgotten compute can't slip through with null.
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    // Set when status transitions away from pending (accept/decline/cancel).
    // null while pending or expired-without-action.
    respondedAt: { type: Date, default: null },
    // Joi enforces length cap at route boundary.
    declineReason: { type: String, default: null },
    // FK to the Booking created when the patient accepts. null until accept.
    // Sparse index below allows efficient "find proposal that produced this booking".
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BookingProposalSchema.plugin(softDeletePlugin);

// Slot-conflict guard at the DB layer: a therapist cannot have two PENDING
// proposals for the same slot. Mirrors Booking.model.js:98-101 partial-unique
// pattern. Defense-in-depth alongside the service-layer pre-write check
// (lands in P2.1) — the unique index closes the race window between two
// concurrent createProposal calls.
BookingProposalSchema.index(
  { therapistId: 1, slotStart: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', isDeleted: false } }
);

// Therapist's pending/active list (proposals dashboard).
BookingProposalSchema.index({ therapistId: 1, status: 1, slotStart: -1 });
// Patient's pending list (incoming proposals screen).
BookingProposalSchema.index({ patientId: 1, status: 1, slotStart: -1 });
// FK lookup from a Booking back to the proposal that spawned it. Sparse
// because bookingId is null until the patient accepts.
BookingProposalSchema.index({ bookingId: 1 }, { sparse: true });
// 24h sweep query (lands in P2.4): { status: 'pending', expiresAt: { $lte: now } }.
BookingProposalSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('BookingProposal', BookingProposalSchema);
