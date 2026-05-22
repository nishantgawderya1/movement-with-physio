'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');
const fieldCryptoPlugin = require('../core/security/mongooseFieldCryptoPlugin');
const { ROLES } = require('../core/utils/constants');

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, sparse: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PATIENT,
      index: true,
    },
    fcmToken: { type: String, default: null },

    // Therapist-specific fields (null for patients/admins)
    specialty: { type: String, default: null },
    rating: { type: Number, default: null, min: 0, max: 5 },
    isVerified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date, default: null },

    // Phase 2 — therapist instant-call availability
    availableNow: { type: Boolean, default: false, index: true },
    availableNowSince: { type: Date, default: null },

    // Patient-specific
    onboardingCompleted: { type: Boolean, default: false },

    // Phase 3 — primary body part for clinical assessments.
    // Enum MUST stay in sync with AssessmentQuestionTemplate.bodyPart values
    // (verified 2026-05-20: ankle/back/general/knee/leg/neck/shoulder).
    // Null means "not yet captured" → booking.service falls back to 'general'.
    painLocation: {
      type: String,
      enum: ['leg', 'knee', 'back', 'neck', 'shoulder', 'ankle', 'general', null],
      lowercase: true,
      trim: true,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Soft delete plugin
UserSchema.plugin(softDeletePlugin);

// Field encryption for PII. AES-256-GCM via our in-house plugin
// (src/core/security/mongooseFieldCryptoPlugin.js). Replaces the old
// `mongoose-field-encryption` which was incompatible with Mongoose 8.x
// (called `this.update()` — removed in v8). Requires FIELD_ENCRYPTION_KEY
// env var (32-byte hex / 64 hex chars), validated at boot in config/env.js.
UserSchema.plugin(fieldCryptoPlugin, { fields: ['phone'] });

// Compound index for therapist search (email + clerkId indexes are already defined in schema field defs)
UserSchema.index({ role: 1, specialty: 1, rating: -1, isVerified: 1 });

const User = mongoose.model('User', UserSchema);
module.exports = User;
