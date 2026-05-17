const { Schema, model } = require('mongoose');

const CollectionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'Collection name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    maxlength: [2000, 'Image URL cannot exceed 2000 characters']
  },
  imageData: {
    type: Buffer
  },
  imageContentType: {
    type: String,
    maxlength: [100, 'Content type cannot exceed 100 characters']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  coins: [
    {
      coin: {
        type: String,
        ref: 'Coin',
        required: true
      },
      weight: {
        type: Number,
        min: [0, 'Weight cannot be negative'],
        max: [10000, 'Weight cannot exceed 10000 grams']
      },
      diameter: {
        type: Number,
        min: [0, 'Diameter cannot be negative'],
        max: [1000, 'Diameter cannot exceed 1000 mm']
      },
      grade: {
        type: String,
        maxlength: [50, 'Grade cannot exceed 50 characters']
      },
      notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
      }
    }
  ]
}, { timestamps: true });

// Performance indexes
CollectionSchema.index({ user: 1 }); // For user's collections
CollectionSchema.index({ isPublic: 1, createdAt: -1 }); // Critical for public collections listing
CollectionSchema.index({ user: 1, isPublic: 1 }); // Compound for user + visibility
CollectionSchema.index({ name: 1 }); // For collection name searches
CollectionSchema.index({ 'coins.coin': 1 }); // For coin references in collections

module.exports = model('Collection', CollectionSchema);