'use strict';

const { Router } = require('express');
const { createController } = require('./video.controller');
const { getIceConfig } = require('./iceConfig.controller');
const videoCallController = require('./videoCall.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const validate = require('../../core/middleware/validate');
const videoValidation = require('./video.validation');
const PluginBase = require('../../core/plugins/PluginBase');
const auditLog = require('../../core/middleware/auditLog');
const logger = require('../../core/utils/logger');

class VideoPlugin extends PluginBase {
  get name() { return 'video'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const controller = createController(container);
    const videoService = require('./video.service')(container);
    const router = Router();

    // REST Routes
    router.post('/calls', authMiddleware, auditLog('CREATE_VIDEO_CALL', 'video'), validate(videoValidation.createCall), controller.createCall);
    // Phase 2: enriched call view — participant-checked, includes canJoin,
    // otherParty, assessmentMode. Replaces the legacy thin getCall (legacy
    // version pre-Phase-2 returned a populated mongoose doc without
    // participant enforcement; nothing in the live mobile apps depended
    // on the old shape so we're upgrading in-place).
    router.get('/calls/:callId', authMiddleware, validate(videoValidation.getCall), videoCallController.getCall);
    router.post('/calls/:callId/end', authMiddleware, auditLog('END_VIDEO_CALL', 'video'), controller.endCall);
    router.get('/turn-credentials', authMiddleware, controller.getTurnCredentials);

    // Phase 2: Metered ICE config endpoint — returns short-lived TURN
    // credentials. Replaces the legacy /turn-credentials for new clients.
    router.get('/ice-config', authMiddleware, getIceConfig);

    // Phase 2: call lifecycle — join records the participant and returns
    // ICE config inline; leave finalizes state and triggers the PDF job.
    router.post('/calls/:callId/join', authMiddleware, auditLog('JOIN_VIDEO_CALL', 'video'), videoCallController.joinCall);
    router.post('/calls/:callId/leave', authMiddleware, auditLog('LEAVE_VIDEO_CALL', 'video'), videoCallController.leaveCall);

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
        // endCall now broadcasts call_ended via messaging.emitToRoom — no
        // duplicate socket.to(...) emit needed.
        await videoService.endCall(callId, userId);
      });

      socket.on('disconnect', async () => {
        // Force-quit safety net: a participant who dropped without saying
        // 'end_call' (network loss, app killed) gets their leftAt recorded
        // and any call rooms they were in marked as ended. socket.rooms
        // includes the per-user room plus each call:* room they joined.
        for (const room of socket.rooms) {
          if (typeof room === 'string' && room.startsWith('call:')) {
            const callId = room.slice('call:'.length);
            try {
              await videoService.endCall(callId, userId);
            } catch (e) {
              logger.warn({ event: 'VIDEO_DISCONNECT_END_FAILED', callId, err: e.message });
            }
          }
        }
        logger.info({ event: 'VIDEO_SOCKET_DISCONNECTED', userId, socketId: socket.id });
      });
    });
  }
}

module.exports = VideoPlugin;
