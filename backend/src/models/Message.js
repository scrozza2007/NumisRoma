const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Signal Protocol v2 encrypted payload — opaque to the server.
  // Format: { v:2, header:{dh_pub,n,pn}, ciphertext:b64, x3dh?:{...} }
  encryptedPayload: {
    type: String,
    maxlength: [12000, 'Encrypted payload too large']
  },
  // Plaintext content — only used for the plaintext fallback path
  // when the recipient has not yet registered E2EE keys.
  content: {
    type: String,
    trim: true,
    maxlength: [8000, 'Message content cannot exceed 8000 characters']
  },
  isEncrypted: {
    type: Boolean,
    default: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  imageUrl: {
    type: String,
    maxlength: [2000, 'Image URL cannot exceed 2000 characters']
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ conversation: 1, sender: 1, isDeleted: 1 });
MessageSchema.index(
  { conversation: 1, 'readBy.user': 1, sender: 1 },
  { partialFilterExpression: { isDeleted: false } }
);

module.exports = model('Message', MessageSchema);
