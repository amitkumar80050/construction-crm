const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  module: {
    type: String,
    enum: ['leads', 'customers', 'users', 'projects', 'followups', 'reminders'],
    required: true,
  },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, enum: ['csv', 'excel'], required: true },
  ipAddress: { type: String },
  totalRecords: { type: Number, default: 0 },
  validRecords: { type: Number, default: 0 },
  invalidRecords: { type: Number, default: 0 },
  duplicateRecords: { type: Number, default: 0 },
  importedRecords: { type: Number, default: 0 },
  updatedRecords: { type: Number, default: 0 },
  skippedRecords: { type: Number, default: 0 },
  failedRecords: { type: Number, default: 0 },
  duplicateStrategy: {
    type: String,
    enum: ['skip', 'replace', 'update', 'only_new'],
    default: 'skip',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  errorReport: [{
    row: Number,
    column: String,
    value: mongoose.Schema.Types.Mixed,
    reason: String,
    suggestedFix: String,
  }],
  columnMapping: { type: mongoose.Schema.Types.Mixed },
  durationMs: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ImportLog', importLogSchema);