const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userIdSnapshot: String,   // CRM userId (CON-00021) at time of action, so logs remain readable even if user is later deleted
  userNameSnapshot: String, // name at time of action
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetType: { type: String, default: null }, // 'Client', 'Remark', 'Stage', 'Reminder', 'User'
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
  },
  type: {
    type: String,
    enum: ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import', 'seed'],
    required: true,
  },
  module: {
    type: String,
  enum: ['auth', 'client', 'leads', 'lead', 'remark', 'stage', 'reminder', 'user', 'analytics', 'attendance', 'site_visit', 'notification', 'team', 'settings', 'import', 'export', 'whatsapp', 'seed'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

activitySchema.index({ createdAt: -1, _id: -1 });
activitySchema.index({ user: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Activity', activitySchema);