const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const User = require('../models/User');

const findOrCreateOAuthUser = async ({ provider, providerId, name, email, avatar }) => {
  const idField = `${provider}Id`;

  let user = await User.findOne({ [idField]: providerId });
  if (user) return user;

  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user[idField] = providerId;
      if (!user.profilePicture || user.profilePicture === 'default-profile.jpg') {
        user.profilePicture = avatar || user.profilePicture;
      }
      await user.save({ validateBeforeSave: false });
      return user;
    }
  }

  const userId = await User.generateUserId();
  user = await User.create({
    userId,
    name: name || 'New User',
    email: email ? email.toLowerCase() : `${provider}_${providerId}@no-email.buildtrackpro.com`,
    phone: 'Not provided',
    [idField]: providerId,
    authProvider: provider,
    profilePicture: avatar || 'default-profile.jpg',
  });

  return user;
};

// Only register a strategy if BOTH its client ID and secret are present in .env.
// This lets the app run normally with email/password auth even before OAuth
// credentials are configured, instead of crashing on startup.

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: 'google',
          providerId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatar: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  ));
  console.log('✅ Google OAuth strategy registered');
} else {
  console.log('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID/SECRET) — skipping');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: 'github',
          providerId: profile.id,
          name: profile.displayName || profile.username,
          email: profile.emails?.[0]?.value,
          avatar: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  ));
  console.log('✅ GitHub OAuth strategy registered');
} else {
  console.log('⚠️  GitHub OAuth not configured (missing GITHUB_CLIENT_ID/SECRET) — skipping');
}

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: '/api/auth/linkedin/callback',
      scope: ['r_emailaddress', 'r_liteprofile'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: 'linkedin',
          providerId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatar: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  ));
  console.log('✅ LinkedIn OAuth strategy registered');
} else {
  console.log('⚠️  LinkedIn OAuth not configured (missing LINKEDIN_CLIENT_ID/SECRET) — skipping');
}

module.exports = passport;