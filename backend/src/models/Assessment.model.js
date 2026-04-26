'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');

const AssessmentSchema = new mongoose.Schema(
  {
    // Which patient this assessment belongs to
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Optional: therapist who initiated the assessment
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Body part(s) being assessed
    bodyParts: [{ type: String, trim: true, lowercase: true }],
    // Free-form questionnaire data
    questions: [
      {
        questionId: { type: String, required: true },
        questionText: { type: String, required: true },
        answerType: { type: String, enum: ['text', 'scale', 'boolean', 'multiselect'], default: 'text' },
        options: [String],
      },
    ],
    // Patient answers
    responses: [
      {
        questionId: { type: String, required: true },
        answer: mongoose.Schema.Types.Mixed,
        answeredAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
      index: true,
    },
    completedAt: { type: Date, default: null },
    // Pain score 0-10 at time of completion
    painScore: { type: Number, min: 0, max: 10, default: null },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AssessmentSchema.plugin(softDeletePlugin);
AssessmentSchema.index({ patientId: 1, status: 1, createdAt: -1 });

const Assessment = mongoose.model('Assessment', AssessmentSchema);
module.exports = Assessment;
