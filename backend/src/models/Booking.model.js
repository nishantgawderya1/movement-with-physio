'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');
const { BOOKING_STATUS } = require('../core/utils/constants');

const BookingSchema = new mongoose.Schema(
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
    // Slot start time stored in UTC — always
    slotStart: {
      type: Date,
      required: true,
      index: true,
    },
    // Duration in minutes (e.g. 30 or 60)
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    // IANA timezone of the patient at booking time (display only)
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    notes: { type: String, default: null },
    // Idempotency key to prevent duplicate bookings
    idempotencyKey: { type: String, unique: true, sparse: true },
    // Cancellation reason
    cancellationReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, default: null }, // 'patient' | 'therapist' | 'admin'
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BookingSchema.plugin(softDeletePlugin);

// Compound index: prevents duplicate slots for same therapist
BookingSchema.index(
  { therapistId: 1, slotStart: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ['pending', 'confirmed'] }, isDeleted: false } }
);

// Patient booking list
BookingSchema.index({ patientId: 1, slotStart: -1 });
// Therapist booking list
BookingSchema.index({ therapistId: 1, slotStart: -1 });

const Booking = mongoose.model('Booking', BookingSchema);
module.exports = Booking;
