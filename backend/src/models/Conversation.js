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
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indice per ottimizzare le query sui partecipanti
ConversationSchema.index({ participants: 1 });

module.exports = model('Conversation', ConversationSchema); 