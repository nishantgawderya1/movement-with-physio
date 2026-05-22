'use strict';

const mongoose = require('mongoose');

const AssessmentQuestionTemplateSchema = new mongoose.Schema(
  {
    bodyPart: { type: String, required: true, lowercase: true, trim: true, index: true },
    questionId: { type: String, required: true, unique: true },
    order: { type: Number, required: true },
    questionText: { type: String, required: true },
    answerType: {
      type: String,
      enum: ['text', 'scale', 'boolean', 'multiselect'],
      default: 'text',
    },
    options: [String],
    required: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

AssessmentQuestionTemplateSchema.index({ bodyPart: 1, order: 1, isActive: 1 });

module.exports = mongoose.model('AssessmentQuestionTemplate', AssessmentQuestionTemplateSchema);
