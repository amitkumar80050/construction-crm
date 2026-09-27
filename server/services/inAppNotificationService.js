const Notification = require('../models/Notification');

let socketServer = null;

const setSocketServer = (io) => {
  socketServer = io;
};

const createNotification = async ({ recipient, type, title, message, entityType, entityId }) => {
  if (!recipient || !type || !title || !message) return null;
  try {
    const notification = await Notification.create({ recipient, type, title, message, entityType, entityId });
    socketServer?.to(`user:${recipient}`).emit('notification:new', notification);
    return notification;
  } catch (error) {
    console.error('Unable to persist in-app notification:', error.message);
    return null;
  }
};

module.exports = { createNotification, setSocketServer };