const crypto = require('crypto');
const dns = require('dns').promises;
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const Collection = require('../models/Collection');
const Follow = require('../models/Follow');
const Session = require('../models/Session');
const CoinCustomImage = require('../models/CoinCustomImage');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const sessionController = require('./sessionController');
const { generateTokenPair, refreshAccessToken, revokeRefreshToken, revokeAllRefreshTokens, hashToken, recordAuditEvent } = require('../utils/tokenManager');
const { setAuthCookie, setRefreshCookie, clearAuthCookie, clearRefreshCookie } = require('../utils/authCookie');
const { extractToken } = require('../middlewares/authMiddleware');
const { sanitizeString } = require('../middlewares/enhancedValidation');
const logger = require('../utils/logger');
const emailService = require('../utils/emailService');
const { isDeliverableEmail } = require('../utils/emailValidator');
const PasswordResetToken = require('../models/PasswordResetToken');
const { resolveApproximateLocation } = require('../utils/sessionLocation');

// Common weak passwords blacklist (lowercased). Extend as needed.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd',
  '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'abc12345',
  'iloveyou', 'admin123', 'welcome1', 'letmein1',
  'monkey123', 'dragon123', 'master123'
]);

/**
 * Validate password strength on the backend.
 * Never trust client-side validation alone.
 * Enforces length bounds, character classes, rejects common weak passwords,
 * and blocks long runs of repeated characters.
 */
const validatePasswordStrength = (password) => {
  const MIN_LENGTH = 8;
  // bcrypt truncates silently at 72 bytes and is CPU-expensive for very long
  // inputs; cap at 128 chars to prevent DoS via huge password payloads.
  const MAX_LENGTH = 128;

  if (typeof password !== 'string') {
    return {
      valid: false,
      error: 'Password must be a string',
      field: 'password'
    };
  }

  if (password.length < MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_LENGTH} characters long`,
      field: 'password'
    };
  }

  if (password.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `Password cannot exceed ${MAX_LENGTH} characters`,
      field: 'password'
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~]/.test(password);

  if (!hasUpperCase) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
      field: 'password'
    };
  }
  if (!hasNumber) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
      field: 'password'
    };
  }
  if (!hasSpecialChar) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*...)',
      field: 'password'
    };
  }

  // Reject 4+ consecutive identical characters (e.g. "aaaa", "1111").
  if (/(.)\1{3,}/.test(password)) {
    return {
      valid: false,
      error: 'Password cannot contain 4 or more consecutive identical characters',
      field: 'password'
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      error: 'This password is too common. Please choose a stronger one',
      field: 'password'
    };
  }

  return { valid: true };
};

// RFC 2606 reserved / IANA example domains + common throwaway patterns
const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net',
  'test.com', 'test.org', 'test.net',
  'localhost', 'invalid', 'local',
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.de',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'spam4.me', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.io', 'trashmail.at',
  'trashmail.de', 'trashmail.me', 'dispostable.com', 'mailnull.com',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'tempmail.com', 'temp-mail.org', 'tempr.email',
  'discard.email', 'fakeinbox.com', 'mailnesia.com', 'maildrop.cc',
  'spamfree24.org', 'throwam.com', 'throwam.net', 'throwaway.email',
  'getnada.com', 'inboxbear.com', 'spambog.com', 'spambog.de',
  'spambog.ru', 'einrot.com', 'drdrb.com', 'drdrb.net',
  'filzmail.com', 'zetmail.com', 'mt2014.com', 'mt2015.com',
  'spamthisplease.com', 'humaility.com', 'jetable.com', 'jetable.net',
  'jetable.org', 'nomail.pw', 'owlpic.com'
]);

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_SENDS_PER_HOUR = process.env.NODE_ENV === 'production' ? 5 : 20;
const OTP_MAX_ATTEMPTS = process.env.NODE_ENV === 'production' ? 5 : 20;

const issueBrowserSession = async (res, userId, req, loginMethod = 'password', rememberMe = false) => {
  const { token: existingAccessToken } = extractToken(req);
  if (existingAccessToken) {
    const replacedSession = await Session.findOneAndUpdate(
      { userId, token: hashToken(existingAccessToken), isActive: true },
      { $set: { isActive: false, revokedAt: new Date(), revocationReason: 'reauthenticated' } }
    );
    if (replacedSession) {
      await recordAuditEvent({
        userId,
        sessionId: replacedSession._id,
        eventType: 'reauthenticated',
        severity: 'info'
      });
    }
  }
  const requestMetadata = sessionController.getRequestSessionMetadata(req);
  const geoLocation = await resolveApproximateLocation(requestMetadata.ipAddress);
  const tokenPair = await generateTokenPair(userId, {
    rememberMe,
    sessionMetadata: {
      ...requestMetadata,
      geoLocation,
      loginMethod
    }
  });
  setAuthCookie(res, tokenPair.accessToken, { rememberMe });
  setRefreshCookie(res, tokenPair.refreshToken, { rememberMe });
  return tokenPair;
};

const sendLoginRiskAlert = (user, tokenPair) => {
  if (!tokenPair.riskFlags?.length || !user.email) return;
  emailService.sendSecurityAlertEmail({
    to: user.email,
    username: user.username,
    device: tokenPair.deviceInfo?.deviceName || 'Unknown device',
    location: tokenPair.location || 'Unknown location',
    riskFlags: tokenPair.riskFlags
  }).catch((error) => logger.error('Login security alert email failed (non-fatal)', { error: error.message }));
};

/**
 * Step 1 — Validate email + username, send OTP.
 * POST /api/auth/register/initiate
 * Body: { username, email, password }
 */
exports.initiateRegistration = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.param, message: e.msg }))
    });
  }

  const { username, email, password } = req.body;

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error, field: passwordValidation.field });
  }

  try {
    // Username is public — safe to surface conflicts
    const existingUsername = await User.findOne({ username }).select('_id').lean();
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken', field: 'username' });
    }

    // Email conflict — same generic message as the original registerUser to
    // avoid leaking whether an address is already registered
    const existingEmail = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    if (existingEmail) {
      return res.status(409).json({
        error: 'An account with this email already exists',
        field: 'email'
      });
    }

    // Reject known fake/disposable/reserved domains before attempting delivery.
    const emailDomain = email.split('@')[1].toLowerCase();
    if (BLOCKED_EMAIL_DOMAINS.has(emailDomain)) {
      return res.status(400).json({
        error: 'Please use a real email address to register.',
        field: 'email'
      });
    }

    // Verify the domain has MX records — rejects typos and non-existent domains.
    try {
      const mxRecords = await dns.resolveMx(emailDomain);
      if (!mxRecords || mxRecords.length === 0) {
        return res.status(400).json({
          error: 'This email address does not appear to be valid. Please use a real email.',
          field: 'email'
        });
      }
    } catch {
      return res.status(400).json({
        error: 'This email address does not appear to be valid. Please use a real email.',
        field: 'email'
      });
    }

    // Probe the mailbox via Abstract API — rejects non-existent addresses and
    // disposable/throwaway providers before we attempt delivery via Resend.
    const deliverable = await isDeliverableEmail(email);
    if (!deliverable) {
      return res.status(400).json({
        error: 'This email address does not appear to be valid or cannot receive mail. Please use a real email.',
        field: 'email'
      });
    }

    const now = Date.now();

    // Check per-hour send limit before upserting
    const existing = await PendingRegistration.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      const hourAgo = new Date(now - 60 * 60 * 1000);
      if (existing.lastSentAt > hourAgo && existing.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
        return res.status(429).json({
          error: 'Too many verification codes requested. Please try again in an hour.',
          code: 'OTP_RATE_LIMITED'
        });
      }
      // Enforce cooldown between resends
      if (existing.lastSentAt && (now - existing.lastSentAt.getTime()) < OTP_RESEND_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000);
        return res.status(429).json({
          error: `Please wait ${retryAfterSec} seconds before requesting a new code.`,
          code: 'OTP_COOLDOWN',
          retryAfterSeconds: retryAfterSec
        });
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = PendingRegistration.hashOtp(otp);
    const otpExpiresAt = new Date(now + OTP_TTL_MS);
    const passwordHash = await bcrypt.hash(password, 10);

    const newSendCount = existing ? (existing.sendCount >= OTP_MAX_SENDS_PER_HOUR ? 1 : existing.sendCount + 1) : 1;

    await PendingRegistration.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          username,
          passwordHash,
          otpHash,
          otpExpiresAt,
          failedAttempts: 0,
          used: false,
          sendCount: newSendCount,
          lastSentAt: new Date(now)
        }
      },
      { upsert: true, new: true }
    );

    try {
      await emailService.sendOtpEmail({ to: email, otp, expiryMinutes: 10 });
    } catch (emailErr) {
      logger.error('OTP email delivery failed', {
        email,
        error: emailErr.message,
        resendError: emailErr.resendError
      });
      // Clean up the pending record so the user can retry
      await PendingRegistration.deleteOne({ email: email.toLowerCase() });
      const detail = emailErr.resendError?.message || emailErr.message;
      return res.status(502).json({
        error: 'Failed to send verification email. Please try again.',
        code: 'EMAIL_SEND_FAILED',
        detail: process.env.NODE_ENV !== 'production' ? detail : undefined
      });
    }

    return res.status(202).json({
      message: 'Verification code sent. Please check your email.',
      expiresInMinutes: 10
    });
  } catch (err) {
    logger.error('Registration initiation error', { error: err.message });
    return res.status(500).json({ error: 'Server error', message: 'An unexpected error occurred' });
  }
};

/**
 * Step 2 — Resend OTP (respects cooldown + per-hour cap).
 * POST /api/auth/register/resend-otp
 * Body: { email }
 */
exports.resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const pending = await PendingRegistration.findOne({ email: email.toLowerCase() });
    if (!pending) {
      // Don't reveal whether the email has a pending registration
      return res.status(400).json({ error: 'No pending registration found. Please start over.' });
    }

    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000);

    if (pending.lastSentAt > hourAgo && pending.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
      return res.status(429).json({
        error: 'Too many verification codes requested. Please try again in an hour.',
        code: 'OTP_RATE_LIMITED'
      });
    }

    if (pending.lastSentAt && (now - pending.lastSentAt.getTime()) < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - pending.lastSentAt.getTime())) / 1000);
      return res.status(429).json({
        error: `Please wait ${retryAfterSec} seconds before requesting a new code.`,
        code: 'OTP_COOLDOWN',
        retryAfterSeconds: retryAfterSec
      });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = PendingRegistration.hashOtp(otp);
    const otpExpiresAt = new Date(now + OTP_TTL_MS);
    const newSendCount = pending.sendCount >= OTP_MAX_SENDS_PER_HOUR ? 1 : pending.sendCount + 1;

    await PendingRegistration.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          otpHash,
          otpExpiresAt,
          failedAttempts: 0,
          used: false,
          sendCount: newSendCount,
          lastSentAt: new Date(now)
        }
      }
    );

    try {
      await emailService.sendOtpEmail({ to: email, otp, expiryMinutes: 10 });
    } catch (emailErr) {
      logger.error('OTP resend email delivery failed', { email, error: emailErr.message });
      return res.status(502).json({
        error: 'Failed to send verification email. Please try again.',
        code: 'EMAIL_SEND_FAILED'
      });
    }

    return res.status(202).json({
      message: 'New verification code sent.',
      expiresInMinutes: 10
    });
  } catch (err) {
    logger.error('Resend OTP error', { error: err.message });
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Step 3 — Verify OTP and create account.
 * POST /api/auth/register/verify
 * Body: { email, otp }
 */
exports.verifyOtpAndRegister = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const pending = await PendingRegistration.findOne({ email: email.toLowerCase() });

    if (!pending) {
      return res.status(400).json({
        error: 'No pending registration found. Please start over.',
        code: 'NO_PENDING'
      });
    }

    if (pending.used) {
      return res.status(400).json({ error: 'This code has already been used. Please start over.', code: 'OTP_USED' });
    }

    if (new Date() > pending.otpExpiresAt) {
      await PendingRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(400).json({ error: 'Verification code has expired. Please start over.', code: 'OTP_EXPIRED' });
    }

    if (pending.failedAttempts >= OTP_MAX_ATTEMPTS) {
      await PendingRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(400).json({
        error: 'Too many failed attempts. Please start the registration over.',
        code: 'OTP_MAX_ATTEMPTS'
      });
    }

    const submittedHash = PendingRegistration.hashOtp(otp);
    if (submittedHash !== pending.otpHash) {
      await PendingRegistration.updateOne(
        { email: email.toLowerCase() },
        { $inc: { failedAttempts: 1 } }
      );
      const attemptsLeft = OTP_MAX_ATTEMPTS - (pending.failedAttempts + 1);
      return res.status(400).json({
        error: 'Invalid verification code.',
        code: 'OTP_INVALID',
        attemptsLeft: Math.max(0, attemptsLeft)
      });
    }

    // Mark as used immediately to prevent replay
    await PendingRegistration.updateOne({ email: email.toLowerCase() }, { $set: { used: true } });

    // Guard against a race where another request registered the same email/username
    const [takenEmail, takenUsername] = await Promise.all([
      User.findOne({ email: email.toLowerCase() }).select('_id').lean(),
      User.findOne({ username: pending.username }).select('_id').lean()
    ]);

    if (takenEmail) {
      await PendingRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(409).json({ error: 'An account with this email already exists.', field: 'email' });
    }
    if (takenUsername) {
      await PendingRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(409).json({ error: 'Username already taken.', field: 'username' });
    }

    const user = new User({
      username: pending.username,
      email: email.toLowerCase(),
      password: pending.passwordHash
    });

    try {
      await user.save();
    } catch (err) {
      if (err && err.code === 11000) {
        logger.info('Race condition during OTP verify — duplicate key', { keyPattern: err.keyPattern });
        await PendingRegistration.deleteOne({ email: email.toLowerCase() });
        return res.status(409).json({ error: 'Registration failed. Please try again.', code: 'CONFLICT' });
      }
      throw err;
    }

    // Clean up pending registration
    await PendingRegistration.deleteOne({ email: email.toLowerCase() });

    try {
      await issueBrowserSession(res, user._id, req);
    } catch (sessionError) {
      logger.error('Session creation failed after OTP verification', { error: sessionError.message, userId: user._id });
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ error: 'Registration failed', message: 'Unable to create session. Please try again.' });
    }

    // Send welcome email — non-blocking; failure doesn't roll back the registration
    emailService.sendWelcomeEmail({ to: email, username: user.username }).catch(err => {
      logger.error('Welcome email failed (non-fatal)', { email, error: err.message });
    });

    return res.status(201).json({
      authenticated: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    logger.error('OTP verification error', { error: err.message });
    return res.status(500).json({ error: 'Server error', message: 'An unexpected error occurred' });
  }
};

// Registration
exports.registerUser = async (req, res) => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  const { username, email, password } = req.body;

  try {
    // Validate password strength on backend (never trust client-side validation)
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: passwordValidation.error,
        field: passwordValidation.field
      });
    }

    // SECURITY: registration must not leak which specific field (email vs
    // username) is already taken, since that enables account enumeration.
    //
    // The *username* IS public (used as profile URL and in /check-username)
    // and will eventually be discoverable by an attacker anyway. But the
    // *email* must remain private. We therefore:
    //   1. Check username availability (safe to surface to the user).
    //   2. Rely on the unique index + duplicate-key handling for email:
    //      if the email is taken, we return a generic 400 and DO NOT tell
    //      the caller that the email exists.
    const existingUsername = await User.findOne({ username }).select('_id').lean();
    if (existingUsername) {
      return res.status(409).json({
        error: 'Username already taken',
        field: 'username'
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    if (existingEmail) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'Could not create account. Please check your details and try again.'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10)
    });

    try {
      await user.save();
    } catch (err) {
      // Duplicate key → almost certainly the email, since username was just
      // checked above (a race here falls back to the same path). Return a
      // generic "registration failed" without leaking the field.
      if (err && err.code === 11000) {
        logger.info('Registration conflict (duplicate key)', {
          keyPattern: err.keyPattern
        });
        return res.status(400).json({
          error: 'Registration failed',
          message: 'Could not create account. Please check your details and try again.'
        });
      }
      throw err;
    }

    // Session creation is critical for security - fail registration if it fails
    try {
      await issueBrowserSession(res, user._id, req);
    } catch (sessionError) {
      logger.error('Session creation failed during registration', { 
        error: sessionError.message,
        userId: user._id 
      });
      
      // Clean up user if session creation fails
      await User.findByIdAndDelete(user._id);
      
      return res.status(500).json({ 
        error: 'Registration failed',
        message: 'Unable to create user session. Please try again.'
      });
    }

    res.status(201).json({
      authenticated: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    logger.error('Registration error', { error: err.message });
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred during registration'
    });
  }
};

// Login
exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  const { identifier, password, rememberMe = false } = req.body;

  const LOCKOUT_THRESHOLD = 10;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  try {
    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    // Always perform password comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const passwordToCompare = user ? user.password : dummyHash;
    const isMatch = await bcrypt.compare(password, passwordToCompare);

    if (!user || !isMatch) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

      // Increment failed attempts and possibly lock the account
      if (user) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const update = { failedLoginAttempts: attempts };
        if (attempts >= LOCKOUT_THRESHOLD) {
          update.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          update.failedLoginAttempts = 0; // reset counter after locking
        }
        await User.updateOne({ _id: user._id }, { $set: update });
      }

      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'The email/username or password you entered is incorrect'
      });
    }

    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const secondsLeft = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: 'Account temporarily locked',
        message: `Too many failed login attempts. Try again in ${Math.ceil(secondsLeft / 60)} minute(s).`
      });
    }

    // Successful login — reset lockout state
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
      );
    }

    // Session creation is critical for security - fail login if it fails
    try {
      const tokenPair = await issueBrowserSession(res, user._id, req, 'password', Boolean(rememberMe));
      sendLoginRiskAlert(user, tokenPair);
    } catch (sessionError) {
      logger.error('Session creation failed during login', { 
        error: sessionError.message,
        userId: user._id 
      });
      
      return res.status(500).json({ 
        error: 'Login failed',
        message: 'Unable to create session. Please try again.'
      });
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred during login'
    });
  }
};

// Logout
exports.logoutUser = async (req, res) => {
  try {
    // Token can now come from either the httpOnly cookie or the Authorization
    // header; use the same extractor as the auth middleware so we stay in sync.
    const { token } = extractToken(req);
    const userId = req.user.userId;

    if (token) {
      const revokedSession = await Session.findOneAndUpdate(
        { userId, token: hashToken(token), isActive: true },
        { $set: { isActive: false, revokedAt: new Date(), revocationReason: 'logout' } }
      );
      if (revokedSession) {
        await recordAuditEvent({ userId, sessionId: revokedSession._id, eventType: 'logout', severity: 'info' });
      }
    }

    // Always clear both cookies, regardless of how the client authenticated,
    // so cookie-based clients get a clean state.
    clearAuthCookie(res);
    clearRefreshCookie(res);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    // Validate new password strength on backend
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: passwordValidation.error,
        field: 'newPassword'
      });
    }

    const user = await User.findById(userId).select('password').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({
        error: 'Your account uses social sign-in and has no local password. Set a password from your account settings.',
        code: 'NO_LOCAL_PASSWORD'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        field: 'currentPassword'
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'New password must be different from current password',
        field: 'newPassword'
      });
    }

    // Atomic update guarded on the *old* hash. If another request already
    // rotated the password in between our bcrypt compare and this update,
    // we fail cleanly instead of overwriting it (prevents classic
    // read-modify-write races that could let a stale credential stomp a
    // newly-rotated one).
    const newHash = await bcrypt.hash(newPassword, 10);
    const updateResult = await User.updateOne(
      { _id: userId, password: user.password },
      { $set: { password: newHash } }
    );
    if (updateResult.matchedCount === 0) {
      return res.status(409).json({
        error: 'Password was changed concurrently. Please retry.',
        code: 'PASSWORD_CONFLICT'
      });
    }

    // Terminate all other sessions after password change for security.
    // Use the unified token extractor so this works regardless of whether the
    // caller authenticated via cookie or Authorization header.
    const { token: currentToken } = extractToken(req);
    const excludeClause = currentToken ? { token: { $ne: hashToken(currentToken) } } : {};
    await Session.updateMany(
      { userId, isActive: true, ...excludeClause },
      { $set: { isActive: false } }
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error('Password change error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
};

// Change username
exports.changeUsername = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  const { username } = req.body;
  const userId = req.user.userId;

  try {
    // Check if username already exists
    const existingUsername = await User.findOne({ 
      username, 
      _id: { $ne: userId } 
    });
    
    if (existingUsername) {
      return res.status(409).json({ 
        error: 'Username already taken',
        field: 'username'
      });
    }

    // Find user and update username
    const user = await User.findByIdAndUpdate(
      userId,
      { username },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Username changed successfully',
      user
    });
  } catch (err) {
    logger.error('Username change error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  const { fullName, email, location, bio } = req.body;
  const userId = req.user.userId;

  try {
    // Check if email already exists for another user
    if (email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: userId }
      }).select('_id').lean();

      if (existingEmail) {
        return res.status(409).json({
          error: 'Email already registered',
          field: 'email'
        });
      }
    }

    // Build update payload. All free-text fields are sanitized server-side
    // before persist — never trust client-supplied HTML even if the field
    // is later rendered as plain text (defense in depth).
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = sanitizeString(fullName);
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
    if (location !== undefined) updateData.location = sanitizeString(location);
    if (bio !== undefined) updateData.bio = sanitizeString(bio);

    // Detect if the email is actually changing so we can invalidate other
    // sessions (same policy as changePassword — an email swap is a security-
    // sensitive event, because the email is the recovery channel).
    let emailChanged = false;
    if (updateData.email) {
      const current = await User.findById(userId).select('email').lean();
      emailChanged = Boolean(current && current.email !== updateData.email);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (emailChanged) {
      // Keep the caller's current session alive; invalidate all others.
      const { token: currentToken } = extractToken(req);
      try {
        await Session.updateMany(
          { userId, isActive: true, ...(currentToken ? { token: { $ne: hashToken(currentToken) } } : {}) },
          { $set: { isActive: false } }
        );
      } catch (err) {
        logger.error('Failed to invalidate sessions after email change', {
          userId,
          error: err.message
        });
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (err) {
    // Duplicate-key on email race with another update.
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: 'Email already registered',
        field: 'email'
      });
    }
    logger.error('Profile update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  const { password } = req.body;
  const userId = req.user.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is missing' });
  }

  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  const sendDeletionConfirmation = (deletedUser) => {
    if (!deletedUser?.email) return;

    emailService.sendAccountDeletionEmail({
      to: deletedUser.email,
      username: deletedUser.username
    }).catch(err => {
      logger.error('Failed to send account deletion confirmation', {
        userId,
        error: err.message
      });
    });
  };

  const performDeletion = async (mongoSession = null) => {
    const sessionOption = mongoSession ? { session: mongoSession } : {};
    const user = await User.findById(userId, null, sessionOption);
    if (!user) {
      return { notFound: true };
    }

    // OAuth-only users have no local password — skip password verification.
    // Users with a local password must always confirm it.
    const hasLocalPassword = Boolean(user.password);
    if (hasLocalPassword) {
      if (!password) {
        return { invalidPassword: true };
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return { invalidPassword: true };
      }
    }

    const participatingConversations = await Conversation.find(
      { participants: userId },
      { _id: 1 },
      sessionOption
    ).lean();
    const conversationIds = participatingConversations.map((c) => c._id);

    const [
      collectionsResult,
      followsResult,
      sessionsResult,
      customImagesResult,
      messagesBySenderResult,
      messagesInConvosResult,
      conversationsResult
    ] = await Promise.all([
      Collection.deleteMany({ user: userId }, sessionOption),
      Follow.deleteMany({
        $or: [{ follower: userId }, { following: userId }]
      }, sessionOption),
      Session.deleteMany({ userId }, sessionOption),
      CoinCustomImage.deleteMany({ userId }, sessionOption),
      Message.deleteMany({ sender: userId }, sessionOption),
      conversationIds.length > 0
        ? Message.deleteMany({ conversation: { $in: conversationIds } }, sessionOption)
        : Promise.resolve({ deletedCount: 0 }),
      Conversation.deleteMany({ participants: userId }, sessionOption)
    ]);

    await User.findByIdAndDelete(userId, sessionOption);

    logger.info('User account deletion in progress', {
      userId,
      username: user.username,
      deletedCollections: collectionsResult.deletedCount,
      deletedFollows: followsResult.deletedCount,
      deletedSessions: sessionsResult.deletedCount,
      deletedCustomImages: customImagesResult.deletedCount,
      deletedMessagesBySender: messagesBySenderResult.deletedCount,
      deletedMessagesInConversations: messagesInConvosResult.deletedCount,
      deletedConversations: conversationsResult.deletedCount
    });

    return { user };
  };

  let transactionStarted = false;

  try {
    session.startTransaction();
    transactionStarted = true;
    let result = await performDeletion(session);

    if (result.notFound) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'User not found' });
    }
    if (result.invalidPassword) {
      await session.abortTransaction();
      return res.status(400).json({
        error: 'Password is incorrect',
        field: 'password'
      });
    }

    await session.commitTransaction();

    logger.info('User account deleted successfully', {
      userId,
      username: result.user.username
    });

    sendDeletionConfirmation(result.user);

    // Clear the auth cookie so the browser state matches server state.
    clearAuthCookie(res);
    clearRefreshCookie(res);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    // Mongo standalone deployments do not support transactions. Fallback to
    // best-effort non-transactional deletion so local/dev Docker still works.
    const transactionUnsupported = /Transaction numbers are only allowed on a replica set member or mongos/i.test(err.message);
    if (transactionUnsupported) {
      try {
        logger.warn('Transactions unsupported; falling back to non-transactional account deletion', {
          userId
        });
        const result = await performDeletion(null);
        if (result.notFound) {
          return res.status(404).json({ error: 'User not found' });
        }
        if (result.invalidPassword) {
          return res.status(400).json({
            error: 'Password is incorrect',
            field: 'password'
          });
        }

        logger.info('User account deleted successfully (fallback mode)', {
          userId,
          username: result.user.username
        });
        sendDeletionConfirmation(result.user);
        clearAuthCookie(res);
        clearRefreshCookie(res);
        return res.json({ message: 'Account deleted successfully' });
      } catch (fallbackErr) {
        logger.error('Fallback account deletion error', {
          error: fallbackErr.message,
          userId,
          stack: fallbackErr.stack
        });
        return res.status(500).json({ error: 'Server error' });
      }
    }

    if (transactionStarted) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.warn('Failed to abort account deletion transaction', {
          error: abortErr.message,
          userId
        });
      }
    }

    logger.error('Account deletion error', { 
      error: err.message,
      userId,
      stack: err.stack 
    });
    res.status(500).json({ error: 'Server error' });
  } finally {
    session.endSession();
  }
};

// Check session status
exports.checkSession = async (req, res) => {
  try {
    return res.status(200).json({
      active: true
    });
  } catch (error) {
    logger.error('Session check error', { error: error.message });
    res.status(500).json({ error: 'Server error during session check' });
  }
};

// Refresh-token endpoints return the same message under `error`, `message`,
// and `msg` so clients can read whichever field name they expect.
const jsonError = (res, status, message, extra = {}) =>
  res.status(status).json({ error: message, message, msg: message, ...extra });

/**
 * Enhanced login with refresh token support
 */
exports.loginWithRefresh = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Validation failed',
      msg: 'Validation failed',
      details: errors.array()
    });
  }

  try {
    const { identifier, password, rememberMe = false } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    // Always run bcrypt comparison against SOMETHING — constant-time guard
    // against user-enumeration via response timing.
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const isPasswordValid = await bcrypt.compare(password, user ? user.password : dummyHash);

    if (!user || !isPasswordValid) {
      logger.security.authFailure('Login attempt with invalid credentials', {
        identifier,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return jsonError(res, 401, 'Invalid credentials');
    }

    const tokenPair = await issueBrowserSession(res, user._id, req, 'password', Boolean(rememberMe));
    sendLoginRiskAlert(user, tokenPair);

    logger.info('User logged in with refresh token', {
      userId: user._id,
      sessionId: tokenPair.sessionId,
      ip: req.ip
    });

    res.json({
      message: 'Login successful',
      msg: 'Login successful',
      authenticated: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      },
      rememberMe: tokenPair.rememberMe
    });
  } catch (error) {
    logger.error('Login with refresh token failed', {
      error: error.message,
      identifier: req.body.identifier
    });
    return jsonError(res, 500, 'Server error during login');
  }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    // Accept refresh token from cookie (preferred — browser sends automatically)
    // or from request body (for non-browser / API clients).
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return jsonError(res, 400, 'Refresh token required');
    }

    const requestMetadata = sessionController.getRequestSessionMetadata(req);
    const newTokenPair = await refreshAccessToken(refreshToken, {
      sessionMetadata: {
        ...requestMetadata,
        geoLocation: await resolveApproximateLocation(requestMetadata.ipAddress)
      }
    });

    logger.info('Access token refreshed', {
      sessionId: newTokenPair.sessionId,
      ip: req.ip
    });

    setAuthCookie(res, newTokenPair.accessToken, { rememberMe: newTokenPair.rememberMe });
    setRefreshCookie(res, newTokenPair.refreshToken, { rememberMe: newTokenPair.rememberMe });

    res.json({
      message: 'Token refreshed successfully',
      msg: 'Token refreshed successfully',
      authenticated: true
    });
  } catch (error) {
    logger.security.authFailure('Token refresh failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return jsonError(res, 401, 'Invalid or expired refresh token', {
      code: error.code || 'REFRESH_TOKEN_INVALID'
    });
  }
};

/**
 * Revoke refresh token (logout from specific session)
 */
exports.revokeRefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return jsonError(res, 400, 'Refresh token required');
    }

    const revoked = await revokeRefreshToken(refreshToken);

    if (revoked) {
      if (req.cookies?.refreshToken) {
        clearAuthCookie(res);
        clearRefreshCookie(res);
      }
      logger.info('Refresh token revoked', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.json({
        message: 'Refresh token revoked successfully',
        msg: 'Refresh token revoked successfully'
      });
    }
    return jsonError(res, 400, 'Invalid refresh token');
  } catch (error) {
    logger.error('Failed to revoke refresh token', { error: error.message });
    return jsonError(res, 500, 'Server error');
  }
};

/**
 * Revoke all refresh tokens for user (logout from all sessions)
 */
exports.revokeAllRefreshTokens = async (req, res) => {
  try {
    const userId = req.user.userId;
    const revokedCount = await revokeAllRefreshTokens(userId);
    clearAuthCookie(res);
    clearRefreshCookie(res);

    logger.info('All refresh tokens revoked for user', {
      userId,
      revokedCount,
      ip: req.ip
    });

    res.json({
      message: 'All sessions revoked successfully',
      msg: 'All sessions revoked successfully',
      revokedCount
    });
  } catch (error) {
    logger.error('Failed to revoke all refresh tokens', {
      error: error.message,
      userId: req.user?.userId
    });
    return jsonError(res, 500, 'Server error');
  }
};

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_MAX_PER_HOUR = 3;

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns 200 to avoid leaking whether the email is registered.
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Always respond with 200 regardless of whether the email exists
  const genericOk = () => res.status(200).json({
    message: 'If an account with that email exists, you will receive a password reset link shortly.'
  });

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id username email password').lean();
    if (!user) return genericOk();

    // OAuth-only accounts have no local password — nothing to reset
    if (!user.password) return genericOk();

    // Rate-limit: max 3 reset emails per user per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await PasswordResetToken.countDocuments({
      userId: user._id,
      createdAt: { $gte: hourAgo }
    });
    if (recentCount >= RESET_MAX_PER_HOUR) return genericOk();

    // Invalidate any existing unused tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate a cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = PasswordResetToken.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await emailService.sendPasswordResetEmail({ to: user.email, resetUrl, expiryMinutes: 15 });
    } catch (emailErr) {
      logger.error('Failed to send password reset email', { error: emailErr.message });
      // Clean up the token so they can retry
      await PasswordResetToken.deleteMany({ userId: user._id });
      return res.status(502).json({
        error: 'Failed to send reset email. Please try again.',
        code: 'EMAIL_SEND_FAILED'
      });
    }

    return genericOk();
  } catch (err) {
    logger.error('Forgot password error', { error: err.message });
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { email, token, password }
 */
exports.resetPassword = async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: 'Email, token, and new password are required' });
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error, field: passwordValidation.field });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id password').lean();
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link.', code: 'INVALID_TOKEN' });
    }

    const tokenHash = PasswordResetToken.hashToken(token);
    const record = await PasswordResetToken.findOne({ userId: user._id, tokenHash });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired reset link.', code: 'INVALID_TOKEN' });
    }
    if (record.used) {
      return res.status(400).json({ error: 'This reset link has already been used.', code: 'TOKEN_USED' });
    }
    if (new Date() > record.expiresAt) {
      await PasswordResetToken.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' });
    }

    // Prevent reuse of the current password
    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return res.status(400).json({
        error: 'New password must be different from your current password.',
        field: 'password'
      });
    }

    const newHash = await bcrypt.hash(password, 10);

    // Mark token as used and update password atomically
    await Promise.all([
      PasswordResetToken.updateOne({ _id: record._id }, { $set: { used: true } }),
      User.updateOne({ _id: user._id }, { $set: { password: newHash, failedLoginAttempts: 0, lockoutUntil: null } })
    ]);

    // Invalidate all active sessions — password change is a security event
    await Session.updateMany({ userId: user._id, isActive: true }, { $set: { isActive: false } });

    logger.info('Password reset successfully', { userId: user._id });

    return res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    logger.error('Reset password error', { error: err.message });
    return res.status(500).json({ error: 'Server error' });
  }
};
