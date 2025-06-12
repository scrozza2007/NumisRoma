const mongoose = require('mongoose');

const coinCustomImageSchema = new mongoose.Schema({
  coinId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  obverseImage: {
    type: String,
    default: null
  },
  reverseImage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indice composto per trovare velocemente le immagini di una moneta per un utente
coinCustomImageSchema.index({ coinId: 1, userId: 1 }, { unique: true });

// Middleware per aggiornare updatedAt
coinCustomImageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CoinCustomImage', coinCustomImageSchema); 