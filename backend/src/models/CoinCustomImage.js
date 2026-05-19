const mongoose = require('mongoose');

const coinCustomImageSchema = new mongoose.Schema({
  collectionEntryId: {
    type: mongoose.Schema.Types.ObjectId,
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
  obverseImageKey: {
    type: String,
    default: null
  },
  obverseImageData: {
    type: Buffer
  },
  obverseImageContentType: {
    type: String
  },
  reverseImage: {
    type: String,
    default: null
  },
  reverseImageKey: {
    type: String,
    default: null
  },
  reverseImageData: {
    type: Buffer
  },
  reverseImageContentType: {
    type: String
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

// One custom-image record per collection entry
coinCustomImageSchema.index({ collectionEntryId: 1, userId: 1 }, { unique: true });

coinCustomImageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CoinCustomImage', coinCustomImageSchema);
