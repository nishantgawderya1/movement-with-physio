'use strict';

const { Router } = require('express');
const { createController } = require('./chat.controller');
const authMiddleware = require('../../../core/middleware/authMiddleware');
const validate = require('../../../core/middleware/validate');
const chatValidation = require('./chat.validation');
const PluginBase = require('../../../core/plugins/PluginBase');
const auditLog = require('../../../core/middleware/auditLog');
const logger = require('../../../core/utils/logger');

class ChatPlugin extends PluginBase {
  get name() { return 'chat'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const controller = createController(container);
    const chatService = require('./chat.service')(container);
    const router = Router();

    // REST Routes
    router.get('/rooms', authMiddleware, controller.getMyRooms);
    router.post('/rooms', authMiddleware, auditLog('CREATE_CHAT_ROOM', 'chat'), validate(chatValidation.createRoom), controller.createRoom);
    router.get('/rooms/:roomId', authMiddleware, controller.getRoom);
    router.delete('/rooms/:roomId', authMiddleware, auditLog('DELETE_CHAT_ROOM', 'chat'), controller.deleteRoom);
    router.get('/rooms/:roomId/messages', authMiddleware, validate(chatValidation.getMessages), controller.getMessages);
    router.post('/rooms/:roomId/messages', authMiddleware, validate(chatValidation.sendMessage), controller.sendMessage);
    router.post('/rooms/:roomId/read', authMiddleware, controller.markRead);

    app.use('/api/v1/chat', router);

    // Socket.IO Handlers
    const io = app.get('io');
    if (io) {
      this.setupSocketHandlers(io, chatService);
    } else {
      logger.warn({ event: 'CHAT_SOCKET_IO_NOT_FOUND' });
    }
  }

  setupSocketHandlers(io, chatService) {
    const chatNamespace = io.of('/chat');

    chatNamespace.on('connection', (socket) => {
      const userId = socket.data.user?.id;
      if (!userId) return;

      logger.info({ event: 'CHAT_SOCKET_CONNECTED', userId, socketId: socket.id });

      // Join rooms on connection (or on demand)
      socket.on('join_room', async ({ roomId }) => {
        // In a real app, verify user is participant
        socket.join(roomId);
        logger.info({ event: 'CHAT_JOIN_ROOM', userId, roomId });
      });

      socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('typing', { roomId, userId, isTyping });
      });

      socket.on('send_message', async ({ roomId, text }) => {
        try {
          const message = await chatService.sendMessage(roomId, userId, text);
          // Note: chatService.sendMessage already emits 'new_message' to the room via messaging provider
          // But we can also acknowledge the sender here if needed
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('mark_read', async ({ roomId }) => {
        await chatService.markRead(roomId, userId);
        socket.to(roomId).emit('read_by', { roomId, userId });
      });

      socket.on('disconnect', () => {
        logger.info({ event: 'CHAT_SOCKET_DISCONNECTED', userId, socketId: socket.id });
      });
    });
  }
}

module.exports = ChatPlugin;
