'use strict';

const catchAsync = require('../../core/utils/asyncHandler');
const responseHelper = require('../../core/utils/apiResponse');
const User = require('../../models/User.model');

/**
 * Resolve the current request's Mongo User._id from the Clerk session userId.
 * The chat schema stores ObjectIds, so we must translate before persisting
 * or comparing against participants/sender.
 * @param {import('express').Request} req
 * @returns {Promise<string>} Mongo ObjectId as string
 */
async function resolveMongoUserId(req) {
  if (req.user && req.user.mongoId) return req.user.mongoId;
  const user = await User.findOne({ clerkId: req.user.id }).select('_id').lean();
  if (!user) {
    const err = new Error('User profile not found');
    err.statusCode = 404;
    throw err;
  }
  req.user.mongoId = String(user._id);
  return req.user.mongoId;
}

const createController = (container) => {
  const chatService = require('./chat.service')(container);

  const getMyRooms = catchAsync(async (req, res) => {
    const myId = await resolveMongoUserId(req);
    const rooms = await chatService.getUserRooms(myId);
    return responseHelper.success(res, rooms);
  });

  const getRoom = catchAsync(async (req, res) => {
    const myId = await resolveMongoUserId(req);
    const room = await chatService.getRoom(req.params.roomId, myId);
    return responseHelper.success(res, room);
  });

  const deleteRoom = catchAsync(async (req, res) => {
    const myId = await resolveMongoUserId(req);
    await chatService.deleteRoom(req.params.roomId, myId);
    return responseHelper.success(res, { message: 'Room deleted' });
  });

  const createRoom = catchAsync(async (req, res) => {
    const myId = await resolveMongoUserId(req);
    const { participantIds } = req.body;
    // Always include current user (as a Mongo ObjectId) in participants.
    const participants = [...new Set([...participantIds, myId])];
    const room = await chatService.createRoom(participants);
    return responseHelper.success(res, room, 201);
  });

  const getMessages = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const { afterSeq, limit } = req.query;
    const messages = await chatService.getMessages(roomId, Number(afterSeq) || 0, Number(limit) || 50);
    return responseHelper.success(res, messages);
  });

  const sendMessage = catchAsync(async (req, res) => {
    const myId = await resolveMongoUserId(req);
    const { roomId } = req.params;
    const { text } = req.body;
    const message = await chatService.sendMessage(roomId, myId, text);
    return responseHelper.success(res, message, 201);
  });

  const markRead = catchAsync(async (req, res) => {
    const myId = await resolveMongoUserId(req);
    const { roomId } = req.params;
    await chatService.markRead(roomId, myId);
    return responseHelper.success(res, { message: 'Marked as read' });
  });

  return {
    getMyRooms,
    getRoom,
    deleteRoom,
    createRoom,
    getMessages,
    sendMessage,
    markRead,
  };
};

module.exports = {
  createController,
};
