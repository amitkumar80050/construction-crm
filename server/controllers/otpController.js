const jwt = require('jsonwebtoken');
const User = require('../models/User');
const otpService = require('../services/otpService');
const { sendOtpEmail } = require('../services/notificationService');
const { generateToken } = require('../config/jwt');

const PRE_AUTH_SECRET = process.env.PRE_AUTH_TOKEN_SECRET;

// Issued right after Google verifies identity + CRM lookup succeeds.
// Short-lived, single purpose: prove "this browser just passed Google auth
// for this specific userId" — NOT a full session token.
function issuePreAuthToken(userId) {
  return jwt.sign({ userId, purpose: 'otp_pending' }, PRE_AUTH_SECRET, { expiresIn: '10m' });
}

function verifyPreAuthToken(token) {
  return jwt.verify(token, PRE_AUTH_SECRET); // throws if invalid/expired
}

// @desc    Verify OTP and issue final session
// @route   POST /api/auth/verify-otp
// @access  Public (requires valid preAuthToken)
const verifyOtp = async (req, res) => {
  try {
    const { preAuthToken, otp } = req.body;
    if (!preAuthToken || !otp) {
      return res.status(400).json({ success: false, message: 'Missing verification data' });
    }

    let payload;
    try {
      payload = verifyPreAuthToken(preAuthToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in with Google again.' });
    }

    const result = await otpService.verifyOtp(payload.userId, otp);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is not active.' });
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);

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
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public (requires valid preAuthToken)
const resendOtp = async (req, res) => {
  try {
    const { preAuthToken } = req.body;
    if (!preAuthToken) {
      return res.status(400).json({ success: false, message: 'Missing session data' });
    }

    let payload;
    try {
      payload = verifyPreAuthToken(preAuthToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in with Google again.' });
    }

    const { allowed, retryAfter } = await otpService.canResend(payload.userId);
    if (!allowed) {
      return res.status(429).json({ success: false, message: `Please wait ${retryAfter}s before requesting a new code.` });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is not active.' });
    }

    const { otp, expiresInSeconds } = await otpService.createOtpForUser(user._id);
    await sendOtpEmail(user.email, user.name, otp, otpService.OTP_EXPIRY_MINUTES);

    res.status(200).json({ success: true, message: 'A new code has been sent.', expiresInSeconds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { verifyOtp, resendOtp, issuePreAuthToken };