/**
 * Enhanced validation middleware for NumisRoma
 * Extends existing express-validator functionality without breaking it
 */

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import DOMPurify for robust XSS protection
let DOMPurify;
try {
  const createDOMPurify = require('dompurify');
  const { JSDOM } = require('jsdom');
  const window = new JSDOM('').window;
  DOMPurify = createDOMPurify(window);
} catch (error) {
  // Fallback to basic sanitization if DOMPurify not available
  logger.warn('DOMPurify not available, using fallback sanitization. Run: npm install dompurify jsdom');
  DOMPurify = null;
}

/**
 * Enhanced validation result handler that provides better error messages
 * while maintaining backward compatibility
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param || err.path,
      message: err.msg,
      value: err.value,
      location: err.location
    }));

    // Log validation errors for monitoring
    logger.api.error('Validation failed', {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
      userId: req.user?.userId || null
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  
  next();
};

/**
 * Validate a MongoDB ObjectId parameter.
 * Pass { allowString: true } to also accept non-ObjectId string IDs
 * (used for coin slug IDs like "ric_9_thes_12a").
 */
const validateObjectId = (paramName = 'id', { allowString = false } = {}) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (allowString) {
      // Accept any non-empty string that doesn't look like a path traversal
      if (!id || typeof id !== 'string' || id.length > 200 || /[\/\\]/.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID format',
          message: `Parameter '${paramName}' is invalid`
        });
      }
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.api.error('Invalid ObjectId', {
        paramName,
        value: id,
        url: req.originalUrl,
        userId: req.user?.userId || null
      });

      return res.status(400).json({
        error: 'Invalid ID format',
        message: `Parameter '${paramName}' must be a valid MongoDB ObjectId`
      });
    }

    next();
  };
};

/**
 * Strip all HTML and dangerous sequences from a string.
 * Exported so controllers can sanitize individual fields on write without
 * having to wire a whole middleware stack.
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Use DOMPurify if available (much more robust)
  if (DOMPurify) {
    return DOMPurify.sanitize(str, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [] // Strip all attributes
    }).trim();
  }

  // Fallback: regex-based best-effort sanitizer. Known to miss mutated XSS;
  // only reached when DOMPurify fails to load — monitor the warn log above.
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/(<|&lt;)(\s*)script/gi, '')
    .trim();
};

/**
 * Sanitize input data to prevent XSS and injection attacks
 * Uses DOMPurify for robust HTML sanitization
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Per-user rate limiting (Redis-backed, fail-open).
 *
 * Uses `express-rate-limit` with the shared Redis store defined in
 * `middlewares/security.js`. Keys on `req.user.userId` when authenticated
 * (so one user can't bypass by rotating IPs) and falls back to `req.ip`
 * for anonymous requests. Fails open on Redis outages via the `failOpen`
 * wrapper — same policy as the rest of our rate limiters.
 *
 * Usage:
 *   const limiter = userRateLimit(100, 15 * 60 * 1000);
 *   router.use('/api/endpoint', limiter, handler);
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  // Lazy-require to avoid a circular dependency at module load: security.js
  // imports from cache.js which imports from logger, and enhancedValidation
  // is imported by some route files.
  const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
  const { failOpen, buildRedisStore } = require('./security');

  return failOpen(rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Authenticated -> user id; anonymous -> IP. Falls back to IP if user
    // is not yet populated (route ordering issue) so we never return undefined.
    keyGenerator: (req) => req.user?.userId || (req.ip ? ipKeyGenerator(req.ip) : 'unknown'),
    store: buildRedisStore('user-rate-limit'),
    handler: (req, res) => {
      logger.security.suspiciousActivity('Rate limit exceeded', {
        userId: req.user?.userId,
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${Math.round(windowMs / 1000 / 60)} minutes.`
      });
    }
  }));
};

/**
 * Validate file uploads (extends existing upload middleware)
 */
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    maxSize = 5 * 1024 * 1024, // 5MB
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        error: 'File required',
        message: 'A file upload is required for this endpoint'
      });
    }

    if (req.file) {
      // Validate file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        logger.security.suspiciousActivity('Invalid file type uploaded', {
          mimetype: req.file.mimetype,
          userId: req.user?.userId,
          ip: req.ip
        });
        
        return res.status(400).json({
          error: 'Invalid file type',
          message: `Only ${allowedTypes.join(', ')} files are allowed`
        });
      }

      // Validate file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `File size must be less than ${maxSize / 1024 / 1024}MB`
        });
      }

      // Log file upload for monitoring
      logger.info('File uploaded', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId: req.user?.userId
      });
    }

    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateObjectId,
  sanitizeInput,
  sanitizeString,
  userRateLimit,
  validateFileUpload
};
