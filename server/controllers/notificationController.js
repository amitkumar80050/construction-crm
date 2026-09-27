const Notification = require('../models/Notification');
const { getIO } = require('../sockets');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    const total = await Notification.countDocuments({ recipient: req.user._id });
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      unreadCount,
      total,
      data: notifications,
    });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
    });
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notif.isRead = true;
    await notif.save();

    res.status(200).json({
      success: true,
      data: notif,
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
    });
  }
};

// @desc    Mark all user's notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
    });
  }
};

// Helper function to create and emit in-app notifications
const createInAppNotification = async ({ recipient, type, title, message, link, sender }) => {
  try {
    const notif = await Notification.create({
      recipient,
      type: type || 'system',
      title,
      message,
      link: link || '',
      sender: sender || undefined,
    });

    // Real-time WebSocket emission
    const io = getIO();
    if (io) {
      io.to(`user:${recipient}`).emit('notification:new', notif);
    }

    return notif;
  } catch (err) {
    console.error('Error creating in-app notification:', err.message);
    return null;
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  createInAppNotification,
};
