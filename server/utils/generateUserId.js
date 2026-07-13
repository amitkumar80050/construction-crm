const User = require('../models/User');

const generateUserId = async () => {
  const lastUser = await User.findOne().sort({ createdAt: -1 });
  const lastId = lastUser ? parseInt(lastUser.userId.split('-')[1]) : 0;
  return `USR-${String(lastId + 1).padStart(4, '0')}`;
};

module.exports = generateUserId;