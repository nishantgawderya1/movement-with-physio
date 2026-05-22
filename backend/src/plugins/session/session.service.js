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
    const User = require('../../models/User.model');
    const Booking = require('../../models/Booking.model');
    const { BOOKING_STATUS } = require('../../core/utils/constants');

    // Resolve Clerk IDs → Mongo ObjectIds for the relationship gate.
    // Patient lookup is reused for the push notification below.
    const [therapist, patient] = await Promise.all([
      User.findOne({ clerkId: therapistId }).select('_id').lean(),
      User.findOne({ clerkId: data.patientId }).select('_id fcmToken').lean(),
    ]);
    if (!therapist || !patient) {
      throw Object.assign(new Error('Therapist or patient not found'), {
        statusCode: 404, code: 'USER_NOT_FOUND',
      });
    }

    // Ownership gate — therapist must have a CONFIRMED or COMPLETED booking
    // with this patient, and the bookingId must belong to that pair. Mirrors
    // booking.service.js createInstantBooking prior-relationship gate.
    const hasRelationship = await Booking.exists({
      _id: data.bookingId,
      therapistId: therapist._id,
      patientId: patient._id,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] },
      isDeleted: false,
    });
    if (!hasRelationship) {
      throw Object.assign(
        new Error('You do not have an active booking with this patient.'),
        { statusCode: 403, code: 'NO_PATIENT_RELATIONSHIP' }
      );
    }

    const note = await SessionNote.create({ therapistId, ...data });

    // Push trigger — notify patient. Patient already resolved above.
    try {
      if (patient.fcmToken && container?.notification) {
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

    // Fused 404+403: query is { _id: noteId, therapistId }, so a miss
    // could be "doesn't exist" or "not your note". Keeping single code
    // (SESSION_NOTE_NOT_FOUND, not SESSION_NOTE_FORBIDDEN) preserves
    // oracle-resistance — same code regardless of which condition failed.
    if (!note) {
      throw Object.assign(new Error('Session note not found or access denied'), {
        statusCode: 404, code: 'SESSION_NOTE_NOT_FOUND',
      });
    }

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
