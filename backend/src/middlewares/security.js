const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const { RATE_LIMITS } = require('../config/constants');
const { getRedisClient } = require('../utils/cache');
const logger = require('../utils/logger');

const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const connectSrc = Array.from(new Set(["'self'", ...configuredOrigins]));
const imgSrc = Array.from(new Set(["'self'", 'data:', 'https:', ...configuredOrigins]));

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc,
      connectSrc,
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API server
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * Build a RedisStore bound to the shared Redis client.
 *
 * The store is created unconditionally at module load, but `sendCommand`
 * resolves the Redis client lazily per-request. If Redis is not connected
 * when a command is issued, sendCommand throws — and the `failOpen` wrapper
 * converts that into an allow-through instead of a 500. This is how we
 * achieve "Redis-backed in production, fail-open if Redis is unavailable".
 *
 * If Redis is never configured at all, we return `undefined` so
 * express-rate-limit falls back to its default in-memory store (useful
 * for local dev without Redis).
 *
 * @param {string} prefix - Key prefix in Redis, namespacing counters per limiter.
 */
const buildRedisStore = (prefix) => {
  // If REDIS_URL/REDIS_HOST are not set at all, use the default in-memory store.
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return undefined;
  }

  const store = new RedisStore({
    prefix: `numisroma:ratelimit:${prefix}:`,
    sendCommand: async (...args) => {
      const client = getRedisClient();
      if (!client) {
        // Surfacing this error triggers the failOpen wrapper below.
        throw new Error('Redis client not ready');
      }
      return client.sendCommand(args);
    }
  });

  // rate-limit-redis runs `SCRIPT LOAD` synchronously in its constructor,
  // producing Promises stored as `incrementScriptSha` / `getScriptSha`.
  // If Redis isn't ready yet (which is always true at module-load time since
  // the Redis connection is async), those promises reject, and Node surfaces
  // them as unhandledRejection crashes before any request arrives.
  //
  // Attaching a `.catch()` here suppresses the startup rejection. The store
  // internally re-loads the scripts on the next `increment()`/`get()` call
  // via its `retryableIncrement` retry logic, so Redis-backed rate-limiting
  // recovers automatically once Redis is actually available.
  const swallow = (err) => {
    logger.debug('RedisStore script preload deferred until Redis is ready', {
      prefix,
      error: err.message
    });
  };
  if (store.incrementScriptSha?.catch) store.incrementScriptSha.catch(swallow);
  if (store.getScriptSha?.catch) store.getScriptSha.catch(swallow);

  return store;
};

/**
 * Wrap an express-rate-limit middleware so that any internal error
 * (e.g. Redis unavailable mid-request) fails OPEN rather than blocking
 * the request. We explicitly do NOT want a Redis outage to take the API down.
 */
const failOpen = (limiter) => (req, res, next) => {
  try {
    limiter(req, res, (err) => {
      if (err) {
        logger.warn('Rate limiter error, failing open', {
          error: err.message,
          url: req.originalUrl
        });
        return next();
      }
      return next();
    });
  } catch (err) {
    logger.warn('Rate limiter threw synchronously, failing open', {
      error: err.message,
      url: req.originalUrl
    });
    next();
  }
};

// General rate limiting — skipped entirely in development, and for E2EE routes
// (which have their own dedicated limiter).
const generalLimiter = failOpen(rateLimit({
  windowMs: RATE_LIMITS.GENERAL.windowMs,
  max: RATE_LIMITS.GENERAL.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV !== 'production' ||
    req.originalUrl.includes('/api/e2ee') ||
    req.originalUrl.includes('/api/v1/e2ee'),
  store: buildRedisStore('general')
}));

// Stricter rate limiting for auth endpoints
const authLimiter = failOpen(rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => process.env.NODE_ENV !== 'production',
  store: buildRedisStore('auth')
}));

// Contact form rate limiting
const contactLimiter = failOpen(rateLimit({
  windowMs: RATE_LIMITS.CONTACT.windowMs,
  max: RATE_LIMITS.CONTACT.max,
  message: {
    error: 'Too many contact form submissions, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildRedisStore('contact')
}));

// Search endpoint rate limiting
const searchLimiter = failOpen(rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  message: {
    error: 'Too many search requests, please try again in a moment.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildRedisStore('search')
}));

// E2EE key management — auth-gated, separate pool so key ops don't eat general quota
const e2eeLimiter = failOpen(rateLimit({
  windowMs: RATE_LIMITS.E2EE.windowMs,
  max: RATE_LIMITS.E2EE.max,
  message: {
    error: 'Too many key management requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  store: buildRedisStore('e2ee')
}));

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  contactLimiter,
  searchLimiter,
  e2eeLimiter,
  failOpen,
  buildRedisStore
};
