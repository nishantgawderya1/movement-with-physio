'use strict';

const mongoose = require('mongoose');

const OnboardingDraftSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Clerk user ID (string, not ObjectId — pre-DB creation)
      required: true,
      unique: true,
      index: true,
    },
    step: { type: String, default: 'personal_info' },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// TTL — auto-remove abandoned drafts after 7 days
OnboardingDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OnboardingDraft = mongoose.model('OnboardingDraft', OnboardingDraftSchema);
module.exports = OnboardingDraft;
