'use strict';

const mongoose = require('mongoose');
const { fieldEncryption } = require('mongoose-field-encryption');
const softDeletePlugin = require('../core/utils/softDelete');
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

    // Patient-specific
    onboardingCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Soft delete plugin
UserSchema.plugin(softDeletePlugin);

// Field encryption for PII (requires FIELD_ENCRYPTION_KEY env var, 32-byte hex)
UserSchema.plugin(fieldEncryption, {
  fields: ['phone'],
  secret: process.env.FIELD_ENCRYPTION_KEY,
  saltGenerator: (secret) => secret.slice(0, 16),
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, specialty: 1, rating: -1, isVerified: 1 }); // therapist search
UserSchema.index({ clerkId: 1 });

const User = mongoose.model('User', UserSchema);
module.exports = User;
