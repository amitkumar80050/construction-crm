const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;

        if (!email) {
          return done(null, false, { message: 'no_email' });
        }

        // Look up ONLY — never create. Business rule: admin must have
        // pre-registered this email in the Users collection.
        const user = await User.findOne({ email });

        if (!user) {
          return done(null, false, { message: 'not_registered' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'inactive' });
        }

        // Google account linking
        if (!user.googleId) {
          user.googleId = googleId;
          user.authProvider = user.authProvider === 'local' ? 'local' : 'google';
          await user.save({ validateBeforeSave: false });
        } else if (user.googleId !== googleId) {
          // Existing googleId doesn't match — block and flag as security event
          console.warn(`⚠️  Google ID mismatch for ${email}: stored=${user.googleId}, attempted=${googleId}`);
          return done(null, false, { message: 'google_mismatch' });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
  console.log('✅ Google OAuth strategy registered (lookup-only mode)');
} else {
  console.log('⚠️  Google OAuth not configured — skipping');
}

module.exports = passport;