const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PLANNED', 'DONE', 'MISSED', 'NOT_DONE'],
      default: 'PLANNED',
    },
    notDoneReason: {
      type: String,
      trim: true,
    },
    notDoneNextDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    completionNotes: {
      type: String,
      trim: true,
    },
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SiteVisitMedia',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
