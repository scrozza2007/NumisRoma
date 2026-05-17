const { Schema, model } = require('mongoose');

const ReferenceSchema = new Schema({
  system: { type: String },
  series: { type: String },
  number: { type: Number },
  suffix: { type: String }
}, { _id: false });

const ImageFileSchema = new Schema({
  obverse: { type: String },
  reverse: { type: String },
  unified: { type: String }
}, { _id: false });

const ImageSchema = new Schema({
  index: { type: Number },
  layout: { type: String, enum: ['split', 'unified'] },
  license: { type: String },
  source: { type: String },
  copyright_holder: { type: String },
  files: { type: ImageFileSchema }
}, { _id: false });

const CoinSchema = new Schema({
  // String slug _id (e.g. "ric_9_thes_12a") — overrides default ObjectId
  _id: { type: String },

  reference: { type: ReferenceSchema },
  references: { type: [ReferenceSchema], default: [] },

  title: {
    en: { type: String, required: true }
  },

  coinage: {
    date: {
      from: { type: Number, index: true },
      to:   { type: Number, index: true }
    }
  },

  authority: {
    issuer:  { type: String },
    dynasty: { type: String }
  },

  classification: {
    denomination: { type: String },
    material:     { type: String },
    mint:         { type: String }
  },

  descriptions: {
    obverse: {
      legend:  { type: String },
      type:    { type: String },
      portrait: { type: String }
    },
    reverse: {
      legend:  { type: String },
      type:    { type: String },
      portrait: { type: String }
    }
  },

  subjects: { type: [String], default: [] },

  images: { type: [ImageSchema], default: [] },

  source_ocre_url: { type: String },

  created_at: { type: Date },
  updated_at: { type: Date }
}, {
  // Don't auto-generate timestamps — the source data carries created_at/updated_at.
  timestamps: false
});

// Filtering indexes
CoinSchema.index({ 'authority.issuer': 1 });
CoinSchema.index({ 'authority.dynasty': 1 });
CoinSchema.index({ 'classification.material': 1 });
CoinSchema.index({ 'classification.denomination': 1 });
CoinSchema.index({ 'classification.mint': 1 });
CoinSchema.index({ 'coinage.date.from': 1, 'coinage.date.to': 1 });

// Compound indexes for common filter combinations
CoinSchema.index({ 'authority.issuer': 1, 'classification.material': 1 });
CoinSchema.index({ 'authority.dynasty': 1, 'coinage.date.from': 1 });
CoinSchema.index({ 'classification.material': 1, 'classification.denomination': 1 });

// Full-text search
CoinSchema.index({
  'title.en': 'text',
  'descriptions.obverse.legend': 'text',
  'descriptions.reverse.legend': 'text',
  'authority.issuer': 'text',
  'authority.dynasty': 'text',
  'classification.mint': 'text',
  'descriptions.obverse.type': 'text',
  'descriptions.reverse.type': 'text',
  'subjects': 'text'
}, {
  weights: {
    'title.en': 10,
    'authority.issuer': 8,
    'authority.dynasty': 6,
    'descriptions.obverse.legend': 4,
    'descriptions.reverse.legend': 4,
    'classification.mint': 3,
    'descriptions.obverse.type': 2,
    'descriptions.reverse.type': 2,
    'subjects': 1
  },
  name: 'coin_text_index'
});

module.exports = model('Coin', CoinSchema);
