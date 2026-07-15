const User = require('../models/User');
const Activity = require('../models/Activity');
const { generateToken } = require('../config/jwt');
const { sendWelcomeEmail, sendResetPasswordEmail } = require('../services/notificationService');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, department } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Generate user ID
    const userId = await User.generateUserId();

    // Create user
    const user = await User.create({
      userId,
      name,
      email,
      password,
      phone,
      role: role || 'user',
      department: department || 'sales',
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Log activity
    await Activity.create({
      user: user._id,
      type: 'create',
      module: 'auth',
      description: `User ${user.email} registered`,
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
      },
    });
  } catch (error) {
    console.error(error);
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    // Duplicate key error (unique fields)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ success: false, message: `${field} already exists` });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator',
      });
    }

    // Check if password matches
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

   // Update last login (skip full validation so unrelated legacy fields
// on the document can't block a simple login timestamp update)
user.lastLogin = Date.now();
await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Log activity
    await Activity.create({
      user: user._id,
      type: 'login',
      module: 'auth',
      description: `User ${user.email} logged in`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error(error);
    // Database unavailable
    if (
      error.message &&
      (error.message.includes('buffering timed out') || error.message.includes('failed to connect'))
    ) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Check MONGO_URI and MongoDB service.' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Log activity
    await Activity.create({
      user: req.user.id,
      type: 'logout',
      module: 'auth',
      description: `User logged out`,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error(error);
    if (
      error.message &&
      (error.message.includes('buffering timed out') || error.message.includes('failed to connect'))
    ) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Check MONGO_URI and MongoDB service.' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (
      error.message &&
      (error.message.includes('buffering timed out') || error.message.includes('failed to connect'))
    ) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Check MONGO_URI and MongoDB service.' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Send reset password email
    await sendResetPasswordEmail(user.email, user.name, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    console.error(error);
    if (
      error.message &&
      (error.message.includes('buffering timed out') || error.message.includes('failed to connect'))
    ) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Check MONGO_URI and MongoDB service.' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};


// @desc    Update current user profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, department } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (department) user.department = department;

    await user.save();

    await Activity.create({
      user: user._id,
      type: 'update',
      module: 'auth',
      description: `User ${user.email} updated their profile`,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Change current user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
};