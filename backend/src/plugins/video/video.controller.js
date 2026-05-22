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

  const getCall = catchAsync(async (req, res) => {
    const call = await videoService.getCall(req.params.callId);
    return responseHelper.success(res, call);
  });

  const endCall = catchAsync(async (req, res) => {
    const { call, userId } = await loadCallForParticipant(req);
    await videoService.endCall(call._id, userId);
    return responseHelper.success(res, { message: 'Call ended' });
  });

  const getTurnCredentials = catchAsync(async (req, res) => {
    const credentials = await videoService.getTurnCredentials();
    return responseHelper.success(res, credentials);
  });

  return {
    createCall,
    getCall,
    endCall,
    getTurnCredentials,
  };
};

module.exports = {
  createController,
};
