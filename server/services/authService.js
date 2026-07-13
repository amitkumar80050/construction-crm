const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');

const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    return { success: false, message: 'Invalid credentials' };
  }

  const token = generateToken(user._id, user.role);
  
  return {
    success: true,
    token,
    user: {
      id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const validateToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
};

module.exports = { authenticateUser, validateToken };
