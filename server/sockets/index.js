const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamChannel = require('../models/TeamChannel');
const TeamMessage = require('../models/TeamMessage');

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('team:join', async (teamId) => {
      // Verify membership server-side — never trust the client's teamId alone
      const isMember = socket.user.role === 'admin' || socket.user.teamIds?.some((id) => String(id) === String(teamId));
      if (!isMember) return socket.emit('error', 'Not authorized for this team');
      socket.join(`team:${teamId}`);
    });

    socket.on('message:send', async ({ channelId, message, crmReference }) => {
      try {
        const channel = await TeamChannel.findById(channelId);
        if (!channel) return;

        const isMember = socket.user.role === 'admin' || socket.user.teamIds?.some((id) => String(id) === String(channel.team));
        if (!isMember) return socket.emit('error', 'Not authorized for this channel');

        const doc = await TeamMessage.create({
          channel: channelId,
          team: channel.team,
          sender: socket.user._id,
          senderName: socket.user.name,
          message,
          crmReference: crmReference || undefined,
          readBy: [socket.user._id],
        });

        io.to(`team:${channel.team}`).emit('message:new', doc);
      } catch (err) {
        console.error('message:send error:', err.message);
      }
    });

    socket.on('disconnect', () => {});
  });
}

module.exports = initSocket;