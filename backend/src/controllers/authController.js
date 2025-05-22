const User = require('../models/User');
const Collection = require('../models/Collection');
const Follow = require('../models/Follow');
const Session = require('../models/Session');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sessionController = require('./sessionController');

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

    // Crea una nuova sessione per l'utente
    await sessionController.createSession(user._id, token, req);

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

    // Crea una nuova sessione per l'utente
    await sessionController.createSession(user._id, token, req);

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

// Logout
exports.logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const userId = req.user.userId;

    // Trova e disattiva la sessione corrente
    await Session.findOneAndUpdate(
      { userId, token, isActive: true },
      { $set: { isActive: false } }
    );

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
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

    // Termina tutte le altre sessioni dopo il cambio di password per sicurezza
    const token = req.headers.authorization.split(' ')[1];
    await Session.updateMany(
      { userId, isActive: true, token: { $ne: token } },
      { $set: { isActive: false } }
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
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
    console.error('Username change error:', err);
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
      });
      
      if (existingEmail) {
        return res.status(409).json({ 
          error: 'Email already registered',
          field: 'email'
        });
      }
    }

    // Find user and update profile
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (location) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user
    });
  } catch (err) {
    console.error('Profile update error:', err);
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

// Controller per verificare lo stato della sessione
exports.checkSession = async (req, res) => {
  try {
    // Se siamo arrivati qui, significa che il middleware authMiddleware ha già verificato la sessione
    // e la sessione è valida
    return res.status(200).json({
      active: true,
      sessionId: req.user.sessionId
    });
  } catch (error) {
    console.error('Errore durante il controllo della sessione:', error);
    res.status(500).json({ error: 'Errore del server durante il controllo della sessione' });
  }
};