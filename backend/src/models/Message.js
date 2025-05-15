const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = model('Message', MessageSchema); 