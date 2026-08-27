const express = require('express');
const router = express.Router();
const passport = require('passport');
const { protect } = require('../middleware/authMiddleware');
const { generateToken } = require('../config/jwt');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const handleOAuthCallback = (req, res) => {
  const token = generateToken(req.user._id, req.user.role);
  // Redirect back to the frontend with the token; frontend picks it up and stores it
  res.redirect(`${CLIENT_URL}/oauth-success?token=${token}`);
};

// --- Google ---
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ success: false, message: 'Google sign-in is not configured yet' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${CLIENT_URL}/login?error=google_not_configured`);
    }
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=google_failed` }),
  handleOAuthCallback
);

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

// --- Standard email/password auth ---
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;