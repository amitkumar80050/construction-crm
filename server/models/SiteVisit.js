const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['PLANNED', 'DONE', 'MISSED', 'SCHEDULED', 'COMPLETED', 'NOT_DONE'], default: 'PLANNED' },
  address: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true, default: 'MEDIUM' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  photoUrl: String,
  latitude: Number,
  longitude: Number,
  completedAt: Date,
  notes: String,
  completionNotes: { type: String, trim: true },
  media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisitMedia' }],
  notDoneReason: { type: String, trim: true },
  nextDate: Date,
  notDoneNextDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
