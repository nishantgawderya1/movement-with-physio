'use strict';

const { Router } = require('express');
const { createController } = require('./video.controller');
const authMiddleware = require('../../../core/middleware/authMiddleware');
const validate = require('../../../core/middleware/validate');
const videoValidation = require('./video.validation');
const PluginBase = require('../../../core/plugins/PluginBase');
const auditLog = require('../../../core/middleware/auditLog');
const logger = require('../../../core/utils/logger');

class VideoPlugin extends PluginBase {
  get name() { return 'video'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const controller = createController(container);
    const videoService = require('./video.service')(container);
    const router = Router();

    // REST Routes
    router.post('/calls', authMiddleware, auditLog('CREATE_VIDEO_CALL', 'video'), validate(videoValidation.createCall), controller.createCall);
    router.get('/calls/:callId', authMiddleware, validate(videoValidation.getCall), controller.getCall);
    router.post('/calls/:callId/end', authMiddleware, auditLog('END_VIDEO_CALL', 'video'), controller.endCall);
    router.get('/turn-credentials', authMiddleware, controller.getTurnCredentials);

    app.use('/api/v1/video', router);

    // Socket.IO Handlers
    const io = app.get('io');
    if (io) {
      this.setupSocketHandlers(io, videoService);
    }
  }

  setupSocketHandlers(io, videoService) {
    const videoNamespace = io.of('/video');

    videoNamespace.on('connection', (socket) => {
      const userId = socket.data.user?.id;
      if (!userId) return;

      logger.info({ event: 'VIDEO_SOCKET_CONNECTED', userId, socketId: socket.id });

      socket.on('join_call', ({ callId }) => {
        socket.join(`call:${callId}`);
        logger.info({ event: 'VIDEO_JOIN_CALL', userId, callId });
        socket.to(`call:${callId}`).emit('user_joined', { userId });
      });

      // WebRTC Signaling
      socket.on('offer', ({ callId, to, offer }) => {
        socket.to(`call:${callId}`).emit('offer', { from: userId, offer, to });
      });

      socket.on('answer', ({ callId, to, answer }) => {
        socket.to(`call:${callId}`).emit('answer', { from: userId, answer, to });
      });

      socket.on('ice_candidate', ({ callId, to, candidate }) => {
        socket.to(`call:${callId}`).emit('ice_candidate', { from: userId, candidate, to });
      });

      socket.on('end_call', async ({ callId }) => {
        await videoService.endCall(callId);
        socket.to(`call:${callId}`).emit('call_ended', { callId, endedBy: userId });
      });

      socket.on('disconnect', () => {
        logger.info({ event: 'VIDEO_SOCKET_DISCONNECTED', userId, socketId: socket.id });
      });
    });
  }
}

module.exports = VideoPlugin;
