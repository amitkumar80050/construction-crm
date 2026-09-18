const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    // Accept common valid email formats including plus addressing
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please add a valid email'],
  },
    password: {
    type: String,
    minlength: 6,
    select: false,
    required: function () {
      return !this.googleId && !this.githubId && !this.linkedinId;
    },
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'telecaller', 'sales executer'],
    default: 'telecaller',
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
  },
  profilePicture: {
    type: String,
    default: 'default-profile.jpg',
  },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  linkedinId: { type: String, unique: true, sparse: true },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'github', 'linkedin'],
    default: 'local',
  },
  department: {
    type: String,
    enum: ['sales', 'marketing', 'operations', 'management'],
    default: 'sales',
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  status: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE', // existing self-registered/OAuth users stay ACTIVE; only admin-created users start PENDING
  },
  emailVerified: {
    type: Boolean,
    default: true, // existing users are grandfathered in as verified
  },
  emailVerifiedAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  lastLogin: {
    type: Date,
  },
  refreshToken: {
    type: String,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

    teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],

  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  permissions: {
    type: [String],
    enum: [
      'manage_leads',
      'manage_remarks',
      'manage_stages',
      'manage_reminders',
      'manage_users',
      'view_analytics',
      'import_data',
      'export_data',
    ],
    default: [],
  },
  
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = Date.now();
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate user ID
userSchema.statics.generateUserId = async function () {
  const lastUser = await this.findOne().sort({ createdAt: -1 });
  let lastId = 0;
  if (lastUser && lastUser.userId && lastUser.userId.includes('-')) {
    const parts = lastUser.userId.split('-');
    const num = parseInt(parts[1], 10);
    if (!isNaN(num)) lastId = num;
  }
  return `USR-${String(lastId + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('User', userSchema);