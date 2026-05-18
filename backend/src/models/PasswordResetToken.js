const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // SHA-256 hash of the token — never store plaintext
  tokenHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-delete 1 hour after expiry
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

passwordResetTokenSchema.statics.hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
