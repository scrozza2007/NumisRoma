/**
 * Application-wide constants for NumisRoma
 * Centralized configuration for magic numbers and settings
 */

// Rate limiting configurations
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20
  },
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30
  },
  CONTACT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5
  },
  // E2EE key management — auth-gated, low-frequency legitimate operations.
  // Exempt from the general limiter; uses its own generous window.
  E2EE: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50
  }
};

// Pagination configurations
const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  DEFAULT_PAGE: 1
};

// Cache configurations (TTL in seconds)
const CACHE_TTL = {
  FILTER_OPTIONS: 3600, // 1 hour
  SEARCH_RESULTS: 300, // 5 minutes
  COIN_DETAILS: 1800, // 30 minutes
  USER_PROFILE: 600 // 10 minutes
};

// File upload configurations
const UPLOAD = {
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  IMAGE_QUALITY: 80,
  MAX_IMAGE_WIDTH: 1920,
  MAX_IMAGE_HEIGHT: 1080,
  // Coin image quality thresholds
  COIN: {
    MIN_WIDTH: 600,
    MIN_HEIGHT: 600,
    // DPI is intentionally not enforced: phone cameras report 72 DPI regardless
    // of sensor resolution. Pixel dimensions (above) are the meaningful check.
    MIN_BLUR_SCORE: 20,        // Laplacian variance — metallic coin surfaces are
                               // inherently smooth; 20 filters motion blur only
    MIN_BRIGHTNESS: 20,        // 0-255 average pixel brightness
    AI_COIN_CONFIDENCE: 0.55,  // ancient coins are niche; lower bar than modern
    AI_MODERN_CONFIDENCE: 0.80 // reject if modern coin confidence exceeds this
  },
  // Collection thumbnail quality thresholds
  THUMBNAIL: {
    MIN_WIDTH: 400,
    MIN_HEIGHT: 400,
    MIN_BLUR_SCORE: 60,   // stricter than coins — thumbnails should be crisp
    MIN_BRIGHTNESS: 25,
    MAX_ASPECT_RATIO: 3   // reject extreme panoramas / tall portraits (w/h or h/w > 3)
  }
};

// Session configurations
const SESSION = {
  DEFAULT_EXPIRY_DAYS: 7,
  MAX_SESSIONS_PER_USER: 5,
  CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000 // 24 hours
};

// Password validation
const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
  SPECIAL_CHARS: '!@#$%^&*'
};

// Username validation
const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 20,
  PATTERN: /^[a-zA-Z0-9_]+$/,
  RESERVED: ['admin', 'root', 'system', 'api', 'null', 'undefined']
};

// Collection validation
const COLLECTION_RULES = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  BIO_MAX_LENGTH: 500
};

// Database query limits
const QUERY_LIMITS = {
  MAX_AGGREGATION_RESULTS: 1000,
  DEFAULT_RANDOM_COINS: 3,
  MAX_RANDOM_COINS: 10,
  MAX_SEARCH_RESULTS: 100
};

// HTTP Cache headers for different resource types
const CACHE_HEADERS = {
  STATIC_ASSETS: 'public, max-age=31536000, immutable', // 1 year for static assets
  USER_IMAGES: 'private, max-age=3600', // 1 hour for user-uploaded images
  PUBLIC_DATA: 'public, max-age=600', // 10 minutes for public coin data
  DYNAMIC_DATA: 'private, max-age=300', // 5 minutes for user-specific data
  NO_CACHE: 'no-cache, no-store, must-revalidate' // For sensitive endpoints
};

module.exports = {
  RATE_LIMITS,
  PAGINATION,
  CACHE_TTL,
  UPLOAD,
  SESSION,
  PASSWORD_RULES,
  USERNAME_RULES,
  COLLECTION_RULES,
  QUERY_LIMITS,
  CACHE_HEADERS
};
