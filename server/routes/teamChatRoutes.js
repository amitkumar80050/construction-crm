const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const TeamChannel = require('../models/TeamChannel');
const TeamMessage = require('../models/TeamMessage');
const Team = require('../models/Team');
const User = require('../models/User');

const checkMembership = async (req, res, next) => {
  const teamId = req.params.teamId;
  if (req.user.role === 'admin') return next();
  if (req.user.teamIds?.some((id) => String(id?._id || id) === String(teamId))) return next();
  const teamDoc = await Team.findById(teamId).select('teamLead status department');
  if (!teamDoc) return res.status(404).json({ success: false, message: 'Team not found' });
  if (String(teamDoc.teamLead) === String(req.user._id)) return next();
  if (teamDoc.status !== 'ARCHIVED') {
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { teamIds: teamDoc._id } });
    if (!req.user.teamIds) req.user.teamIds = [];
    req.user.teamIds.push(teamDoc._id);
    return next();
  }
  res.status(403).json({ success: false, message: 'Not authorized for this team' });
};

router.get('/:teamId/channels', protect, checkMembership, async (req, res) => {
  try {
    let channels = await TeamChannel.find({ team: req.params.teamId });
    if (!channels || channels.length === 0) {
      const generalChannel = await TeamChannel.create({
        team: req.params.teamId,
        name: 'general',
        description: 'General discussion',
        createdBy: req.user.id
      });
      channels = [generalChannel];
    }
    res.json({ success: true, data: channels });
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ success: false, message: 'Server error fetching channels' });
  }
});

router.post('/:teamId/channels', protect, checkMembership, async (req, res) => {
  try {
    const channelName = (req.body.name || '').trim().toLowerCase().replace(/\s+/g, '-');
    if (!channelName) {
      return res.status(400).json({ success: false, message: 'Channel name is required' });
    }
    const channel = await TeamChannel.create({
      team: req.params.teamId,
      name: channelName,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: channel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/channels/:channelId/messages', protect, async (req, res) => {
  try {
    const channel = await TeamChannel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    let isMember = req.user.role === 'admin' || req.user.teamIds?.some((id) => String(id?._id || id) === String(channel.team));
    if (!isMember) {
      const teamDoc = await Team.findById(channel.team).select('teamLead status');
      if (teamDoc && (String(teamDoc.teamLead) === String(req.user._id) || teamDoc.status !== 'ARCHIVED')) isMember = true;
    }
    if (!isMember) return res.status(403).json({ success: false, message: 'Not authorized for this channel' });

    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const messages = await TeamMessage.find({ channel: req.params.channelId, deletedAt: null })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/channels/:channelId/messages', protect, async (req, res) => {
  try {
    const channel = await TeamChannel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    let isMember = req.user.role === 'admin' || req.user.teamIds?.some((id) => String(id?._id || id) === String(channel.team));
    if (!isMember) {
      const teamDoc = await Team.findById(channel.team).select('teamLead status');
      if (teamDoc && (String(teamDoc.teamLead) === String(req.user._id) || teamDoc.status !== 'ARCHIVED')) isMember = true;
    }
    if (!isMember) return res.status(403).json({ success: false, message: 'Not authorized for this channel' });

    const messageText = (req.body.message || '').trim();
    if (!messageText) return res.status(400).json({ success: false, message: 'Message content cannot be empty' });

    const doc = await TeamMessage.create({
      channel: channel._id,
      team: channel.team,
      sender: req.user._id,
      senderName: req.user.name,
      message: messageText,
      crmReference: req.body.crmReference || undefined,
      readBy: [req.user._id],
    });

    try {
      const { getSocketServer } = require('../services/inAppNotificationService');
      const io = getSocketServer();
      if (io) {
        io.to(`team:${channel.team}`).emit('message:new', doc);
      }
    } catch (e) {}

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;