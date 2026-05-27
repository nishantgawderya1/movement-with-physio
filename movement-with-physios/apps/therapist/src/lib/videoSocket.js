/**
 * videoSocket — Socket.IO client singleton for the /video namespace.
 *
 * Mirrors the chatSocket pattern (same Clerk token handshake, same
 * reconnection model, same on/off/emit surface). The backend's
 * src/plugins/video/index.js handles 'join_call', 'offer', 'answer',
 * 'ice_candidate', and 'end_call' events on this namespace.
 *
 * Token is refreshed on every reconnect attempt so expired Clerk
 * sessions are replaced transparently.
 */

import { io } from 'socket.io-client';
import { tokenProvider } from './tokenProvider';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const NAMESPACE = '/video';

let _socket = null;
let _connecting = false;
const _listeners = new Map(); // event -> Set<callback>

async function connect() {
  // eslint-disable-next-line no-console
  console.log('[videoSocket] connect() called', { hasSocket: !!_socket, connected: !!(_socket && _socket.connected), connecting: _connecting });
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
      // No `transports` override — socket.io-client defaults to
      // ['polling', 'websocket']: handshake via long-polling first, then
      // upgrade to WebSocket if available. The previous explicit
      // ['websocket'] caused the initial connection to fail outright when
      // the WS upgrade was blocked anywhere in the path (e.g. ngrok free
      // tier, certain corporate proxies), since there was no fallback.
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      auth: { token },
    });

    _socket.io.on('reconnect_attempt', async (attempt) => {
      // eslint-disable-next-line no-console
      console.log('[videoSocket] reconnect_attempt', { attempt });
      const fresh = await tokenProvider.getToken();
      if (fresh) _socket.auth = { token: fresh };
    });

    _listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => _socket.on(event, cb));
    });
  } else {
    _socket.auth = { token };
  }

  // Wait for the actual WS handshake before resolving. Without this,
  // callers do `await connect()` then immediately `emit('join_call', ...)`,
  // and the emit silently no-ops because `_socket.connected` is still
  // false (see emit() guard below). socket.io-client's internal sendBuffer
  // would queue it normally, but this wrapper's connectivity check
  // bypasses that buffering.
  //
  // REJECTS on connect_error / timeout so the caller's existing try/catch
  // (useVideoCall.join) surfaces a failed-status error instead of silently
  // proceeding to emit on a dead socket.
  return new Promise((resolve, reject) => {
    let done = false;
    let timer = null;
    let onConnect = null;
    let onError = null;

    const cleanup = () => {
      if (onConnect) _socket.off('connect', onConnect);
      if (onError) _socket.off('connect_error', onError);
      if (timer) clearTimeout(timer);
      timer = null;
    };

    onConnect = () => {
      if (done) return;
      done = true;
      cleanup();
      _connecting = false;
      // eslint-disable-next-line no-console
      console.log('[videoSocket] connected', { socketId: _socket.id });
      resolve(_socket);
    };

    onError = (err) => {
      if (done) return;
      done = true;
      cleanup();
      _connecting = false;
      // eslint-disable-next-line no-console
      console.warn('[videoSocket] connect_error', {
        message: err && err.message,
        description: err && err.description,
        context: err && err.context,
        type: err && err.type,
      });
      reject(err || new Error('connect_error'));
    };

    _socket.once('connect', onConnect);
    _socket.once('connect_error', onError);

    // Safety timeout — fail fast if backend unreachable.
    timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      _connecting = false;
      // eslint-disable-next-line no-console
      console.warn('[videoSocket] connect timeout fired');
      reject(new Error('connect timeout'));
    }, 10000);

    _socket.connect();
  });
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
  const canSend = !!(_socket && _socket.connected);
  // eslint-disable-next-line no-console
  console.log('[videoSocket] emit', { event, sent: canSend });
  if (canSend) _socket.emit(event, payload);
}

function isConnected() {
  return !!(_socket && _socket.connected);
}

export const videoSocket = {
  connect,
  disconnect,
  on,
  off,
  emit,
  isConnected,
};
