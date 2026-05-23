'use strict';

/**
 * Socket.IO integration test harness — boots a real http.Server + Socket.IO
 * Server on an OS-assigned ephemeral port (port 0), applies plugin namespaces,
 * and provides per-user client connections for exercising the full transport
 * + handshake + auth-middleware + room-membership flow.
 *
 * Namespace-agnostic: connectAsUser({ namespace, clerkId, role }) works for
 * any plugin namespace (today /video, tomorrow /chat) without changes.
 *
 * Callers must mock @clerk/backend and @clerk/express at the SDK boundary
 * BEFORE requiring this harness so the production ClerkAdapter code path
 * runs end-to-end with deterministic identity (token-as-clerkId convention).
 *
 * Usage:
 *   const harness = await startSocketServer({ plugins: [VideoPlugin] });
 *   const { client, mongoUser } = await harness.connectAsUser({
 *     namespace: '/video', clerkId: 'clerk_alice', role: 'patient',
 *   });
 *   // ... emit / on / waitFor / db ops ...
 *   await harness.teardown();
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');

const ClerkAdapter = require('../../src/providers/auth/ClerkAdapter');
const SocketIOAdapter = require('../../src/providers/messaging/SocketIOAdapter');
const User = require('../../src/models/User.model');
const { _socketUserIdCache } = require('../../src/core/utils/socketIdentity');

const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Boot a socket.io server with the given plugins registered.
 * @param {object} opts
 * @param {Array<new () => any>} opts.plugins - Plugin class constructors
 *   (each must implement async register(app, container) per PluginBase).
 * @returns {Promise<{
 *   url: string,
 *   port: number,
 *   io: import('socket.io').Server,
 *   httpServer: import('http').Server,
 *   container: object,
 *   connectAsUser: Function,
 *   clearSocketCache: Function,
 *   teardown: Function,
 * }>}
 */
async function startSocketServer({ plugins = [] } = {}) {
  // Minimal container — only services that plugin.setupSocketHandlers
  // and the video plugin's REST register path touch. Production code
  // path runs (ClerkAdapter with .env.local CLERK_SECRET_KEY), but
  // @clerk/* SDKs are mocked at the test-file boundary so verifyToken
  // returns the token-as-clerkId convention.
  const messaging = new SocketIOAdapter();
  const container = {
    auth: new ClerkAdapter(process.env.CLERK_SECRET_KEY),
    messaging,
    // Defensive stubs for the rest of the surface — video plugin's
    // register pulls in videoService which references these. Tests
    // don't assert on their behavior.
    notification: { sendPush: () => Promise.resolve(), sendPushToUser: () => Promise.resolve() },
    video: { getTurnCredentials: () => Promise.resolve({}) },
  };

  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { transports: ['websocket'] });
  messaging.setServer(io);
  app.set('io', io);

  for (const PluginClass of plugins) {
    const plugin = new PluginClass();
    // eslint-disable-next-line no-await-in-loop
    await plugin.register(app, container);
  }

  // Bind to port 0 — OS assigns ephemeral port, avoiding Jest worker collision.
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  const port = httpServer.address().port;
  const url = `http://127.0.0.1:${port}`;

  const clients = [];

  /**
   * Open a socket.io-client connection to the namespace as the given user.
   * Token = clerkId per the mocked @clerk/backend.verifyToken convention.
   * Creates the matching Mongo User doc if absent so resolveMongoUserIdForSocket
   * succeeds.
   *
   * Resolves only after the client has connected (or rejects with the handshake
   * error). Tests that expect handshake REJECTION should call connectAsUserExpectingError.
   */
  async function connectAsUser({ namespace, clerkId, role = 'patient' }) {
    let mongoUser = await User.findOne({ clerkId }).lean();
    if (!mongoUser) {
      const created = await User.create({
        clerkId,
        email: `${clerkId}@test.local`,
        name: clerkId,
        role,
      });
      mongoUser = created.toObject();
    }

    const client = ioClient(`${url}${namespace}`, {
      auth: { token: clerkId },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`connectAsUser(${namespace}, ${clerkId}) timed out after ${CONNECT_TIMEOUT_MS}ms`)),
        CONNECT_TIMEOUT_MS
      );
      client.once('connect', () => { clearTimeout(timeout); resolve(); });
      client.once('connect_error', (err) => { clearTimeout(timeout); reject(err); });
    });

    // Server-side connection handler is async (awaits resolveMongoUserIdForSocket
    // before registering event listeners — see video/index.js:71-110). Poll
    // the namespace's adapter for the per-user room membership which proves
    // the handler ran to completion. Otherwise the test could emit events
    // before listeners are attached and lose them silently.
    const userRoom = `user:${mongoUser._id}`;
    const READY_TIMEOUT_MS = 2000;
    const readyStart = Date.now();
    while (Date.now() - readyStart < READY_TIMEOUT_MS) {
      const ns = io.of(namespace);
      const rooms = ns.adapter.rooms;
      if (rooms.get(userRoom)) break;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 20));
    }

    clients.push(client);
    return { client, mongoUser };
  }

  /**
   * Open a client connection that is EXPECTED to fail handshake. Resolves
   * with the connect_error. Used by tests asserting that the auth middleware
   * rejects unauthenticated handshakes.
   */
  async function connectExpectingError({ namespace, auth = {} }) {
    const client = ioClient(`${url}${namespace}`, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });

    const error = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`connectExpectingError(${namespace}) timed out after ${CONNECT_TIMEOUT_MS}ms`)),
        CONNECT_TIMEOUT_MS
      );
      client.once('connect', () => {
        clearTimeout(timeout);
        client.disconnect();
        reject(new Error('expected connect_error, got successful connect'));
      });
      client.once('connect_error', (err) => { clearTimeout(timeout); resolve(err); });
    });

    // Connection failed by design — no need to track for teardown (already disconnected)
    return error;
  }

  function clearSocketCache() {
    _socketUserIdCache.clear();
  }

  async function teardown() {
    for (const c of clients) {
      try { c.disconnect(); } catch (_) { /* noop */ }
    }
    clients.length = 0;
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  }

  return {
    url, port, io, httpServer, container,
    connectAsUser, connectExpectingError, clearSocketCache, teardown,
  };
}

module.exports = { startSocketServer };
