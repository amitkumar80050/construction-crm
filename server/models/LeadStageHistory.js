const mongoose = require('mongoose');
const leadStageHistorySchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  oldStage: String,
  newStage: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: String,
  changedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('LeadStageHistory', leadStageHistorySchema);