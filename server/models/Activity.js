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
  ipAddress: String,
  
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
  },
  type: {
    type: String,
    enum: ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import'],
    required: true,
  },
  module: {
    type: String,
    enum: ['auth', 'client', 'remark', 'stage', 'reminder', 'user', 'analytics'],
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

module.exports = mongoose.model('Activity', activitySchema);