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
const User = require('../../models/User.model');

/**
 * Cache of Clerk userId → Mongo User._id, populated lazily per socket
 * connection. Avoids a DB hit on every socket event.
 * @type {Map<string, string>}
 */
const _socketUserIdCache = new Map();

async function resolveMongoIdForSocket(socket) {
  const clerkId = socket.data.user.id;
  let mongoId = _socketUserIdCache.get(clerkId);
  if (mongoId) return mongoId;
  const user = await User.findOne({ clerkId }).select('_id').lean();
  if (!user) throw new Error('User profile not found');
  mongoId = String(user._id);
  _socketUserIdCache.set(clerkId, mongoId);
  return mongoId;
}

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
        mongoUserId = await resolveMongoIdForSocket(socket);
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
        await chatService.markRead(roomId, mongoUserId);
        socket.to(roomId).emit('read_by', { roomId, userId: mongoUserId });
      });

      socket.on('disconnect', () => {
        _socketUserIdCache.delete(clerkId);
        logger.info({ event: 'CHAT_SOCKET_DISCONNECTED', userId: mongoUserId, socketId: socket.id });
      });
    });
  }
}

module.exports = ChatPlugin;
