const crypto = require('crypto');
const OtpVerification = require('../models/OtpVerification');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
const RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN) || 60;

function generateOtp() {
  // Cryptographically secure 6-digit numeric OTP
  const num = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(num).padStart(OTP_LENGTH, '0');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function createOtpForUser(userId, purpose = 'GOOGLE_LOGIN') {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OtpVerification.deleteMany({ user: userId, purpose, verified: false });

  await OtpVerification.create({ user: userId, otpHash, purpose, expiresAt });

  return { otp, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
}

async function verifyOtp(userId, submittedOtp, purpose = 'GOOGLE_LOGIN') {
  const record = await OtpVerification.findOne({
    user: userId,
    purpose,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!record) {
    return { success: false, message: 'Invalid or expired verification code.' };
  }

  if (record.expiresAt < new Date()) {
    return { success: false, message: 'Invalid or expired verification code.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { success: false, message: 'Too many attempts. Please request a new code.' };
  }

  const submittedHash = hashOtp(submittedOtp);

  if (submittedHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return { success: false, message: 'Invalid or expired verification code.' };
  }

  record.verified = true;
  await record.save();
  return { success: true };
}

async function canResend(userId, purpose = 'GOOGLE_LOGIN') {
  const latest = await OtpVerification.findOne({ user: userId, purpose }).sort({ createdAt: -1 });

  const secondsSinceLast = (Date.now() - latest.createdAt.getTime()) / 1000;
  if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
    return { allowed: false, retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast) };
  }
  return { allowed: true };
}

module.exports = {
  createOtpForUser,
  verifyOtp,
  canResend,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
};