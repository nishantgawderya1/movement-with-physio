'use strict';

/**
 * MessagingProvider interface.
 * All real-time messaging adapters must implement these methods.
 */
class MessagingProvider {
  /**
   * Emit an event to all sockets in a room.
   * @param {string} roomId
   * @param {string} event
   * @param {*} data
   */
  emitToRoom(roomId, event, data) {
    throw new Error('MessagingProvider.emitToRoom() not implemented');
  }

  /**
   * Emit an event to a specific user (all their sockets).
   * @param {string} userId
   * @param {string} event
   * @param {*} data
   */
  emitToUser(userId, event, data) {
    throw new Error('MessagingProvider.emitToUser() not implemented');
  }
  /**
   * Emit an event to a room on a specific namespace.
   * @param {string} namespace
   * @param {string} roomId
   * @param {string} event
   * @param {*} data
   */
  emitToRoomOnNamespace(namespace, roomId, event, data) {
    throw new Error('MessagingProvider.emitToRoomOnNamespace() not implemented');
  }

  /**
   * Emit an event to a user on a specific namespace.
   * @param {string} namespace
   * @param {string} userId
   * @param {string} event
   * @param {*} data
   */
  emitToUserOnNamespace(namespace, userId, event, data) {
    throw new Error('MessagingProvider.emitToUserOnNamespace() not implemented');
  }
}

module.exports = MessagingProvider;
