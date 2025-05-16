const User = require('../models/User');
const Collection = require('../models/Collection');
const Follow = require('../models/Follow');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    // Check if user with same email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ 
        error: 'Email already registered',
        field: 'email'
      });
    }

    // Check if user with same username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ 
        error: 'Username already taken',
        field: 'username'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10)
    });

    await user.save();

    // Create JWT token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
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
    return res.status(400).json({ errors: errors.array() });
  }

  const { identifier, password } = req.body;

  try {
    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
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
    // Find user in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        error: 'Current password is incorrect',
        field: 'currentPassword'
      });
    }
    
    // Verify that the new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        error: 'New password must be different from current password',
        field: 'newPassword'
      });
    }

    // Hash and save the new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
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

  console.log("Delete account request received:", {
    userId: req.user?.userId,
    hasPassword: !!req.body.password
  });

  const { password } = req.body;
  const userId = req.user.userId;

  if (!userId) {
    console.error("User ID missing from request");
    return res.status(400).json({ error: 'User ID is missing' });
  }

  try {
    // Find user in database
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User with ID ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`User found: ${user.username}`);

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password verification result:", isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ 
        error: 'Password is incorrect',
        field: 'password'
      });
    }

    // Delete all user-related data from other collections
    const collectionsResult = await Collection.deleteMany({ user: userId });
    const followsResult = await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
    
    console.log("Deleted associated data:", {
      collections: collectionsResult.deletedCount,
      follows: followsResult.deletedCount
    });

    // Delete the user
    await User.findByIdAndDelete(userId);
    console.log(`User ${user.username} deleted successfully`);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};