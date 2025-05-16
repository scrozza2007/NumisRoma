const express = require('express');
const { body } = require('express-validator');

const { registerUser, loginUser, changePassword, deleteAccount } = require('../controllers/authController');
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