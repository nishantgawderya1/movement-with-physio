'use strict';

const catchAsync = require('../../core/utils/asyncHandler');
const responseHelper = require('../../core/utils/apiResponse');
const { loadCallForParticipant } = require('./videoCall.controller');

const createController = (container) => {
  const videoService = require('./video.service')(container);

  const createCall = catchAsync(async (req, res) => {
    const { participantIds, roomId } = req.body;
    const call = await videoService.createCall(req.user.id, participantIds, roomId);
    return responseHelper.success(res, call, 201);
  });

  const endCall = catchAsync(async (req, res) => {
    const { call, userId } = await loadCallForParticipant(req);
    await videoService.endCall(call._id, userId);
    return responseHelper.success(res, { message: 'Call ended' });
  });

  return {
    createCall,
    endCall,
  };
};

module.exports = {
  createController,
};
