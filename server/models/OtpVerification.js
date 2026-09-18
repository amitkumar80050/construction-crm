const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
   purpose: {
    type: String,
    enum: ['GOOGLE_LOGIN', 'ADMIN_USER_CREATION'],
    default: 'GOOGLE_LOGIN',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — MongoDB auto-deletes the record once expiresAt passes
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);