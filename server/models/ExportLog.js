const mongoose = require('mongoose');

const exportLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    module: { type: String, required: true }, // e.g. 'leads', 'users', 'activityLogs'
    exportType: { type: String, enum: ['all', 'filtered', 'selected', 'currentPage', 'assigned', 'search', 'single'], default: 'all' },
    format: { type: String, enum: ['csv', 'excel', 'pdf'], required: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    columns: { type: [String], default: [] },
    recordCount: { type: Number, default: 0 },
    ipAddress: { type: String },
    userAgent: { type: String },
    durationMs: { type: Number },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

exportLogSchema.index({ user: 1, createdAt: -1 });
exportLogSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('ExportLog', exportLogSchema);