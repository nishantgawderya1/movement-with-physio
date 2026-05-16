/**
 * chatSocket — Socket.IO client singleton for the /chat namespace.
 *
 * Pure JS; works in Expo Go and native builds with no native module changes.
 * Tokens are refreshed on every reconnect attempt so expired Clerk sessions
 * are replaced transparently.
 */

import { io } from 'socket.io-client';
import { tokenProvider } from './tokenProvider';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const NAMESPACE = '/chat';

let _socket = null;
let _connecting = false;
const _listeners = new Map(); // event -> Set<callback>

async function connect() {
  if (_socket && _socket.connected) return _socket;
  if (_connecting) return _socket;
  if (!BASE_URL) return null;

  _connecting = true;

  const token = await tokenProvider.getToken();
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
      auth: { token },
    });

    _socket.io.on('reconnect_attempt', async () => {
      const fresh = await tokenProvider.getToken();
      if (fresh) _socket.auth = { token: fresh };
    });

    _listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => _socket.on(event, cb));
    });
  } else {
    _socket.auth = { token };
  }

  _socket.connect();
  _connecting = false;
  return _socket;
}

function disconnect() {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
  _listeners.clear();
}

function on(event, cb) {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(cb);
  if (_socket) _socket.on(event, cb);
  return () => off(event, cb);
}

function off(event, cb) {
  if (_listeners.has(event)) _listeners.get(event).delete(cb);
  if (_socket) _socket.off(event, cb);
}

function emit(event, payload) {
  if (_socket && _socket.connected) _socket.emit(event, payload);
}

function isConnected() {
  return !!(_socket && _socket.connected);
}

export const chatSocket = {
  connect,
  disconnect,
  on,
  off,
  emit,
  isConnected,
};
