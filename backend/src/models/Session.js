const { Schema, model } = require('mongoose');

const SessionSchema = new Schema({
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
      default: 'Dispositivo sconosciuto'
    }
  },
  ipAddress: {
    type: String
  },
  location: {
    type: String,
    default: 'Sconosciuta'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = model('Session', SessionSchema); 