const crypto = require('crypto');
const { Schema, model } = require('mongoose');

const SessionSchema = new Schema({
  publicId: {
    type: String,
    default: () => crypto.randomUUID()
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  // Refresh token support
  refreshToken: {
    type: String,
    unique: true,
    sparse: true // Allow null values to be unique
  },
  refreshTokenId: {
    type: String
    // Uniqueness + sparseness enforced via `SessionSchema.index` below.
  },
  sessionFamilyId: {
    type: String
  },
  previousRefreshTokenHashes: {
    type: [String],
    default: []
  },
  rememberMe: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  revokedAt: {
    type: Date
  },
  revocationReason: {
    type: String
  },
  idleExpiresAt: {
    type: Date
  },
  absoluteExpiresAt: {
    type: Date
  },
  deviceInfo: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    operatingSystem: {
      type: String,
      default: 'unknown'
    },
    browser: {
      type: String,
      default: 'unknown'
    },
    deviceName: {
      type: String,
      default: 'Unknown device'
    }
  },
  ipAddress: {
    type: String
  },
  location: {
    type: String,
    default: 'Unknown'
  },
  geoLocation: {
    label: String,
    source: String,
    country: String,
    countryCode: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    isp: String,
    autonomousSystemNumber: Number,
    isAnonymous: Boolean,
    isVpn: Boolean,
    isProxy: Boolean,
    isTor: Boolean,
    updatedAt: Date
  },
  risk: {
    score: {
      type: Number,
      default: 0
    },
    flags: {
      type: [String],
      default: []
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  // Additional metadata for enhanced security
  metadata: {
    tokenType: {
      type: String,
      enum: ['jwt', 'jwt_with_refresh'],
      default: 'jwt'
    },
    userAgent: String,
    ipAddress: String,
    loginMethod: {
      type: String,
      enum: ['password', 'refresh_token', 'social'],
      default: 'password'
    }
  }
}, { timestamps: true });

// Index for cleanup operations
SessionSchema.index({ userId: 1, isActive: 1, lastActive: -1 });
SessionSchema.index({ publicId: 1 }, { unique: true, sparse: true });
SessionSchema.index({ token: 1, isActive: 1 }); // Critical for auth middleware
SessionSchema.index({ refreshTokenId: 1 }, { unique: true, sparse: true });
SessionSchema.index({ sessionFamilyId: 1 }, { sparse: true });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Session', SessionSchema);
