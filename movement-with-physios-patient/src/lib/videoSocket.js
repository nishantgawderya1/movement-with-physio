/**
 * videoSocket — Socket.IO client singleton for the /video namespace.
 *
 * Ported from movement-with-physios/apps/therapist/src/lib/videoSocket.js
 *  — patient role flipped to offerer in useVideoCall hook (Batch 2).
 *  — patient style: `var` declarations + JSDoc, matching the sibling
 *    chatSocket.js. Therapist file used `const`/`let` + arrow functions.
 *
 * Mirrors the chatSocket pattern (same Clerk token handshake, same
 * reconnection model, same on/off/emit surface). The backend's
 * src/plugins/video/index.js handles 'join_call', 'offer', 'answer',
 * 'ice_candidate', and 'end_call' events on this namespace.
 *
 * Token is refreshed on every reconnect attempt so expired Clerk
 * sessions are replaced transparently.
 *
 * NOTE: This singleton is NOT auto-connected from ClerkTokenBridge.
 * Unlike chatSocket, video calls are infrequent — screens (pre-call
 * lobby, video call) call videoSocket.connect() lazily.
 */

import { io } from 'socket.io-client';
import { tokenProvider } from './tokenProvider';

var BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
var NAMESPACE = '/video';

var _socket = null;
var _connecting = false;
var _listeners = new Map(); // event -> Set<callback>

/**
 * Lazily build the Socket.IO instance for the /video namespace.
 * Idempotent — safe to call from multiple screens; subsequent calls
 * return the same connected socket.
 *
 * @returns {Promise<object|null>} socket instance, or null on misconfig
 */
async function connect() {
  if (_socket && _socket.connected) return _socket;
  if (_connecting) return _socket;
  if (!BASE_URL) return null;

  _connecting = true;

  var token = await tokenProvider.getToken();
  if (!token) {
    _connecting = false;
    return null;
  }

  if (!_socket) {
    _socket = io(BASE_URL + NAMESPACE, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: { token: token },
    });

    // Always refresh the token before every reconnect attempt — without
    // this, an expired Clerk JWT will 401 silently and the call will
    // appear "stuck connecting".
    _socket.io.on('reconnect_attempt', async function () {
      var fresh = await tokenProvider.getToken();
      if (fresh) _socket.auth = { token: fresh };
    });

    // Re-attach any listeners that were registered before connect()
    _listeners.forEach(function (callbacks, event) {
      callbacks.forEach(function (cb) {
        _socket.on(event, cb);
      });
    });
  } else {
    _socket.auth = { token: token };
  }

  _socket.connect();
  _connecting = false;
  return _socket;
}

/**
 * Tear down the connection. Safe to call when not connected.
 */
function disconnect() {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
  _listeners.clear();
}

/**
 * Subscribe to a server event. Returns an unsubscribe function.
 * Listeners are queued if the socket hasn't been created yet and attached
 * automatically on connect.
 *
 * @param {string} event
 * @param {(...args: any[]) => void} cb
 * @returns {() => void} unsubscribe
 */
function on(event, cb) {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(cb);
  if (_socket) _socket.on(event, cb);

  return function () { off(event, cb); };
}

/**
 * Unsubscribe from a server event.
 *
 * @param {string} event
 * @param {Function} cb
 */
function off(event, cb) {
  if (_listeners.has(event)) _listeners.get(event).delete(cb);
  if (_socket) _socket.off(event, cb);
}

/**
 * Emit a client → server event. Fails silently when disconnected; the
 * caller is responsible for any HTTP fallback (e.g. apiLeaveCall as a
 * backstop for end_call).
 *
 * @param {string} event
 * @param {*} payload
 */
function emit(event, payload) {
  if (_socket && _socket.connected) {
    _socket.emit(event, payload);
  }
}

/**
 * @returns {boolean}
 */
function isConnected() {
  return !!(_socket && _socket.connected);
}

export var videoSocket = {
  connect: connect,
  disconnect: disconnect,
  on: on,
  off: off,
  emit: emit,
  isConnected: isConnected,
};
