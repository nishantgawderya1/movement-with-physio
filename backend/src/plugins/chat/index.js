'use strict';

const { Router } = require('express');
const { createController } = require('./chat.controller');
const authMiddleware = require('../../core/middleware/authMiddleware');
const socketAuthMiddleware = require('../../core/middleware/socketAuthMiddleware');
const validate = require('../../core/middleware/validate');
const chatValidation = require('./chat.validation');
const PluginBase = require('../../core/plugins/PluginBase');
const auditLog = require('../../core/middleware/auditLog');
const logger = require('../../core/utils/logger');
const {
  resolveMongoUserIdForSocket,
  forgetSocketIdentity,
} = require('../../core/utils/socketIdentity');

class ChatPlugin extends PluginBase {
  get name() { return 'chat'; }
  get version() { return '1.0.0'; }

  async register(app, container) {
    const controller = createController(container);
    const chatService = require('./chat.service')(container);
    // Expose the namespace-injected singleton so other modules (e.g. the
    // cancel→chat hook in booking.service.cancelBooking) reach THIS instance
    // via container.chat. A fresh ChatService built elsewhere would have a
    // null namespace and emit on the default ns, breaking live /chat delivery.
    // setNamespace (below, in setupSocketHandlers) mutates this same instance.
    container.chat = chatService;
    const router = Router();

    // REST Routes
    router.get('/rooms', authMiddleware, controller.getMyRooms);
    router.post('/rooms', authMiddleware, auditLog('CREATE_CHAT_ROOM', 'chat'), validate(chatValidation.createRoom), controller.createRoom);
    router.get('/rooms/:roomId', authMiddleware, controller.getRoom);
    router.delete('/rooms/:roomId', authMiddleware, auditLog('DELETE_CHAT_ROOM', 'chat'), controller.deleteRoom);
    router.get('/rooms/:roomId/messages', authMiddleware, validate(chatValidation.getMessages, { source: 'query' }), controller.getMessages);
    router.post('/rooms/:roomId/messages', authMiddleware, validate(chatValidation.sendMessage), controller.sendMessage);
    router.post('/rooms/:roomId/read', authMiddleware, controller.markRead);

    app.use('/api/v1/chat', router);

    // Socket.IO Handlers
    const io = app.get('io');
    if (io) {
      this.setupSocketHandlers(io, chatService, container.auth);
    } else {
      logger.warn({ event: 'CHAT_SOCKET_IO_NOT_FOUND' });
    }
  }

  setupSocketHandlers(io, chatService, authProvider) {
    const chatNamespace = io.of('/chat');

    // Root io.use() does NOT cascade to child namespaces, so we apply the
    // same Clerk session check here. Without this, socket.data.user is
    // undefined and the connection handler bails silently.
    chatNamespace.use(socketAuthMiddleware(authProvider));

    // Expose the namespace to the service so sendMessage emits to clients
    // that are actually connected to `/chat`, not the default namespace.
    chatService.setNamespace(chatNamespace);

    chatNamespace.on('connection', async (socket) => {
      const clerkId = socket.data.user?.id;
      if (!clerkId) return;

      let mongoUserId;
      try {
        mongoUserId = await resolveMongoUserIdForSocket(socket);
      } catch (err) {
        logger.warn({ event: 'CHAT_SOCKET_NO_PROFILE', clerkId, err: err.message });
        socket.disconnect(true);
        return;
      }

      logger.info({ event: 'CHAT_SOCKET_CONNECTED', userId: mongoUserId, socketId: socket.id });

      socket.on('join_room', ({ roomId }) => {
        socket.join(roomId);
        logger.info({ event: 'CHAT_JOIN_ROOM', userId: mongoUserId, roomId });
      });

      socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('typing', { roomId, userId: mongoUserId, isTyping });
      });

      socket.on('send_message', async ({ roomId, text }) => {
        try {
          await chatService.sendMessage(roomId, mongoUserId, text);
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('mark_read', async ({ roomId }) => {
        try {
          await chatService.markRead(roomId, mongoUserId);
          socket.to(roomId).emit('read_by', { roomId, userId: mongoUserId });
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('disconnect', () => {
        forgetSocketIdentity(clerkId);
        logger.info({ event: 'CHAT_SOCKET_DISCONNECTED', userId: mongoUserId, socketId: socket.id });
      });
    });
  }
}

module.exports = ChatPlugin;
