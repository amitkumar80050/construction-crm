const mongoose = require('mongoose');

const siteVisitMediaSchema = new mongoose.Schema({
  siteVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisit', required: true },
  type: { type: String, enum: ['PHOTO', 'SIGNATURE'], required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  latitude: Number,
  longitude: Number,
  address: String,
});

module.exports = mongoose.model('SiteVisitMedia', siteVisitMediaSchema);