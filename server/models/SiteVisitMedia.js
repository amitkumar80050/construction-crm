const mongoose = require('mongoose');

const siteVisitMediaSchema = new mongoose.Schema(
  {
    siteVisit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SiteVisit',
      required: true,
    },
    type: {
      type: String,
      enum: ['PHOTO', 'SIGNATURE', 'DOCUMENT'],
      default: 'PHOTO',
    },
    url: {
      type: String,
      required: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    accuracy: {
      type: Number, // Accuracy in meters
    },
    address: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SiteVisitMedia', siteVisitMediaSchema);
