const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  link: { type: String, trim: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  entityType: { type: String, trim: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
