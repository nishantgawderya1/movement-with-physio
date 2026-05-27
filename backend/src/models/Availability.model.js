'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');

// One recurring weekly window in the therapist's local timezone. startMinute/
// endMinute are minutes-from-midnight (0–1439). Multiple windows per day are
// allowed (e.g. Mon 9–12 and 14–18 = two entries with dayOfWeek 1). No
// cross-window overlap validation here — deferred to the editor UI (step 5);
// enforcing it at the model would couple the schema to a product rule.
const WindowSchema = new mongoose.Schema(
  {
    // 0–6, Sunday=0 (matches JS Date.getDay()).
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startMinute: { type: Number, required: true, min: 0, max: 1439 },
    endMinute: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
      validate: {
        validator: function (v) {
          return v > this.startMinute;
        },
        message: 'endMinute must be greater than startMinute',
      },
    },
  },
  { _id: false }
);

// One document per therapist (therapistId unique). Recurring weekly
// availability the patient slot-grid (step 3) reads to generate bookable
// 30-min slots over the 7-day window. Replaces the synthetic 09:00–18:00
// grid currently hardcoded in booking.service.listSlots.
const AvailabilitySchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    windows: [WindowSchema],
    // IANA timezone the windows are expressed in. Slots are materialized to
    // UTC at read time (matches Booking.model.js slotStart-is-UTC convention).
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AvailabilitySchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Availability', AvailabilitySchema);
