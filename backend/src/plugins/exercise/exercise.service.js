'use strict';

const Exercise = require('../../../models/Exercise.model');
const cacheManager = require('../../../core/cache/cacheManager');
const paginate = require('../../../core/utils/paginator');
const { REDIS_TTL } = require('../../../core/utils/constants');
const logger = require('../../../core/utils/logger');

const EXERCISE_CACHE_TTL = REDIS_TTL.EXERCISE || 3600; // 1hr

/**
 * List exercises by body part, with Redis caching.
 * @param {object} filters
 */
async function listExercises({ bodyPart, difficulty, cursor, limit }) {
  const query = { isPublic: true };
  if (bodyPart) query.bodyPart = bodyPart.toLowerCase();
  if (difficulty) query.difficulty = difficulty;

  // Cache only unfiltered + bodyPart queries (common path)
  const cacheKey = bodyPart && !difficulty && !cursor
    ? `exercises:bodyPart:${bodyPart}`
    : null;

  if (cacheKey) {
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;
  }

  const result = await paginate(Exercise, query, {
    cursor,
    limit,
    sort: { name: 1 },
  });

  if (cacheKey) {
    await cacheManager.set(cacheKey, result, EXERCISE_CACHE_TTL);
  }

  return result;
}

/**
 * Get a single exercise by ID, with Redis caching.
 * @param {string} exerciseId
 * @param {object} storageProvider - S3Adapter instance (for signed URL)
 */
async function getExercise(exerciseId, storageProvider) {
  const cacheKey = `exercise:${exerciseId}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const exercise = await Exercise.findById(exerciseId).lean();
  if (!exercise) return null;

  // Generate signed URL if video exists
  if (exercise.videoKey && storageProvider) {
    exercise.videoUrl = await storageProvider.getSignedUrl(exercise.videoKey, 43200); // 12hr
  }

  await cacheManager.set(cacheKey, exercise, EXERCISE_CACHE_TTL);
  return exercise;
}

/**
 * Generate a fresh signed URL for a video (refresh endpoint).
 */
async function getVideoSignedUrl(exerciseId, storageProvider) {
  const exercise = await Exercise.findById(exerciseId).select('videoKey').lean();
  if (!exercise || !exercise.videoKey) {
    const err = new Error('No video found for this exercise');
    err.statusCode = 404;
    throw err;
  }
  return storageProvider.getSignedUrl(exercise.videoKey, 43200);
}

/**
 * Create a new exercise (therapist/admin).
 */
async function createExercise(data) {
  const exercise = await Exercise.create(data);
  // Invalidate body part cache
  await cacheManager.invalidate(`exercises:bodyPart:${data.bodyPart}`);
  logger.info({ event: 'EXERCISE_CREATED', exerciseId: exercise._id });
  return exercise;
}

/**
 * Update an exercise.
 */
async function updateExercise(exerciseId, updates) {
  const exercise = await Exercise.findByIdAndUpdate(exerciseId, updates, { new: true, runValidators: true });
  if (!exercise) {
    const err = new Error('Exercise not found');
    err.statusCode = 404;
    throw err;
  }
  // Invalidate both caches
  await Promise.all([
    cacheManager.invalidate(`exercise:${exerciseId}`),
    cacheManager.invalidate(`exercises:bodyPart:${exercise.bodyPart}`),
  ]);
  logger.info({ event: 'EXERCISE_UPDATED', exerciseId });
  return exercise;
}

/**
 * Delete an exercise (soft delete).
 */
async function deleteExercise(exerciseId) {
  const exercise = await Exercise.findById(exerciseId);
  if (!exercise) {
    const err = new Error('Exercise not found');
    err.statusCode = 404;
    throw err;
  }
  await exercise.softDelete();
  await Promise.all([
    cacheManager.invalidate(`exercise:${exerciseId}`),
    cacheManager.invalidate(`exercises:bodyPart:${exercise.bodyPart}`),
  ]);
  logger.info({ event: 'EXERCISE_DELETED', exerciseId });
}

/**
 * Assign an exercise to a patient (therapist action).
 * Returns an assignment record in the tracking session.
 */
async function assignExercise(exerciseId, patientId, therapistId) {
  const exercise = await Exercise.findById(exerciseId).lean();
  if (!exercise) {
    const err = new Error('Exercise not found');
    err.statusCode = 404;
    throw err;
  }
  // The assignment itself lives in TrackingSession; here we just validate and return
  return { exerciseId, patientId, therapistId, assignedAt: new Date() };
}

/**
 * Mark an exercise as completed in a tracking session.
 */
async function completeExercise(sessionId, exerciseData) {
  const TrackingSession = require('../../../models/TrackingSession.model');
  const session = await TrackingSession.findById(sessionId);
  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  const idx = session.exercises.findIndex(
    (e) => String(e.exerciseId) === String(exerciseData.exerciseId)
  );
  if (idx >= 0) {
    Object.assign(session.exercises[idx], exerciseData, { completedAt: new Date() });
  } else {
    session.exercises.push({ ...exerciseData, completedAt: new Date() });
  }
  await session.save();
  return session;
}

module.exports = {
  listExercises,
  getExercise,
  getVideoSignedUrl,
  createExercise,
  updateExercise,
  deleteExercise,
  assignExercise,
  completeExercise,
};
