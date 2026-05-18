const mongoose = require('mongoose');
const crypto = require('crypto');

const pendingRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  // bcrypt hash of the plaintext password (already hashed before storage)
  passwordHash: {
    type: String,
    required: true
  },
  // SHA-256 hash of the OTP — never store plaintext
  otpHash: {
    type: String,
    required: true
  },
  otpExpiresAt: {
    type: Date,
    required: true
  },
  // Track failed verification attempts; invalidate after 5
  failedAttempts: {
    type: Number,
    default: 0
  },
  used: {
    type: Boolean,
    default: false
  },
  // Track how many times the OTP was sent to enforce rate limiting
  sendCount: {
    type: Number,
    default: 1
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// TTL index: MongoDB auto-deletes documents 15 min after otpExpiresAt
// (gives a small grace window for clock skew without lingering stale docs)
pendingRegistrationSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 900 });

// At most one pending registration per email at a time
pendingRegistrationSchema.index({ email: 1 }, { unique: true });

pendingRegistrationSchema.statics.hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);
