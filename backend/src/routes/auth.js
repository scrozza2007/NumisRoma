const express = require('express');
const { body } = require('express-validator');

const { registerUser, loginUser, changePassword, deleteAccount, changeUsername, updateProfile } = require('../controllers/authController');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');

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

// Registration route
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').custom(validatePassword)
  ],
  registerUser
);

// Login route
router.post(
  '/login',
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
router.post(
  '/delete-account',
  authMiddleware,
  [
    body('password').notEmpty().withMessage('Password is required')
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
    body('location').optional().isString().withMessage('Location must be a string')
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
    console.error('Username check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected route: returns all user data (without password)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;