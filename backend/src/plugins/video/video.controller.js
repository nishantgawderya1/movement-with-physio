'use strict';

const httpStatus = require('http-status');
const catchAsync = require('../../core/utils/asyncHandler');
const responseHelper = require('../../core/utils/apiResponse');

const createController = (container) => {
  const videoService = require('./video.service')(container);

  const createCall = catchAsync(async (req, res) => {
    const { participantIds, roomId } = req.body;
    const call = await videoService.createCall(req.user.id, participantIds, roomId);
    res.status(httpStatus.CREATED).send(responseHelper.success(call));
  });

  const getCall = catchAsync(async (req, res) => {
    const call = await videoService.getCall(req.params.callId);
    res.send(responseHelper.success(call));
  });

  const endCall = catchAsync(async (req, res) => {
    await videoService.endCall(req.params.callId);
    res.send(responseHelper.success({ message: 'Call ended' }));
  });

  const getTurnCredentials = catchAsync(async (req, res) => {
    const credentials = await videoService.getTurnCredentials();
    res.send(responseHelper.success(credentials));
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
