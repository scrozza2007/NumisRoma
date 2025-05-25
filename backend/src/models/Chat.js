const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: String,
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Assicurati che ci siano esattamente 2 partecipanti
chatSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('Una chat deve avere esattamente 2 partecipanti'));
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema); 