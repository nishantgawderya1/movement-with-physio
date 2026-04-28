'use strict';

const SessionNote = require('../../models/SessionNote.model');
const paginate = require('../../core/utils/paginator');
const logger = require('../../core/utils/logger');

/**
 * Session Plugin Service
 * All functions are factory-style, receiving the DI container.
 *
 * @param {object} container
 */
module.exports = function createSessionService(container) {
  /**
   * Create session notes for a booking.
   * Triggers a push notification to the patient.
   *
   * @param {string} therapistId
   * @param {object} data - { bookingId, patientId, notes, painLevel, mobility, nextSteps }
   * @returns {Promise<SessionNote>}
   */
  async function createNote(therapistId, data) {
    const note = await SessionNote.create({ therapistId, ...data });

    // Push trigger — notify patient
    try {
      const User = require('../../models/User.model');
      const patient = await User.findOne({ clerkId: data.patientId }).lean();
      if (patient?.fcmToken && container?.notification) {
        await container.notification.sendPush({
          token: patient.fcmToken,
          title: 'Session Notes Available',
          body: 'Your therapist has added notes for your recent session.',
          data: { type: 'session_notes_added', noteId: String(note._id) },
        });
      }
    } catch (pushErr) {
      logger.warn({ event: 'SESSION_NOTE_PUSH_FAILED', err: pushErr.message });
    }

    logger.info({ event: 'SESSION_NOTE_CREATED', noteId: note._id, therapistId });
    return note;
  }

  /**
   * Get notes for a specific booking.
   *
   * @param {string} bookingId
   * @param {string} requesterId - Clerk ID of the requester
   * @param {'patient'|'therapist'} requesterRole
   * @returns {Promise<SessionNote|null>}
   */
  async function getNoteByBooking(bookingId, requesterId, requesterRole) {
    const query = { bookingId };
    if (requesterRole === 'patient') query.patientId = requesterId;
    if (requesterRole === 'therapist') query.therapistId = requesterId;

    return SessionNote.findOne(query).lean();
  }

  /**
   * Update session notes (therapist only).
   *
   * @param {string} noteId
   * @param {string} therapistId
   * @param {object} updates - { notes, painLevel, mobility, nextSteps }
   * @returns {Promise<SessionNote>}
   */
  async function updateNote(noteId, therapistId, updates) {
    const note = await SessionNote.findOneAndUpdate(
      { _id: noteId, therapistId },
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!note) throw Object.assign(new Error('Session note not found or access denied'), { statusCode: 404 });

    logger.info({ event: 'SESSION_NOTE_UPDATED', noteId, therapistId });
    return note;
  }

  /**
   * List all notes for a therapist-patient pair (paginated).
   *
   * @param {string} requesterId
   * @param {'patient'|'therapist'} requesterRole
   * @param {object} paginationOpts
   */
  async function listNotes(requesterId, requesterRole, paginationOpts = {}) {
    const query = {};
    if (requesterRole === 'patient') query.patientId = requesterId;
    if (requesterRole === 'therapist') query.therapistId = requesterId;

    return paginate(SessionNote, query, { ...paginationOpts, sort: { createdAt: -1 } });
  }

  return { createNote, getNoteByBooking, updateNote, listNotes };
};
