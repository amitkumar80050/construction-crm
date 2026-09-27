const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'lead_assigned',
        'site_visit_assigned',
        'site_visit_completed',
        'site_visit_notdone',
        'attendance_pending',
        'attendance_approved',
        'attendance_rejected',
        'reminder',
        'system',
      ],
      default: 'system',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String, // Destination frontend route, e.g. /clients/:id, /site-visits, /attendance
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
