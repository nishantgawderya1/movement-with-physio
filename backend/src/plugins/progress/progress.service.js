'use strict';

const mongoose = require('mongoose');
const TrackingSession = require('../../models/TrackingSession.model');
const Booking = require('../../models/Booking.model');
const SessionNote = require('../../models/SessionNote.model');
const User = require('../../models/User.model');
const logger = require('../../core/utils/logger');

/**
 * Progress Plugin Service
 * Provides aggregation-based progress analytics for patients and therapists.
 *
 * @param {object} container - DI container
 */
module.exports = function createProgressService(container) {
  /**
   * Get a patient's overall progress summary.
   *
   * Returns:
   *  - totalSessions: number of completed tracking sessions
   *  - completedBookings: number of completed bookings
   *  - exerciseCompletionRate: avg % of exercises completed per session
   *  - avgPainReduction: average pain reduction per session (before - after)
   *  - streakDays: consecutive days with at least one completed session
   *
   * @param {string} patientId - Clerk user ID
   * @returns {Promise<object>}
   */
  async function getPatientProgress(patientId) {
    // TrackingSession.patientId and Booking.patientId are ObjectId refs.
    // patientId here is a Clerk string ID — resolve to MongoDB _id first.
    const userDoc = await User.findOne({ clerkId: patientId }).select('_id').lean();
    const patientObjId = userDoc?._id || null;

    const [sessionAgg, bookingCount, noteCount] = await Promise.all([
      patientObjId
        ? TrackingSession.aggregate([
            {
              $match: {
                patientId: patientObjId,
                status: 'completed',
                isDeleted: { $ne: true },
              },
            },
            {
              $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                avgPainBefore: { $avg: '$painScoreBefore' },
                avgPainAfter: { $avg: '$painScoreAfter' },
                totalExercises: { $sum: { $size: '$exercises' } },
                completedExercises: {
                  $sum: {
                    $size: {
                      $filter: {
                        input: '$exercises',
                        cond: { $ne: ['$$this.completedAt', null] },
                      },
                    },
                  },
                },
              },
            },
          ])
        : Promise.resolve([]),
      // Booking.patientId is ObjectId — use patientObjId
      patientObjId
        ? Booking.countDocuments({ patientId: patientObjId, status: 'completed' })
        : Promise.resolve(0),
      // SessionNote.patientId is String (Clerk ID) — use patientId directly
      SessionNote.countDocuments({ patientId }),
    ]);

    const stats = sessionAgg[0] || {
      totalSessions: 0,
      avgPainBefore: null,
      avgPainAfter: null,
      totalExercises: 0,
      completedExercises: 0,
    };

    const exerciseCompletionRate =
      stats.totalExercises > 0
        ? Math.round((stats.completedExercises / stats.totalExercises) * 100)
        : 0;

    const avgPainReduction =
      stats.avgPainBefore != null && stats.avgPainAfter != null
        ? parseFloat((stats.avgPainBefore - stats.avgPainAfter).toFixed(2))
        : null;

    return {
      totalSessions: stats.totalSessions,
      completedBookings: bookingCount,
      sessionNotesCount: noteCount,
      exerciseCompletionRate,
      avgPainReduction,
    };
  }

  /**
   * Get exercise completion statistics for a patient.
   *
   * Returns per-exercise completion counts and average pain reduction.
   *
   * @param {string} patientId
   * @returns {Promise<Array>}
   */
  async function getExerciseStats(patientId) {
    // Resolve Clerk string ID to ObjectId for TrackingSession query
    const userDoc = await User.findOne({ clerkId: patientId }).select('_id').lean();
    if (!userDoc) return [];
    const patientObjId = userDoc._id;

    return TrackingSession.aggregate([
      {
        $match: {
          patientId: patientObjId,
          status: 'completed',
          isDeleted: { $ne: true },
        },
      },
      { $unwind: '$exercises' },
      {
        $group: {
          _id: '$exercises.exerciseId',
          timesPerformed: { $sum: 1 },
          timesCompleted: {
            $sum: { $cond: [{ $ne: ['$exercises.completedAt', null] }, 1, 0] },
          },
          avgPainBefore: { $avg: '$exercises.painBefore' },
          avgPainAfter: { $avg: '$exercises.painAfter' },
          totalDurationSeconds: { $sum: '$exercises.durationSeconds' },
        },
      },
      {
        $lookup: {
          from: 'exercises',
          localField: '_id',
          foreignField: '_id',
          as: 'exercise',
        },
      },
      { $unwind: { path: '$exercise', preserveNullAndEmpty: true } },
      {
        $project: {
          exerciseId: '$_id',
          name: { $ifNull: ['$exercise.name', 'Unknown'] },
          bodyPart: '$exercise.bodyPart',
          timesPerformed: 1,
          timesCompleted: 1,
          completionRate: {
            $cond: [
              { $gt: ['$timesPerformed', 0] },
              { $multiply: [{ $divide: ['$timesCompleted', '$timesPerformed'] }, 100] },
              0,
            ],
          },
          avgPainBefore: { $round: ['$avgPainBefore', 1] },
          avgPainAfter: { $round: ['$avgPainAfter', 1] },
          totalDurationSeconds: 1,
        },
      },
      { $sort: { timesPerformed: -1 } },
    ]);
  }

  /**
   * Get weekly trend data for a patient.
   *
   * Returns one data point per week (last 12 weeks):
   *   { week, sessionsCompleted, avgPainScore, exercisesCompleted }
   *
   * @param {string} patientId
   * @returns {Promise<Array>}
   */
  async function getTrends(patientId) {
    // Resolve Clerk string ID to ObjectId for TrackingSession query
    const userDoc = await User.findOne({ clerkId: patientId }).select('_id').lean();
    if (!userDoc) return [];
    const patientObjId = userDoc._id;

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    return TrackingSession.aggregate([
      {
        $match: {
          patientId: patientObjId,
          status: 'completed',
          isDeleted: { $ne: true },
          completedAt: { $gte: twelveWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$completedAt' },
            week: { $isoWeek: '$completedAt' },
          },
          sessionsCompleted: { $sum: 1 },
          avgPainAfter: { $avg: '$painScoreAfter' },
          exercisesCompleted: {
            $sum: {
              $size: {
                $filter: {
                  input: '$exercises',
                  cond: { $ne: ['$$this.completedAt', null] },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          week: '$_id.week',
          sessionsCompleted: 1,
          avgPainScore: { $round: ['$avgPainAfter', 1] },
          exercisesCompleted: 1,
        },
      },
      { $sort: { year: 1, week: 1 } },
    ]);
  }

  /**
   * Export patient progress as a structured JSON report.
   *
   * @param {string} patientId
   * @returns {Promise<object>}
   */
  async function exportProgress(patientId) {
    const [summary, exerciseStats, trends] = await Promise.all([
      getPatientProgress(patientId),
      getExerciseStats(patientId),
      getTrends(patientId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      patientId,
      summary,
      exerciseStats,
      weeklyTrends: trends,
    };
  }

  return { getPatientProgress, getExerciseStats, getTrends, exportProgress };
};
