const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: false,
    minlength: [8, 'Password must be at least 8 characters']
  },
  // OAuth providers linked to this account.
  // Each entry: { provider: 'google'|'apple'|'facebook', providerId: String }
  oauthProviders: {
    type: [{
      provider: { type: String, enum: ['google', 'apple', 'facebook'], required: true },
      providerId: { type: String, required: true }
    }],
    default: []
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  avatar: {
    type: String,
    maxlength: [500, 'Avatar URL cannot exceed 500 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  // Role-based access control. `user` is the default; `admin` is assigned
  // manually via DB / operational tooling — registration never creates admins.
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true,
    index: true
  },
  lastActive: {
    type: Date,
    default: null
  },
  // Per-account brute-force lockout
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockoutUntil: {
    type: Date,
    default: null
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  // X25519 public key for E2EE messaging (base64-encoded, 32 bytes).
  // Write-once — never overwritten after first registration.
  publicKey: {
    type: String,
    default: null
  },
  // The PBKDF2+AES-GCM encrypted private key blob, stored server-side so the
  // user can restore their keypair on any new device using only their password.
  // Format: JSON string { salt: b64, iv: b64, ct: b64 }
  // The server never sees the plaintext private key — only this opaque blob.
  encryptedPrivateKey: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Indexes for performance
// Use separate unique indexes instead of compound - more efficient for MongoDB
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 }, { sparse: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ fullName: 'text' }); // Text index for search
UserSchema.index({ createdAt: -1 }); // For sorting by registration date
UserSchema.index({ lastActive: -1 }); // For sorting by recent activity

module.exports = model('User', UserSchema);
