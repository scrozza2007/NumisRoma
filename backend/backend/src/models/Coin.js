const { Schema, model } = require('mongoose');

const CoinSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  authority: {
    emperor: { type: String, required: true },
    dynasty: { type: String }
  },
  description: {
    date_range: { type: String },
    mint: { type: String },
    denomination: { type: String },
    material: { type: String }
  },
  obverse: {
    legend: { type: String },
    type: { type: String },
    portrait: { type: String },
    image: { type: String },
    license: { type: String },
    credits: { type: String }
  },
  reverse: {
    legend: { type: String },
    type: { type: String },
    deity: { type: String },
    image: { type: String },
    license: { type: String },
    credits: { type: String }
  }
}, { timestamps: true });

module.exports = model('Coin', CoinSchema);