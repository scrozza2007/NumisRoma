const { Schema, model } = require('mongoose');

const SESSION_AUDIT_RETENTION_DAYS = parseInt(process.env.SESSION_AUDIT_RETENTION_DAYS, 10) || 365;

const SessionAuditEventSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session'
  },
  eventType: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  ipAddress: String,
  userAgent: String,
  location: String,
  riskFlags: {
    type: [String],
    default: []
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + SESSION_AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  }
}, { timestamps: true });

SessionAuditEventSchema.index({ userId: 1, createdAt: -1 });
SessionAuditEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('SessionAuditEvent', SessionAuditEventSchema);
