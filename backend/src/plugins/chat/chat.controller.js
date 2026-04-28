'use strict';

const httpStatus = require('http-status');
const catchAsync = require('../../core/utils/asyncHandler');
const responseHelper = require('../../core/utils/apiResponse');

const createController = (container) => {
  const chatService = require('./chat.service')(container);

  const getMyRooms = catchAsync(async (req, res) => {
    const rooms = await chatService.getUserRooms(req.user.id);
    res.send(responseHelper.success(rooms));
  });

  const getRoom = catchAsync(async (req, res) => {
    const room = await chatService.getRoom(req.params.roomId, req.user.id);
    res.send(responseHelper.success(room));
  });

  const deleteRoom = catchAsync(async (req, res) => {
    await chatService.deleteRoom(req.params.roomId, req.user.id);
    res.send(responseHelper.success({ message: 'Room deleted' }));
  });

  const createRoom = catchAsync(async (req, res) => {
    const { participantIds } = req.body;
    // Always include current user in participants
    const participants = [...new Set([...participantIds, req.user.id])];
    const room = await chatService.createRoom(participants);
    res.status(httpStatus.CREATED).send(responseHelper.success(room));
  });

  const getMessages = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const { afterSeq, limit } = req.query;
    const messages = await chatService.getMessages(roomId, parseInt(afterSeq, 10), parseInt(limit, 10));
    res.send(responseHelper.success(messages));
  });

  const sendMessage = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const { text } = req.body;
    const message = await chatService.sendMessage(roomId, req.user.id, text);
    res.status(httpStatus.CREATED).send(responseHelper.success(message));
  });

  const markRead = catchAsync(async (req, res) => {
    const { roomId } = req.params;
    await chatService.markRead(roomId, req.user.id);
    res.send(responseHelper.success({ message: 'Marked as read' }));
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
