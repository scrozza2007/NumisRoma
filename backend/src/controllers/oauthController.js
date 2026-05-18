const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sessionController = require('./sessionController');
const { setAuthCookie } = require('../utils/authCookie');
const logger = require('../utils/logger');
const { sendWelcomeEmail } = require('../utils/emailService');

// ---------------------------------------------------------------------------
// Shared find-or-create helper
// ---------------------------------------------------------------------------

const findOrCreateOAuthUser = async (provider, providerId, profile) => {
  // 1. Look up by provider + providerId
  let user = await User.findOne({
    oauthProviders: { $elemMatch: { provider, providerId } }
  });

  if (user) return { user, isNew: false };

  // 2. If the provider supplied a verified email, try to merge with an existing
  //    account that has the same email (user registered with password first).
  const email = profile.email ? profile.email.toLowerCase() : null;
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user.oauthProviders.push({ provider, providerId });
      // Back-fill avatar from provider if none set
      if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
      await user.save();
      return { user, isNew: false };
    }
  }

  // 3. Create brand-new user
  const baseUsername = (profile.displayName || email?.split('@')[0] || provider + '_user')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 18);

  // Ensure uniqueness by appending a short numeric suffix when needed
  let username = baseUsername;
  let suffix = 1;
  while (await User.findOne({ username }).select('_id').lean()) {
    username = `${baseUsername}_${suffix++}`;
  }

  user = new User({
    username,
    email: email || `${provider}_${providerId}@oauth.numisroma`,
    // password deliberately omitted — OAuth users have no local password
    fullName: profile.displayName || undefined,
    avatar: profile.avatar || undefined,
    oauthProviders: [{ provider, providerId }]
  });

  await user.save();
  return { user, isNew: true };
};

// ---------------------------------------------------------------------------
// Passport strategy registration (called once at startup)
// ---------------------------------------------------------------------------

const initPassport = () => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/oauth/google/callback`,
        scope: ['profile', 'email']
      },
      async (_accessToken, _refreshToken, googleProfile, done) => {
        try {
          const email = googleProfile.emails?.[0]?.value || null;
          const avatar = googleProfile.photos?.[0]?.value || null;
          const { user, isNew } = await findOrCreateOAuthUser('google', googleProfile.id, {
            displayName: googleProfile.displayName,
            email,
            avatar
          });
          done(null, { user, isNew });
        } catch (err) {
          done(err);
        }
      }
    ));
  }

  // Passport serialization — we use stateless JWTs so these are stubs
  passport.serializeUser((obj, done) => done(null, obj));
  passport.deserializeUser((obj, done) => done(null, obj));
};

// ---------------------------------------------------------------------------
// Post-authentication handler
// ---------------------------------------------------------------------------

const handleOAuthSuccess = async (req, res) => {
  try {
    const { user, isNew } = req.user;

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    await sessionController.createSession(user._id, token, req);

    setAuthCookie(res, token);

    // Send welcome email for brand-new OAuth accounts — non-blocking
    if (isNew && user.email && !user.email.includes('@oauth.numisroma')) {
      sendWelcomeEmail({ to: user.email, username: user.username }).catch(err => {
        logger.error('Welcome email failed for OAuth user (non-fatal)', { error: err.message });
      });
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const params = new URLSearchParams({ token, isNew: isNew ? '1' : '0' });
    res.redirect(`${frontendUrl}/auth/callback?${params}`);
  } catch (err) {
    logger.error('OAuth session creation failed', { error: err.message });
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    res.redirect(`${frontendUrl}/auth/callback?error=server_error`);
  }
};

const handleOAuthFailure = (req, res) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
};

module.exports = { initPassport, handleOAuthSuccess, handleOAuthFailure };
