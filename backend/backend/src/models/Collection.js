const { Schema, model } = require('mongoose');

const CollectionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  coins: [
    {
      coin: {
        type: Schema.Types.ObjectId,
        ref: 'Coin',
        required: true
      },
      weight: {
        type: Number
      },
      diameter: {
        type: Number
      },
      grade: {
        type: String
      },
      notes: {
        type: String
      }
    }
  ]
}, { timestamps: true });

module.exports = model('Collection', CollectionSchema);