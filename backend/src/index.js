require('dotenv').config();

// Sentry must be initialised before any other require so it can instrument
// built-in modules (http, https) and third-party integrations automatically.
const { initSentry, Sentry } = require('./config/sentry');
initSentry();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

const { validateEnv } = require('./config/validateEnv');
const { metricsMiddleware, client: metricsClient } = require('./utils/metrics');
const { securityHeaders, generalLimiter, authLimiter, contactLimiter, e2eeLimiter } = require('./middlewares/security');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { requestLogger, accessLogger, errorLogger, dbLogger } = require('./middlewares/logger');
const { doubleCsrfProtection, csrfErrorHandler, csrfTokenHandler } = require('./middlewares/csrf');
const { requestIdMiddleware } = require('./middlewares/requestId');
const { requestTimeoutMiddleware } = require('./middlewares/requestTimeout');
const passport = require('passport');
const { initPassport } = require('./controllers/oauthController');
const oauthRoutes = require('./routes/oauth');
const authRoutes = require('./routes/auth');
const coinRoutes = require('./routes/coins');
const collectionRoutes = require('./routes/collections');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contact');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const e2eeRoutes = require('./routes/e2ee');
const healthRoutes = require('./routes/health');
const cacheRoutes = require('./routes/cache');
const logger = require('./utils/logger');

// Fail-fast env validation — must run before anything reads these.
validateEnv();

// Register Passport OAuth strategies (only strategies with env vars present are activated)
initPassport();

const app = express();

// -------------------------------------------------------------------------
// Proxy trust
// -------------------------------------------------------------------------
// Behind a load balancer / reverse proxy we MUST explicitly tell Express
// how many hops to trust so that `req.ip`, rate-limit key derivation, and
// `cookie.secure` auto-detection all use the real client IP.
//
// TRUST_PROXY accepts Express values: 'loopback', 'linklocal', 'uniquelocal',
// a number of hops (1, 2, ...), a CIDR, or 'true' / 'false'.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy !== undefined) {
  if (trustProxy === 'true') app.set('trust proxy', true);
  else if (trustProxy === 'false') app.set('trust proxy', false);
  else if (!Number.isNaN(Number(trustProxy))) app.set('trust proxy', Number(trustProxy));
  else app.set('trust proxy', trustProxy);
} else if (process.env.NODE_ENV === 'production') {
  // Safe default in prod: trust one hop (typical LB / ingress).
  app.set('trust proxy', 1);
}

// -------------------------------------------------------------------------
// Core platform middleware
// -------------------------------------------------------------------------

// Correlate every log entry / error with an X-Request-Id. Must be first so
// downstream loggers and error handlers can see req.id.
app.use(requestIdMiddleware);

// Prometheus request metrics — must be before any route that we want measured.
app.use(metricsMiddleware);

// Abort long-running requests to free up resources. Does NOT affect uploads
// (multer handles those with its own limits).
app.use(requestTimeoutMiddleware());

// gzip/brotli compression for JSON responses. Browser negotiation happens
// automatically; binary image routes are already served as-is (already compressed).
app.use(compression({
  threshold: 1024, // don't bother below 1KB
  filter: (req, res) => {
    // Respect explicit client opt-out
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Security headers (helmet, CSP, etc.)
app.use(securityHeaders);

// Emit weak ETags on cacheable JSON responses to support conditional GETs.
// Responses that must never be cached set `Cache-Control: no-store` explicitly.
app.set('etag', 'weak');

// -------------------------------------------------------------------------
// CORS — must come before rate limiters so that 429 responses still carry
// Access-Control-Allow-Origin and the browser can read the error body.
// -------------------------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / same-origin / curl / health probes (no Origin header).
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.security.suspiciousActivity('CORS origin rejected', { origin });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match', 'X-CSRF-Token', 'X-Admin-API-Key', 'X-Request-Id'],
  exposedHeaders: ['ETag', 'X-Request-Id'],
  maxAge: 600 // cache preflight for 10 minutes
}));

app.use(generalLimiter);

// -------------------------------------------------------------------------
// Body parsers
// -------------------------------------------------------------------------
// Tight JSON body limit: real API payloads are well under 100KB, and an
// oversized cap would allow trivial DoS via huge JSON bodies. Upload routes
// use multer which enforces its own per-file cap independently.
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '200kb';
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

// Cookie parsing — required for httpOnly auth cookie AND CSRF double-submit.
// Must be mounted BEFORE any middleware that reads req.cookies.
app.use(cookieParser());

// Passport — stateless (session: false); used only for OAuth provider round-trips.
app.use(passport.initialize());

// CSRF protection (double-submit cookie). Internally skipped when the request
// has no auth cookie (Authorization-header or anonymous clients), since those
// flows are not CSRF-vulnerable. See middlewares/csrf.js.
app.use(doubleCsrfProtection);

// Request logging.
// Production: lightweight `accessLogger` emits one JSON line per finished
// response (no body buffering), with high-volume paths sampled to limit
// log cost.
// Development: `requestLogger` logs both request and response lines with
// more context for local debugging.
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger);
} else {
  app.use(accessLogger);
}

// -------------------------------------------------------------------------
// Static / public endpoints
// -------------------------------------------------------------------------
// Uploaded images are served directly. URLs contain a random token so they
// are not enumerable, but they are NOT access-controlled; treat upload paths
// as public. Set aggressive immutable caching since filenames are content-stable.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Root endpoint — minimal in production to avoid broadcasting the API map.
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.json({ status: 'ok' });
  }
  res.json({
    message: 'NumisRoma API Server',
    status: 'Running',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      coins: '/api/coins',
      users: '/api/users',
      collections: '/api/collections',
      messages: '/api/messages',
      sessions: '/api/sessions',
      contact: '/api/contact',
      cache: '/api/cache'
    }
  });
});

// Health check routes (no rate limiting for monitoring)
app.use('/health', healthRoutes);

// Prometheus metrics — restricted to localhost or requests bearing the
// METRICS_API_KEY header so scraping agents can reach it from outside but
// the endpoint is never publicly exposed.
app.get('/metrics', async (req, res) => {
  const apiKey = process.env.METRICS_API_KEY;
  const fromLoopback = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  if (apiKey && !fromLoopback) {
    const provided = req.headers['x-metrics-api-key'];
    if (provided !== apiKey) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  try {
    res.set('Content-Type', metricsClient.register.contentType);
    res.send(await metricsClient.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// -------------------------------------------------------------------------
// Versioned API router — canonical path is /api/v1/
// The legacy /api/ prefix is kept as a deprecated alias; all responses
// through that path carry Deprecation + Sunset headers so clients can
// migrate before the alias is removed.
// -------------------------------------------------------------------------
const { Router } = require('express');
const apiV1 = Router();

apiV1.use('/auth', authLimiter, authRoutes);
apiV1.use('/auth/oauth', authLimiter, oauthRoutes);
apiV1.use('/contact', contactLimiter, contactRoutes);
apiV1.use('/coins', coinRoutes);
apiV1.use('/collections', collectionRoutes);
apiV1.use('/users', userRoutes);
apiV1.use('/sessions', sessionRoutes);
apiV1.use('/messages', messageRoutes);
apiV1.use('/notifications', notificationRoutes);
apiV1.use('/e2ee', e2eeLimiter, e2eeRoutes);
apiV1.use('/cache', cacheRoutes);
apiV1.get('/csrf-token', csrfTokenHandler);

// Canonical versioned mount
app.use('/api/v1', apiV1);

// Legacy mount — same router, deprecated headers
const SUNSET_DATE = 'Sun, 01 Jan 2028 00:00:00 GMT';
app.use('/api', (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', SUNSET_DATE);
  res.setHeader('Link', '</api/v1>; rel="successor-version"');
  next();
}, apiV1);

// -------------------------------------------------------------------------
// Error handling (must be last)
// -------------------------------------------------------------------------
// csrfErrorHandler runs FIRST so CSRF failures return a clean 403 with a
// machine-readable code, rather than being swallowed by the generic handler.
app.use(csrfErrorHandler);
app.use(notFoundHandler);
app.use(errorLogger); // Log errors before handling them
app.use(errorHandler);

// -------------------------------------------------------------------------
// Database + bootstrap
// -------------------------------------------------------------------------
const { connectDatabase, setupDatabaseMonitoring } = require('./config/database');

setupDatabaseMonitoring();

connectDatabase()
  .then(() => {
    dbLogger.logConnection('connected');
  })
  .catch((err) => {
    logger.error('MongoDB connection error', { error: err.message });
    dbLogger.logConnection('error', err);
    process.exit(1);
  });

mongoose.connection.on('disconnected', () => {
  dbLogger.logConnection('disconnected');
});

mongoose.connection.on('reconnected', () => {
  dbLogger.logConnection('reconnected');
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Server-level timeouts prevent slow-loris / hanging connections.
// Values chosen to be larger than the request timeout so the app can
// complete a request cleanly before the socket is yanked.
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65000;
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS) || 66000;
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 60000;

// -------------------------------------------------------------------------
// Graceful shutdown
// -------------------------------------------------------------------------
// Wait for `server.close` to drain in-flight requests, then close Redis,
// then Mongo. Closing external resources before the HTTP server drains
// would abort requests that are still being handled.

let isShuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 15000;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully (timeout ${SHUTDOWN_TIMEOUT_MS}ms)`);

  // Hard kill guard — don't hang forever if something is stuck.
  const killTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  killTimer.unref();

  try {
    // 1. Stop accepting new HTTP connections; wait for existing ones.
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    logger.info('HTTP server closed');

    // 2. Close Redis (best-effort).
    try {
      const { getRedisClient } = require('./utils/cache');
      const client = getRedisClient();
      if (client && typeof client.quit === 'function') {
        await client.quit();
        logger.info('Redis connection closed');
      }
    } catch (err) {
      logger.warn('Error closing Redis', { error: err.message });
    }

    // 3. Close Mongo.
    await mongoose.connection.close();
    logger.info('Database connection closed');

    clearTimeout(killTimer);
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    clearTimeout(killTimer);
    process.exit(1);
  }
};

// `void` the promise so the SIGTERM/SIGINT handler never produces an
// unhandled rejection, but we still record any failure.
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(err =>
    logger.error('Shutdown handler failed', { error: err.message })
  );
});
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(err =>
    logger.error('Shutdown handler failed', { error: err.message })
  );
});

// -------------------------------------------------------------------------
// Last-resort crash handlers
// -------------------------------------------------------------------------
// Uncaught exceptions leave the process in an unknown state — the correct
// response is to log, stop accepting new work, and let the orchestrator
// restart us. Same for unhandled rejections (treated as errors in Node 15+).
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', {
    error: err.message,
    stack: err.stack
  });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  // Don't hard-crash on unhandled rejections — some libraries (rate-limit-redis
  // during boot, for example) legitimately defer error recovery. We log and
  // keep serving; the process supervisor can alert on these log entries.
});

module.exports = { app, server };
