const { Schema, model } = require('mongoose');

// Per-user device identity. One record per user (single-device model for now).
// Replaces User.publicKey and User.encryptedPrivateKey.
//
// The server stores only public keys and the encrypted private key blob.
// The blob is wrapped with Argon2id+AES-GCM on the client — server cannot decrypt.
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
  // Argon2id+AES-GCM encrypted blob of all private keys. Opaque to the server.
  // Format: JSON { alg, salt, iv, ct } — all base64
  encryptedKeyBundle: {
    type: String,
    required: true,
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
