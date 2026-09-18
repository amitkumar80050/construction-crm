const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const TeamChannel = require('../models/TeamChannel');
const TeamMessage = require('../models/TeamMessage');

const checkMembership = async (req, res, next) => {
  const team = req.params.teamId;
  if (req.user.role === 'admin' || req.user.teamIds?.some((id) => String(id) === String(team))) return next();
  res.status(403).json({ success: false, message: 'Not authorized for this team' });
};

router.get('/:teamId/channels', protect, checkMembership, async (req, res) => {
  const channels = await TeamChannel.find({ team: req.params.teamId });
  res.json({ success: true, data: channels });
});

router.post('/:teamId/channels', protect, checkMembership, async (req, res) => {
  const channel = await TeamChannel.create({ team: req.params.teamId, name: req.body.name, createdBy: req.user.id });
  res.status(201).json({ success: true, data: channel });
});

router.get('/channels/:channelId/messages', protect, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const messages = await TeamMessage.find({ channel: req.params.channelId, deletedAt: null })
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  res.json({ success: true, data: messages.reverse() });
});

module.exports = router;