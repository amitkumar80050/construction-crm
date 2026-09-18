const express = require('express');
const router = express.Router();
const passport = require('passport');
const { protect } = require('../middleware/authMiddleware');
const otpController = require('../controllers/otpController');
const { generateToken } = require('../config/jwt');

const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  verifyUserOtp,
  resendUserOtp, 
} = require('../controllers/authController');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const handleOAuthCallback = (req, res) => {
  const token = generateToken(req.user._id, req.user.role);
  res.redirect(`${CLIENT_URL}/oauth-success?token=${token}`);
};

// --- Google ---
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ success: false, message: 'Google sign-in is not configured yet' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// --- GitHub ---
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({ success: false, message: 'GitHub sign-in is not configured yet' });
  }
  passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
});

router.get('/github/callback',
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.redirect(`${CLIENT_URL}/login?error=github_not_configured`);
    }
    next();
  },
  passport.authenticate('github', { session: false, failureRedirect: `${CLIENT_URL}/login?error=github_failed` }),
  handleOAuthCallback
);

// --- LinkedIn ---
router.get('/linkedin', (req, res, next) => {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return res.status(503).json({ success: false, message: 'LinkedIn sign-in is not configured yet' });
  }
  passport.authenticate('linkedin', { session: false })(req, res, next);
});

router.get('/linkedin/callback',
  (req, res, next) => {
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      return res.redirect(`${CLIENT_URL}/login?error=linkedin_not_configured`);
    }
    next();
  },
  passport.authenticate('linkedin', { session: false, failureRedirect: `${CLIENT_URL}/login?error=linkedin_failed` }),
  handleOAuthCallback
);

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${CLIENT_URL}/login?error=google_not_configured`);
    }
    next();
  },
  (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
      if (err) {
        return res.redirect(`${CLIENT_URL}/login?error=google_failed`);
      }
      if (!user) {
        const reason = info?.message || 'not_registered';
        return res.redirect(`${CLIENT_URL}/login?error=${reason}`);
      }

      try {
        const otpService = require('../services/otpService');
        const { sendOtpEmail } = require('../services/notificationService');

        const { otp, expiresInSeconds } = await otpService.createOtpForUser(user._id);
        await sendOtpEmail(user.email, user.name, otp, otpService.OTP_EXPIRY_MINUTES);

        const preAuthToken = otpController.issuePreAuthToken(user._id.toString());
        return res.redirect(`${CLIENT_URL}/verify-otp?preAuthToken=${preAuthToken}&email=${encodeURIComponent(user.email)}&expiresIn=${expiresInSeconds}`);
      } catch (e) {
        console.error(e);
        return res.redirect(`${CLIENT_URL}/login?error=otp_send_failed`);
      }
    })(req, res, next);
  }
);

// --- Standard email/password auth ---
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/verify-otp', otpController.verifyOtp);
router.post('/resend-otp', otpController.resendOtp);
router.post('/verify-user-otp', verifyUserOtp);
router.post('/resend-user-otp', resendUserOtp);

module.exports = router;