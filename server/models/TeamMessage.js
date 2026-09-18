const mongoose = require('mongoose');
const teamMessageSchema = new mongoose.Schema({
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamChannel', required: true, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: String,
  message: { type: String, default: '' },
  crmReference: {
    type: { type: String, enum: ['CLIENT', 'REMARK', 'REMINDER', null], default: null },
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMessage', default: null },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});
teamMessageSchema.index({ channel: 1, createdAt: -1 });
module.exports = mongoose.model('TeamMessage', teamMessageSchema);