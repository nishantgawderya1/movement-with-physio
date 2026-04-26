'use strict';

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Socket.IO handshake authentication middleware.
 *
 * Expects: socket.handshake.auth.token = <Clerk session token>
 * Sets:    socket.data.user = { id, email, role }
 *          socket.data.correlationId
 *
 * @param {object} authProvider - instance implementing AuthProvider interface
 * @returns {Function} Socket.IO middleware
 */
function socketAuthMiddleware(authProvider) {
  return async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      logger.warn({ event: 'SOCKET_AUTH_MISSING', socketId: socket.id });
      return next(new Error('No auth token'));
    }

    try {
      const user = await authProvider.verifyToken(token);
      socket.data.user = user;
      socket.data.correlationId = socket.handshake.auth?.correlationId || uuidv4();
      logger.info({
        event: 'SOCKET_AUTHENTICATED',
        userId: user.id,
        socketId: socket.id,
      });
      next();
    } catch (err) {
      logger.warn({ event: 'SOCKET_AUTH_FAILED', socketId: socket.id, err: err.message });
      next(new Error('Unauthorized'));
    }
  };
}

module.exports = socketAuthMiddleware;
