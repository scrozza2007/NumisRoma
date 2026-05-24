const { Schema, model } = require('mongoose');

const OptionalString = (max, message) => ({
  type: String,
  trim: true,
  maxlength: [max, message]
});

const MoneySchema = new Schema({
  amount: { type: Number, min: 0 },
  currency: { type: String, trim: true, maxlength: 10, default: 'EUR' }
}, { _id: false });

const CoinEntrySchema = new Schema({
  coin: {
    type: String,
    ref: 'Coin',
    required: true
  },
  name: OptionalString(200, 'Coin name cannot exceed 200 characters'),
  emperor: OptionalString(120, 'Emperor cannot exceed 120 characters'),
  issuingAuthority: OptionalString(120, 'Issuing authority cannot exceed 120 characters'),
  dynasty: OptionalString(120, 'Dynasty cannot exceed 120 characters'),
  historicalPeriod: OptionalString(120, 'Historical period cannot exceed 120 characters'),
  dateOfIssue: OptionalString(80, 'Date of issue cannot exceed 80 characters'),
  dateRange: {
    from: { type: Number },
    to: { type: Number }
  },
  mint: OptionalString(120, 'Mint cannot exceed 120 characters'),
  provinceRegion: OptionalString(120, 'Province / region cannot exceed 120 characters'),
  denomination: OptionalString(120, 'Denomination cannot exceed 120 characters'),
  material: OptionalString(80, 'Material cannot exceed 80 characters'),

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
  axis: OptionalString(30, 'Axis cannot exceed 30 characters'),
  thickness: { type: Number, min: 0, max: 1000 },
  shape: OptionalString(80, 'Shape cannot exceed 80 characters'),
  grade: OptionalString(50, 'Grade cannot exceed 50 characters'),
  patina: OptionalString(120, 'Patina cannot exceed 120 characters'),
  conditionNotes: OptionalString(2000, 'Condition notes cannot exceed 2000 characters'),

  obverseLegend: OptionalString(1000, 'Obverse legend cannot exceed 1000 characters'),
  obverseDescription: OptionalString(2000, 'Obverse description cannot exceed 2000 characters'),
  bustType: OptionalString(200, 'Bust type cannot exceed 200 characters'),
  portraitDirection: OptionalString(80, 'Portrait direction cannot exceed 80 characters'),
  reverseLegend: OptionalString(1000, 'Reverse legend cannot exceed 1000 characters'),
  reverseDescription: OptionalString(2000, 'Reverse description cannot exceed 2000 characters'),
  reverseType: OptionalString(200, 'Reverse type cannot exceed 200 characters'),
  symbolDeityPersonification: OptionalString(200, 'Symbol/deity/personification cannot exceed 200 characters'),

  catalogReferences: {
    ric: OptionalString(120, 'RIC cannot exceed 120 characters'),
    rrcCrawford: OptionalString(120, 'RRC / Crawford cannot exceed 120 characters'),
    sear: OptionalString(120, 'Sear cannot exceed 120 characters'),
    bmc: OptionalString(120, 'BMC cannot exceed 120 characters'),
    cohen: OptionalString(120, 'Cohen cannot exceed 120 characters'),
    other: OptionalString(2000, 'Other references cannot exceed 2000 characters')
  },
  rarity: OptionalString(80, 'Rarity cannot exceed 80 characters'),
  authenticityStatus: {
    type: String,
    trim: true,
    enum: ['Unknown', 'Authentic', 'Likely authentic', 'Questionable', 'Replica', 'Forgery'],
    default: 'Unknown'
  },

  acquisitionDate: { type: Date },
  purchasePrice: MoneySchema,
  estimatedValue: MoneySchema,
  seller: OptionalString(200, 'Seller cannot exceed 200 characters'),
  auctionHouse: OptionalString(200, 'Auction house cannot exceed 200 characters'),
  lotNumber: OptionalString(80, 'Lot number cannot exceed 80 characters'),
  invoiceReferenceNumber: OptionalString(120, 'Invoice/reference number cannot exceed 120 characters'),
  sourceType: {
    type: String,
    trim: true,
    enum: ['', 'Auction', 'Dealer', 'Private seller', 'Personally found', 'Inherited', 'Gift'],
    default: ''
  },
  provenance: OptionalString(3000, 'Provenance cannot exceed 3000 characters'),
  storageLocation: OptionalString(200, 'Storage location cannot exceed 200 characters'),
  notes: OptionalString(3000, 'Personal notes cannot exceed 3000 characters'),
  tags: { type: [String], default: [] },
  addedAt: { type: Date, default: Date.now }
}, { _id: true });

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
  imageKey: {
    type: String,
    maxlength: [500, 'Image key cannot exceed 500 characters']
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
  visibility: {
    type: String,
    enum: ['Private', 'Public', 'Shared'],
    default: 'Private'
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  coins: [CoinEntrySchema]
}, { timestamps: true });

// Performance indexes
CollectionSchema.index({ user: 1 }); // For user's collections
CollectionSchema.index({ isPublic: 1, createdAt: -1 }); // Critical for public collections listing
CollectionSchema.index({ user: 1, isPublic: 1 }); // Compound for user + visibility
CollectionSchema.index({ name: 1 }); // For collection name searches
CollectionSchema.index({ 'coins.coin': 1 }); // For coin references in collections
CollectionSchema.index({ user: 1, sortOrder: 1, createdAt: -1 });
CollectionSchema.pre('validate', function syncVisibility(next) {
  if (this.visibility === 'Public') this.isPublic = true;
  if (this.visibility === 'Private' || this.visibility === 'Shared') this.isPublic = false;
  if (!this.visibility) this.visibility = this.isPublic ? 'Public' : 'Private';
  next();
});

module.exports = model('Collection', CollectionSchema);
