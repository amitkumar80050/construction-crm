const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
const Activity = require('../models/Activity');
const otpService = require('../services/otpService');
const { sendUserCreatedOtpEmail } = require('../services/notificationService');
const {
  validateCreateUser,
  validateUpdateUser,
  validateResetPassword,
  validateAssignRole,
  validateAssignPermissions,
} = require('../validations/userValidation');

const normalizeTeamIds = async (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return [];

  const entries = Array.isArray(rawValue) ? rawValue : [rawValue];
  const resolved = [];

  for (const item of entries) {
    const value = typeof item === 'string' ? item.trim() : item;
    if (!value) continue;

    if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
      resolved.push(value);
      continue;
    }

    const teamNameValue = typeof value === 'string' ? value : value?.name || value?.code || value?._id;
    if (!teamNameValue) continue;

    const team = await Team.findOne({
      $or: [
        { name: new RegExp(`^${teamNameValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { code: new RegExp(`^${teamNameValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    }).lean();

    if (!team) {
      throw new Error(`Team "${teamNameValue}" not found`);
    }

    resolved.push(String(team._id));
  }

  return [...new Set(resolved)];
};

// @desc    Get all users (search, filter, sort, paginate)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    let query = {};

    // By default, hide soft-deleted users unless explicitly requested
    if (req.query.includeDeleted === 'true') {
      // no filter — show all
    } else if (req.query.deletedOnly === 'true') {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
    }

    if (req.query.role) query.role = req.query.role;
    if (req.query.department) query.department = req.query.department;
    if (req.query.status === 'active') query.isActive = true;
    if (req.query.status === 'inactive') query.isActive = false;

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { userId: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Sorting
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .populate('teamIds', 'name code')
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .sort(sort)
      .limit(limit)
      .skip(startIndex);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a new user (admin-created, no self-registration flow)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { valid, errors } = validateCreateUser(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const { name, email, password, phone, role, department, permissions, teamIds, teams } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    let resolvedTeamIds = [];
    if (teamIds !== undefined || teams !== undefined) {
      resolvedTeamIds = await normalizeTeamIds(teamIds ?? teams);
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const userId = await User.generateUserId();

    const user = await User.create({
      userId,
      name,
      email: normalizedEmail,
      password,
      phone,
      role: role || 'user',
      department: department || 'sales',
      permissions: Array.isArray(permissions) ? permissions : [],
      teamIds: resolvedTeamIds,
      status: 'PENDING_VERIFICATION',
      emailVerified: false,
      createdBy: req.user.id,
    });

    // Generate + send OTP. If the email fails, the user record still exists
    // in PENDING_VERIFICATION state so the admin can trigger a resend later —
    // we do NOT roll back user creation on email failure.
    let otpSent = true;
    let otpErrorMessage = null;
    try {
      const { otp } = await otpService.createOtpForUser(user._id, 'ADMIN_USER_CREATION');
      await sendUserCreatedOtpEmail(user.email, user.name, user.userId, otp, otpService.OTP_EXPIRY_MINUTES);
    } catch (emailError) {
      console.error('Failed to send OTP on user creation:', emailError.message);
      otpSent = false;
      otpErrorMessage = 'User created, but the verification email could not be sent. Use "Resend OTP" to try again.';
    }

    await Activity.create({
      user: req.user.id,
      type: 'create',
      module: 'user',
      description: `Created user: ${user.email} (pending verification)`,
    });

    const created = await User.findById(user._id).select('-password -refreshToken');

    res.status(201).json({
      success: true,
      message: otpSent
        ? 'User created successfully. Verification OTP has been sent to the registered email.'
        : otpErrorMessage,
      otpSent,
      data: created,
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update user (name, email, phone, department — not role/permissions/password)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { valid, errors } = validateUpdateUser(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const { password, role, permissions, teamIds, teams, ...updateData } = req.body; // eslint-disable-line no-unused-vars
    // Password, role, and permissions have dedicated endpoints — ignored here for clarity/safety

    if (teamIds !== undefined || teams !== undefined) {
      updateData.teamIds = await normalizeTeamIds(teamIds ?? teams);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'user',
      description: `Updated user: ${user.email}`,
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Soft delete user (deactivate, keep record)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const softDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isDeleted = true;
    user.isActive = false;
    user.deletedAt = Date.now();
    await user.save();

    await Activity.create({
      user: req.user.id,
      type: 'delete',
      module: 'user',
      description: `Soft-deleted user: ${user.email}`,
    });

    res.status(200).json({ success: true, message: 'User deleted (soft) successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Restore a soft-deleted user
// @route   PUT /api/users/:id/restore
// @access  Private/Admin
const restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isDeleted = false;
    user.isActive = true;
    user.deletedAt = undefined;
    await user.save();

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'user',
      description: `Restored user: ${user.email}`,
    });

    res.status(200).json({ success: true, message: 'User restored successfully', data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Permanently delete a user (hard delete — irreversible)
// @route   DELETE /api/users/:id/permanent
// @access  Private/Admin
const permanentlyDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.deleteOne();

    await Activity.create({
      user: req.user.id,
      type: 'delete',
      module: 'user',
      description: `Permanently deleted user: ${user.email}`,
    });

    res.status(200).json({ success: true, message: 'User permanently deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Admin resets a user's password directly (no current-password check)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
const resetUserPassword = async (req, res) => {
  try {
    const { valid, errors } = validateResetPassword(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = req.body.newPassword; // hashed by pre-save hook
    await user.save();

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'user',
      description: `Reset password for user: ${user.email}`,
    });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Assign / change a user's role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const assignRole = async (req, res) => {
  try {
    const { valid, errors } = validateAssignRole(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    if (req.params.id === req.user.id && req.body.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot downgrade your own admin role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'user',
      description: `Changed role for ${user.email} to ${user.role}`,
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Assign permissions to a user
// @route   PUT /api/users/:id/permissions
// @access  Private/Admin
const assignPermissions = async (req, res) => {
  try {
    const { valid, errors } = validateAssignPermissions(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body.permissions },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'user',
      description: `Updated permissions for ${user.email}`,
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update own profile (self-service — unchanged, kept for backward compatibility)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { password, role, permissions, ...updateData } = req.body; // eslint-disable-line no-unused-vars

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -refreshToken');

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  softDeleteUser,
  restoreUser,
  permanentlyDeleteUser,
  resetUserPassword,
  assignRole,
  assignPermissions,
  updateProfile,
};