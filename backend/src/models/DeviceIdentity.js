const { Schema, model } = require('mongoose');

// Per-user device identity. One record per user (single-device model for now).
// The server stores only public keys — private keys are device-bound (IndexedDB only).
const DeviceIdentitySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Ed25519 signing key — used to verify SPK signatures (safety numbers)
  identityPublicKey: {
    type: String,
    required: true,
    maxlength: 64
  },
  // X25519 DH key — used in X3DH DH steps
  identityDhPublicKey: {
    type: String,
    required: true,
    maxlength: 64
  },
  // Deprecated — private keys are device-bound and no longer backed up to the server.
  // Field retained so existing documents remain valid; ignored on read/write.
  encryptedKeyBundle: {
    type: String,
    required: false,
    maxlength: 65536
  },
  // Incremented on intentional key rotation (e.g. device change).
  // Clients show a "safety number changed" warning when this advances.
  keyVersion: {
    type: Number,
    default: 1
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = model('DeviceIdentity', DeviceIdentitySchema);
