const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, logoutUser, changePassword, deleteAccount, changeUsername, updateProfile, checkSession, loginWithRefresh, refreshToken, revokeRefreshToken, revokeAllRefreshTokens, initiateRegistration, resendOtp, verifyOtpAndRegister, forgotPassword, resetPassword } = require('../controllers/authController');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const { sanitizeInput } = require('../middlewares/enhancedValidation');
const logger = require('../utils/logger');

// IP-based limiter on the initiate endpoint only — prevents a single IP from
// hammering the validation checks. Intentionally generous because it fires on
// every submit attempt, not just successful OTP sends (those are rate-limited
// inside the controller by sendCount).
const registrationAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Too many requests. Please wait a few minutes and try again.',
    code: 'RATE_LIMITED'
  })
});

const router = express.Router();

// Custom password validation function
const validatePassword = (value) => {
  if (value.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(value)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(value)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(value)) {
    throw new Error('Password must contain at least one special character (!@#$%^&*)');
  }
  return true;
};

// ─── Email-verified registration flow ────────────────────────────────────────

// Step 1: Validate fields, hash password, send OTP
router.post(
  '/register/initiate',
  registrationAttemptLimiter,
  sanitizeInput,
  [
    body('username')
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be 3–20 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .custom(validatePassword)
  ],
  initiateRegistration
);

// Step 2a: Resend OTP (cooldown + per-hour cap enforced in the controller)
router.post(
  '/register/resend-otp',
  registrationAttemptLimiter,
  sanitizeInput,
  [
    body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail()
  ],
  resendOtp
);

// Step 2b: Submit OTP → create account
router.post(
  '/register/verify',
  sanitizeInput,
  [
    body('email').notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .isNumeric().withMessage('OTP must be numeric')
  ],
  verifyOtpAndRegister
);

// ─── Legacy single-step registration (kept for backwards compat) ─────────────
// Registration route
router.post(
  '/register',
  sanitizeInput,
  [
    body('username')
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .custom(validatePassword)
  ],
  registerUser
);

// Login route
router.post(
  '/login',
  sanitizeInput,
  [
    body('identifier').notEmpty().withMessage('Identifier is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  loginUser
);

// Change password route
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').custom(validatePassword),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  changePassword
);

// Delete account route
// Password is optional for OAuth-only accounts (they have no local password)
router.post(
  '/delete-account',
  authMiddleware,
  [
    body('password').optional().isString()
  ],
  deleteAccount
);

// Change username route
router.post(
  '/change-username',
  authMiddleware,
  [
    body('username')
      .notEmpty().withMessage('Username is required')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
  ],
  changeUsername
);

// Update profile route
router.post(
  '/update-profile',
  authMiddleware,
  [
    body('fullName').optional().isString().withMessage('Full name must be a string'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('location').optional().isString().withMessage('Location must be a string'),
    body('bio').optional().isString().withMessage('Bio must be a string').isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters')
  ],
  updateProfile
);

// Check username availability
router.post('/check-username', authMiddleware, async (req, res) => {
  const { username } = req.body;
  const userId = req.user.userId;

  // Validate username format
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
  }

  try {
    // Check if username already exists for another user
    const existingUsername = await User.findOne({ 
      username, 
      _id: { $ne: userId } 
    });
    
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Username is available
    res.json({ available: true });
  } catch (err) {
    logger.error('Username check error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Check email availability
router.post('/check-email', authMiddleware, async (req, res) => {
  const { email } = req.body;
  const userId = req.user.userId;

  // Validate email format
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Check if email already exists for another user
    const existingEmail = await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    });
    
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered', available: false });
    }

    // Email is available
    res.json({ available: true });
  } catch (err) {
    logger.error('Email check error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected route: returns all user data (without password)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [user, passwordCheck] = await Promise.all([
      User.findById(req.user.userId).select('-password'),
      User.findById(req.user.userId).select('password').lean()
    ]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = user.toObject();
    userData.hasPassword = Boolean(passwordCheck?.password);
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Forgot / reset password ─────────────────────────────────────────────────

// Max 5 forgot-password requests per IP per 15 min
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Too many requests. Please wait a few minutes before trying again.',
    code: 'RATE_LIMITED'
  })
});

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  sanitizeInput,
  [body('email').notEmpty().withMessage('Email is required').isEmail().toLowerCase()],
  forgotPassword
);

router.post(
  '/reset-password',
  sanitizeInput,
  [
    body('email').notEmpty().isEmail().toLowerCase(),
    body('token').notEmpty().withMessage('Token is required'),
    body('password').notEmpty().withMessage('Password is required').custom(validatePassword)
  ],
  resetPassword
);

// Logout route
router.post('/logout', authMiddleware, logoutUser);

// Verify session status
router.get('/session-check', authMiddleware, checkSession);

// POST /api/auth/verify-password
router.post('/verify-password', authMiddleware, async (req, res) => {
  const dual = (status, message, extra = {}) =>
    res.status(status).json({ error: message, message, msg: message, ...extra });
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return dual(400, 'Password is required');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return dual(404, 'User not found');
    }

    if (!user.password) {
      return dual(400, 'Your account uses social sign-in and has no local password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return dual(400, 'Incorrect password');
    }

    res.json({ message: 'Password verified successfully', msg: 'Password verified successfully' });
  } catch (err) {
    logger.error('Verify password error', { error: err.message });
    dual(500, 'Server error');
  }
});

// Enhanced authentication routes with refresh tokens
router.post(
  '/login-refresh',
  [
    body('identifier').notEmpty().withMessage('Identifier is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  loginWithRefresh
);

// Refresh access token
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  refreshToken
);

// Revoke specific refresh token (logout from specific session)
router.post(
  '/revoke-refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  revokeRefreshToken
);

// Revoke all refresh tokens for user (logout from all sessions)
router.post('/revoke-all-refresh', authMiddleware, revokeAllRefreshTokens);

module.exports = router;