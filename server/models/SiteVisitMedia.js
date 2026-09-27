const mongoose = require('mongoose');

const siteVisitMediaSchema = new mongoose.Schema({
  siteVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisit', required: true },
  type: { type: String, enum: ['PHOTO', 'SIGNATURE', 'DOCUMENT'], default: 'PHOTO' },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  latitude: Number,
  longitude: Number,
  accuracy: Number,
  address: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SiteVisitMedia', siteVisitMediaSchema);
