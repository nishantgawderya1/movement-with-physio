'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');
const { EXERCISE_DIFFICULTY } = require('../core/utils/constants');

const ExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    bodyPart: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: Object.values(EXERCISE_DIFFICULTY),
      default: EXERCISE_DIFFICULTY.MEDIUM,
    },
    // S3 object key (not full URL — generate signed URL on demand)
    videoKey: { type: String, default: null },
    thumbnailKey: { type: String, default: null },
    // Duration in seconds
    durationSeconds: { type: Number, default: null },
    // Reps or sets guidance
    reps: { type: Number, default: null },
    sets: { type: Number, default: null },
    // Whether this exercise is publicly available or therapist-assigned only
    isPublic: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, lowercase: true, trim: true }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ExerciseSchema.plugin(softDeletePlugin);

ExerciseSchema.index({ bodyPart: 1, difficulty: 1, isPublic: 1 });
ExerciseSchema.index({ name: 'text', description: 'text' }); // text search

const Exercise = mongoose.model('Exercise', ExerciseSchema);
module.exports = Exercise;
