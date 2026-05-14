const { Schema, model } = require('mongoose');

// Signal Protocol pre-key bundle.
// Stores only PUBLIC key material — server never has access to private keys.
const PreKeyBundleSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // X25519 DH identity key (for X3DH DH2 and DH4) — base64, 32 bytes
  identityDhPublicKey: {
    type: String,
    required: true,
    maxlength: 64
  },
  // Current signed pre-key
  signedPreKey: {
    keyId: { type: Number, required: true },
    publicKey: { type: String, required: true, maxlength: 64 },
    // Ed25519 signature of publicKey, verified by clients before X3DH
    signature: { type: String, required: true, maxlength: 128 },
    createdAt: { type: Date, default: Date.now }
  },
  // One-time pre-keys — consumed atomically, one per X3DH handshake
  oneTimePreKeys: [{
    keyId: { type: Number, required: true },
    publicKey: { type: String, required: true, maxlength: 64 },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null }
  }]
}, { timestamps: true });

// Partial index for fast OTPK availability queries
PreKeyBundleSchema.index(
  { userId: 1, 'oneTimePreKeys.used': 1 },
  { partialFilterExpression: { 'oneTimePreKeys.used': false } }
);

// TTL cleanup: purge used OTPKs older than 30 days
PreKeyBundleSchema.index(
  { 'oneTimePreKeys.usedAt': 1 },
  { expireAfterSeconds: 2592000, sparse: true }
);

module.exports = model('PreKeyBundle', PreKeyBundleSchema);
