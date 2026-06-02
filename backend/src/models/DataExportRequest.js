const crypto = require('crypto');
const { Schema, model } = require('mongoose');

const DataExportRequestSchema = new Schema({
  publicId: {
    type: String,
    default: () => crypto.randomUUID(),
    unique: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  filePath: {
    type: String
  },
  fileSize: {
    type: Number,
    default: 0
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  downloadedAt: Date,
  failedAt: Date,
  failureReason: String,
  requestIp: String,
  userAgent: String
}, { timestamps: true });

DataExportRequestSchema.index({ user: 1, requestedAt: -1 });
DataExportRequestSchema.index({ user: 1, status: 1, requestedAt: -1 });

module.exports = model('DataExportRequest', DataExportRequestSchema);
