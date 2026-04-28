'use strict';

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const http = require('http');
const { Server: SocketServer } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const { connect: connectDB, disconnect: disconnectDB } = require('./config/database');
const { getClient: getRedis, disconnect: disconnectRedis } = require('./config/redis');
const { init: initContainer, container } = require('./container');
const createApp = require('./app');
const socketAuthMiddleware = require('./core/middleware/socketAuthMiddleware');
const { startNotificationWorker } = require('./core/jobs/workers/notificationWorker');
const { startAuditWorker } = require('./core/jobs/workers/auditWorker');
const corsOptions = require('./config/cors');
const logger = require('./core/utils/logger');
const cacheManager = require('./core/cache/cacheManager');
const { REDIS_TTL } = require('./core/utils/constants');

const PORT = process.env.PORT || 3000;

let server;
const workers = [];

/**
 * Pre-warm frequently accessed Redis caches on startup.
 * Runs after plugins are registered so models are available.
 */
async function warmCaches() {
  const Exercise = require('./models/Exercise.model');
  const BODY_PARTS = ['knee', 'shoulder', 'lower_back', 'hip', 'neck', 'core', 'full_body'];

  logger.info({ event: 'CACHE_WARM_START' });

  // Warm exercise lists by body part
  for (const part of BODY_PARTS) {
    try {
      const cacheKey = `exercises:bodyPart:${part}`;
      const cached = await cacheManager.get(cacheKey);
      if (!cached) {
        const paginate = require('./core/utils/paginator');
        const result = await paginate(Exercise, { bodyPart: part, isPublic: true }, { limit: 50, sort: { name: 1 } });
        await cacheManager.set(cacheKey, result, REDIS_TTL.EXERCISE_LIST);
        logger.info({ event: 'CACHE_WARM_EXERCISE', bodyPart: part });
      }
    } catch (err) {
      logger.warn({ event: 'CACHE_WARM_EXERCISE_FAILED', bodyPart: part, err: err.message });
    }
  }

  logger.info({ event: 'CACHE_WARM_DONE' });
}

async function bootstrap() {
  // 1. Connect DB
  await connectDB(process.env.MONGODB_URI);

  // 2. Connect Redis
  const redis = getRedis(process.env.REDIS_URL);

  // 3. Init DI container (all providers, cache, queue, feature flags)
  await initContainer(redis);

  // 4. Create Express app
  const app = createApp(container);

  // 5. HTTP server
  server = http.createServer(app);

  // 6. Socket.IO with Redis adapter for horizontal scaling
  const pubClient = redis;
  const subClient = redis.duplicate();

  const io = new SocketServer(server, {
    cors: corsOptions,
    adapter: createAdapter(pubClient, subClient),
  });

  // Inject io into the messaging provider
  container.messaging.setServer(io);

  // Auth middleware for Socket.IO connections
  io.use(socketAuthMiddleware(container.auth));

  // User rooms — each user joins their personal room on connect
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info({ event: 'SOCKET_JOINED', userId, socketId: socket.id });
    }

    socket.on('disconnect', () => {
      logger.info({ event: 'SOCKET_DISCONNECTED', userId, socketId: socket.id });
    });
  });

  // Expose io on app for modules/plugins that need it
  app.set('io', io);

  // 7. Register plugins (async)
  await app._pluginManager.registerAll(app, container);

  // 8. Cache warming — pre-populate frequently accessed caches
  await warmCaches().catch((err) =>
    logger.warn({ event: 'CACHE_WARM_FAILED', err: err.message })
  );

  // 9. Start background workers
  workers.push(startNotificationWorker(redis));
  workers.push(startAuditWorker(redis));

  // 10. Start listening
  server.listen(PORT, () => {
    logger.info({
      event: 'SERVER_STARTED',
      port: PORT,
      env: process.env.NODE_ENV,
      docs: process.env.NODE_ENV !== 'production' ? `http://localhost:${PORT}/api/v1/docs` : null,
    });
  });
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(signal) {
  logger.info({ event: 'SHUTDOWN_SIGNAL', signal });

  // Stop accepting new connections
  server?.close(async () => {
    logger.info({ event: 'HTTP_SERVER_CLOSED' });

    // Stop workers
    for (const worker of workers) {
      await worker.close().catch(() => {});
    }

    await disconnectDB();
    await disconnectRedis();

    logger.info({ event: 'SHUTDOWN_COMPLETE' });
    process.exit(0);
  });

  // Force-exit if graceful shutdown takes > 10s
  setTimeout(() => {
    logger.error({ event: 'SHUTDOWN_TIMEOUT' });
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ event: 'UNHANDLED_REJECTION', reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error({ event: 'UNCAUGHT_EXCEPTION', err: err.message, stack: err.stack });
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error({ event: 'BOOTSTRAP_FAILED', err: err.message });
  process.exit(1);
});
