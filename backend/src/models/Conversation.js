const { Schema, model } = require('mongoose');

const ConversationSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  isRead: {
    type: Map,
    of: Boolean,
    default: new Map()
  }
}, { timestamps: true });

module.exports = model('Conversation', ConversationSchema); 