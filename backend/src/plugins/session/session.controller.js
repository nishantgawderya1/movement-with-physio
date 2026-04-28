'use strict';

const apiResponse = require('../../core/utils/apiResponse');
const asyncHandler = require('../../core/utils/asyncHandler');

/**
 * Session controller factory.
 * @param {object} sessionService - instance of session.service
 */
function createController(sessionService) {
  /**
   * POST /api/v1/session/notes
   * Create session notes (therapist only).
   */
  const createNote = asyncHandler(async (req, res) => {
    const therapistId = req.user.id;
    const note = await sessionService.createNote(therapistId, req.body);
    return apiResponse.success(res, note, 201);
  });

  /**
   * GET /api/v1/session/notes/booking/:bookingId
   * Get notes for a specific booking (therapist or patient).
   */
  const getNoteByBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const note = await sessionService.getNoteByBooking(bookingId, req.user.id, req.user.role);
    if (!note) {
      return apiResponse.error(res, 'Session note not found', 404);
    }
    return apiResponse.success(res, note);
  });

  /**
   * PATCH /api/v1/session/notes/:noteId
   * Update session notes (therapist only).
   */
  const updateNote = asyncHandler(async (req, res) => {
    const note = await sessionService.updateNote(req.params.noteId, req.user.id, req.body);
    return apiResponse.success(res, note);
  });

  /**
   * GET /api/v1/session/notes
   * List all notes for the authenticated user (paginated).
   */
  const listNotes = asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;
    const result = await sessionService.listNotes(req.user.id, req.user.role, {
      cursor,
      limit: Number(limit) || 20,
    });
    return apiResponse.paginated(res, result.data, result.pagination);
  });

  return { createNote, getNoteByBooking, updateNote, listNotes };
}

module.exports = { createController };
