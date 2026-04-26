'use strict';

/**
 * Exercise seed script.
 * Run: node scripts/seed-exercises.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { connect, disconnect } = require('../src/config/database');
const Exercise = require('../src/models/Exercise.model');
const logger = require('../src/core/utils/logger');

const exercises = [
  // ── Knee ──────────────────────────────────────────────────────
  {
    name: 'Quad Sets',
    description: 'Tighten quadriceps by pressing the back of the knee down into the surface.',
    bodyPart: 'knee',
    difficulty: 'easy',
    reps: 10,
    sets: 3,
    durationSeconds: 5,
    tags: ['strengthening', 'post-surgical'],
  },
  {
    name: 'Terminal Knee Extension',
    description: 'Partial knee extension from 30° flexion — strengthens VMO.',
    bodyPart: 'knee',
    difficulty: 'medium',
    reps: 15,
    sets: 3,
    tags: ['strengthening', 'knee'],
  },
  {
    name: 'Straight Leg Raise',
    description: 'Lying flat — raise leg to 45° and hold 2s.',
    bodyPart: 'knee',
    difficulty: 'easy',
    reps: 10,
    sets: 3,
    tags: ['strengthening', 'hip'],
  },
  // ── Shoulder ──────────────────────────────────────────────────
  {
    name: 'Pendulum Exercise',
    description: 'Lean forward, let arm hang, and gently swing in circles.',
    bodyPart: 'shoulder',
    difficulty: 'easy',
    durationSeconds: 60,
    sets: 3,
    tags: ['mobility', 'post-surgical'],
  },
  {
    name: 'External Rotation with Band',
    description: 'Elbow at 90°, rotate outward against band resistance.',
    bodyPart: 'shoulder',
    difficulty: 'medium',
    reps: 12,
    sets: 3,
    tags: ['strengthening', 'rotator-cuff'],
  },
  {
    name: 'Wall Angels',
    description: 'Stand against wall and slide arms overhead while keeping contact.',
    bodyPart: 'shoulder',
    difficulty: 'medium',
    reps: 10,
    sets: 2,
    tags: ['mobility', 'posture'],
  },
  // ── Lower Back ────────────────────────────────────────────────
  {
    name: 'Cat-Cow Stretch',
    description: 'Alternate spinal flexion and extension on hands and knees.',
    bodyPart: 'lower_back',
    difficulty: 'easy',
    reps: 10,
    sets: 2,
    tags: ['mobility', 'flexibility'],
  },
  {
    name: 'Bird Dog',
    description: 'Extend opposite arm and leg from quadruped position.',
    bodyPart: 'lower_back',
    difficulty: 'medium',
    reps: 8,
    sets: 3,
    tags: ['strengthening', 'core'],
  },
  {
    name: 'Dead Bug',
    description: 'Lower opposite arm/leg from table-top position while keeping back flat.',
    bodyPart: 'lower_back',
    difficulty: 'medium',
    reps: 6,
    sets: 3,
    tags: ['core', 'stability'],
  },
  // ── Hip ───────────────────────────────────────────────────────
  {
    name: 'Clamshells',
    description: 'Side-lying hip abduction with band resistance.',
    bodyPart: 'hip',
    difficulty: 'easy',
    reps: 15,
    sets: 3,
    tags: ['strengthening', 'glutes'],
  },
  {
    name: 'Hip Flexor Stretch',
    description: 'Half-kneeling lunge to stretch the hip flexor.',
    bodyPart: 'hip',
    difficulty: 'easy',
    durationSeconds: 30,
    sets: 2,
    tags: ['flexibility', 'hip'],
  },
  // ── Neck ──────────────────────────────────────────────────────
  {
    name: 'Chin Tucks',
    description: 'Retract chin straight back while keeping eyes level.',
    bodyPart: 'neck',
    difficulty: 'easy',
    reps: 10,
    sets: 3,
    tags: ['posture', 'neck'],
  },
  {
    name: 'Neck Side Stretch',
    description: 'Gently tilt head to side and hold for 30s.',
    bodyPart: 'neck',
    difficulty: 'easy',
    durationSeconds: 30,
    sets: 2,
    tags: ['flexibility', 'neck'],
  },
  // ── Full Body ─────────────────────────────────────────────────
  {
    name: 'Diaphragmatic Breathing',
    description: 'Belly breathing to activate the diaphragm and reduce tension.',
    bodyPart: 'full_body',
    difficulty: 'easy',
    durationSeconds: 300,
    sets: 1,
    tags: ['breathing', 'relaxation'],
  },
];

async function seed() {
  await connect(process.env.MONGODB_URI);
  logger.info({ event: 'SEED_EXERCISES_START', count: exercises.length });

  let inserted = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const existing = await Exercise.findOne({ name: ex.name, bodyPart: ex.bodyPart });
    if (existing) {
      skipped++;
      continue;
    }
    await Exercise.create({ ...ex, isPublic: true });
    inserted++;
  }

  logger.info({ event: 'SEED_EXERCISES_DONE', inserted, skipped });
  await disconnect();
}

seed().catch((err) => {
  logger.error({ event: 'SEED_EXERCISES_ERROR', err: err.message });
  process.exit(1);
});
