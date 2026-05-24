const { Schema, model } = require('mongoose');

const WishlistEntrySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  collection: {
    type: Schema.Types.ObjectId,
    ref: 'Collection'
  },
  coinId: {
    type: String,
    trim: true,
    index: true
  },
  name: {
    type: String,
    trim: true,
    required: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  emperor: { type: String, trim: true, maxlength: 120 },
  mint: { type: String, trim: true, maxlength: 120 },
  material: { type: String, trim: true, maxlength: 80 },
  denomination: { type: String, trim: true, maxlength: 120 },
  estimatedPrice: {
    amount: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 10, default: 'EUR' }
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  notes: { type: String, trim: true, maxlength: 3000 },
  references: { type: String, trim: true, maxlength: 2000 },
  status: {
    type: String,
    enum: ['Wanted', 'Watching', 'Acquired', 'Archived'],
    default: 'Wanted',
    index: true
  }
}, { timestamps: true });

WishlistEntrySchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = model('WishlistEntry', WishlistEntrySchema);
