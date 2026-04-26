'use strict';

const MessagingProvider = require('../interfaces/MessagingProvider');
const logger = require('../../core/utils/logger');

/**
 * Socket.IO adapter — implements MessagingProvider.
 * The io server instance is injected after Socket.IO is created in server.js.
 */
class SocketIOAdapter extends MessagingProvider {
  constructor() {
    super();
    this.io = null;
  }

  /**
   * Inject the Socket.IO server instance.
   * Called from server.js after `new Server(httpServer)`.
   * @param {import('socket.io').Server} io
   */
  setServer(io) {
    this.io = io;
    logger.info({ event: 'SOCKETIO_ADAPTER_READY' });
  }

  /**
   * Emit an event to all sockets in a room.
   * @param {string} roomId
   * @param {string} event
   * @param {*} data
   */
  emitToRoom(roomId, event, data) {
    if (!this.io) {
      logger.warn({ event: 'SOCKETIO_NOT_READY', action: 'emitToRoom' });
      return;
    }
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Emit an event to all sockets belonging to a specific user.
   * Relies on the convention that users join a personal room named after their userId.
   * @param {string} userId
   * @param {string} event
   * @param {*} data
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      logger.warn({ event: 'SOCKETIO_NOT_READY', action: 'emitToUser' });
      return;
    }
    this.io.to(`user:${userId}`).emit(event, data);
  }
}

module.exports = SocketIOAdapter;
