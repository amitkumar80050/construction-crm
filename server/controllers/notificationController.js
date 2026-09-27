const Notification = require('../models/Notification');

const createNotificationController = (NotificationModel) => {
	const listNotifications = async (req, res) => {
		try {
			const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
			const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
			const query = { recipient: req.user.id };
			if (req.query.unread === 'true') query.readAt = { $exists: false };
			const unreadQuery = { recipient: req.user.id, readAt: { $exists: false } };
			const [notifications, unreadCount] = await Promise.all([
				NotificationModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
				NotificationModel.countDocuments(unreadQuery),
			]);
			return res.json({ success: true, data: notifications, unreadCount, page, limit });
		} catch (error) {
			console.error('Unable to list notifications:', error.message);
			return res.status(500).json({ success: false, message: 'Unable to load notifications.' });
		}
	};

	const markRead = async (req, res) => {
		try {
			const notification = await NotificationModel.findOneAndUpdate(
				{ _id: req.params.id, recipient: req.user.id },
				{ $set: { readAt: new Date(), isRead: true } },
				{ new: true },
			);
			if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
			return res.json({ success: true, data: notification });
		} catch (error) {
			console.error('Unable to update notification:', error.message);
			return res.status(500).json({ success: false, message: 'Unable to update notification.' });
		}
	};

	const markAllRead = async (req, res) => {
		try {
			await NotificationModel.updateMany(
				{ recipient: req.user.id, readAt: { $exists: false } },
				{ $set: { readAt: new Date(), isRead: true } },
			);
			return res.json({ success: true });
		} catch (error) {
			console.error('Unable to mark notifications read:', error.message);
			return res.status(500).json({ success: false, message: 'Unable to update notifications.' });
		}
	};

	return { listNotifications, markRead, markAllRead };
};

module.exports = { ...createNotificationController(Notification), createNotificationController };
