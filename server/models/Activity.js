const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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