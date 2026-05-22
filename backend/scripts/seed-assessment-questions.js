'use strict';

/**
 * MOCK assessment question bank.
 * TODO: replace with content reviewed by a licensed physiotherapist
 * before going to production. Re-run this script after edits.
 *
 * Usage:  node scripts/seed-assessment-questions.js
 *         npm run seed:assessment-questions
 *         make seed-assessment-questions
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const env = require('../src/config/env');
const templates = require('../src/modules/assessment/data/questionTemplates.mock.json');
const Template = require('../src/models/AssessmentQuestionTemplate.model');

(async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to', env.MONGODB_URI);
    console.log('Upserting %d question templates...', templates.length);
    let ops = 0;
    for (const q of templates) {
      await Template.updateOne(
        { questionId: q.questionId },
        { $set: q },
        { upsert: true }
      );
      ops++;
    }
    console.log('Upserted %d templates.', ops);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
