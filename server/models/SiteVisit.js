const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['PLANNED', 'DONE', 'MISSED', 'SCHEDULED', 'COMPLETED', 'NOT_DONE'], default: 'PLANNED' },
  address: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true, default: 'MEDIUM' },
  // Completed visit fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  photoUrl: String,
  latitude: Number,
  longitude: Number,
  completedAt: Date,
  notes: String,
  // Not-done fields
  notDoneReason: { type: String, enum: ['CLIENT_UNAVAILABLE', 'POSTPONED', 'WRONG_ADDRESS', 'NOT_INTERESTED', 'OTHER'] },
  nextDate: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SiteVisit', siteVisitSchema);