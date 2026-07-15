const mongoose = require('mongoose');

const exportTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    module: { type: String, required: true },
    columns: { type: [String], default: [] },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    scope: { type: String, default: 'filtered' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExportTemplate', exportTemplateSchema);