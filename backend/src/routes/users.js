const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateObjectId } = require('../middlewares/enhancedValidation');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');
const { createNotification, pushCountsToUser } = require('../controllers/notificationController');
const Notification = require('../models/Notification');
const { authLifecycleLimiter } = require('../middlewares/security');
const { requestDataExport, downloadDataExport } = require('../controllers/dataExportController');

const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const USER_SEARCH_MAX_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// GET /api/users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user.userId;

    if (search && String(search).length > USER_SEARCH_MAX_LENGTH) {
      return res.status(400).json({
        error: 'Search term too long',
        message: `Search cannot exceed ${USER_SEARCH_MAX_LENGTH} characters`
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const skip = (page - 1) * limit;

    let query = { _id: { $ne: currentUserId } };
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.username = { $regex: escapedSearch, $options: 'i' };
    }

    const users = await User.find(query)
      .select('username avatar bio fullName createdAt isPrivate')
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let followMap = {};
    if (users.length > 0) {
      const follows = await Follow.find({
        follower: currentUserId,
        following: { $in: users.map(u => u._id) }
      }).select('following status').lean();
      for (const f of follows) {
        followMap[f.following.toString()] = f.status;
      }
    }

    const usersWithFollowStatus = users.map(user => ({
      ...user,
      isFollowing: followMap[user._id.toString()] === 'accepted',
      followStatus: followMap[user._id.toString()] || 'none'
    }));

    const total = await User.countDocuments(query);

    res.json({
      users: usersWithFollowStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      }
    });
  } catch (error) {
    logger.error('Error retrieving users', { error: error.message });
    res.status(500).json({ message: 'Error retrieving users' });
  }
});

// GET /api/users/recommended
router.get('/recommended', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const following = await Follow.find({ follower: currentUserId, status: 'accepted' })
      .select('following')
      .lean();
    const followingIds = following.map(f => f.following);

    const users = await User.aggregate([
      {
        $match: {
          _id: {
            $ne: new mongoose.Types.ObjectId(currentUserId),
            $nin: followingIds
          }
        }
      },
      {
        $lookup: {
          from: 'follows',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$following', '$$uid'] }, { $eq: ['$status', 'accepted'] }] } } }
          ],
          as: 'followers'
        }
      },
      { $addFields: { followersCount: { $size: '$followers' } } },
      { $sort: { followersCount: -1, lastActive: -1 } },
      { $limit: 3 },
      { $project: { password: 0, followers: 0 } }
    ]);

    const usersWithFollowStatus = users.map(user => ({
      ...user,
      isFollowing: false,
      followStatus: 'none'
    }));

    res.json(usersWithFollowStatus);
  } catch (error) {
    logger.error('Error retrieving recommended users', { error: error.message });
    res.status(500).json({ message: 'Error retrieving recommended users' });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    if (id === currentUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const userToFollow = await User.findById(id).select('_id isPrivate').lean();
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if a follow doc already exists (any status).
    const existing = await Follow.findOne({ follower: currentUserId, following: id }).lean();
    if (existing) {
      return res.status(200).json({
        message: existing.status === 'pending' ? 'Follow request already sent' : 'You are already following this user',
        followStatus: existing.status
      });
    }

    const status = userToFollow.isPrivate ? 'pending' : 'accepted';
    await Follow.create({ follower: currentUserId, following: id, status });

    if (status === 'pending') {
      await createNotification({
        recipient: id,
        sender: currentUserId,
        type: 'follow_request',
        relatedUser: currentUserId
      });
      return res.status(201).json({ message: 'Follow request sent', followStatus: 'pending' });
    }

    await createNotification({
      recipient: id,
      sender: currentUserId,
      type: 'new_follower',
      relatedUser: currentUserId
    });
    res.status(201).json({ message: 'Successfully followed user', followStatus: 'accepted' });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(200).json({ message: 'You are already following this user', followStatus: 'accepted' });
    }
    logger.error('Error following user', { error: error.message });
    res.status(500).json({ message: 'Error following user' });
  }
});

// DELETE /api/users/:id/unfollow
router.delete('/:id/unfollow', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const userToUnfollow = await User.findById(id).select('_id').lean();
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await Follow.deleteOne({ follower: currentUserId, following: id });

    if (result.deletedCount === 0) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    // Remove the new_follower / follow_request notification that triggered this follow.
    await Notification.deleteOne({
      sender: currentUserId,
      recipient: id,
      type: { $in: ['new_follower', 'follow_request'] }
    });

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    logger.error('Error unfollowing user', { error: error.message });
    res.status(500).json({ message: 'Error unfollowing user' });
  }
});

// POST /api/users/:id/follow-request/accept
router.post('/:id/follow-request/accept', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUserId = req.user.userId;

    const follow = await Follow.findOneAndUpdate(
      { follower: requesterId, following: currentUserId, status: 'pending' },
      { status: 'accepted' },
      { new: true }
    );

    if (!follow) {
      return res.status(404).json({ message: 'Follow request not found' });
    }

    // Delete the follow_request notification — it's been actioned.
    await Notification.deleteOne({ sender: requesterId, recipient: currentUserId, type: 'follow_request' });

    // Notify the requester their request was accepted.
    await createNotification({
      recipient: requesterId,
      sender: currentUserId,
      type: 'follow_accepted',
      relatedUser: currentUserId
    });

    pushCountsToUser(currentUserId).catch(() => {});

    res.json({ message: 'Follow request accepted' });
  } catch (error) {
    logger.error('Error accepting follow request', { error: error.message });
    res.status(500).json({ message: 'Error accepting follow request' });
  }
});

// POST /api/users/:id/follow-request/decline
router.post('/:id/follow-request/decline', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUserId = req.user.userId;

    const result = await Follow.deleteOne({
      follower: requesterId,
      following: currentUserId,
      status: 'pending'
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Follow request not found' });
    }

    // Delete the follow_request notification — it's been actioned.
    await Notification.deleteOne({ sender: requesterId, recipient: currentUserId, type: 'follow_request' });

    pushCountsToUser(currentUserId).catch(() => {});

    res.json({ message: 'Follow request declined' });
  } catch (error) {
    logger.error('Error declining follow request', { error: error.message });
    res.status(500).json({ message: 'Error declining follow request' });
  }
});

// GET /api/users/:id/follow-requests — list pending requests for the authenticated user
router.get('/:id/follow-requests', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    if (id !== currentUserId) {
      return res.status(403).json({ message: 'You can only view your own follow requests' });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      Follow.find({ following: currentUserId, status: 'pending' })
        .populate('follower', 'username avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ following: currentUserId, status: 'pending' })
    ]);

    res.json({
      requests: requests.map(r => r.follower),
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasMore: skip + requests.length < total
      }
    });
  } catch (error) {
    logger.error('Error getting follow requests', { error: error.message });
    res.status(500).json({ message: 'Error retrieving follow requests' });
  }
});

// GET /api/users/:id/profile
router.get('/:id/profile', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [followersCount, followingCount, coinsCount] = await Promise.all([
      Follow.countDocuments({ following: id, status: 'accepted' }),
      Follow.countDocuments({ follower: id, status: 'accepted' }),
      Collection.aggregate([
        { $match: { user: user._id } },
        { $unwind: '$coins' },
        { $count: 'total' }
      ])
    ]);

    let followStatus = 'none';
    if (currentUserId && currentUserId !== id) {
      const follow = await Follow.findOne({ follower: currentUserId, following: id }).lean();
      if (follow) followStatus = follow.status;
    }

    // Pending follow requests for own profile
    let pendingFollowRequestsCount = 0;
    if (currentUserId === id) {
      pendingFollowRequestsCount = await Follow.countDocuments({ following: id, status: 'pending' });
    }

    // Whether the profile owner has sent a pending follow request TO the current viewer
    let hasPendingRequestFromThem = false;
    if (currentUserId && currentUserId !== id) {
      hasPendingRequestFromThem = !!(await Follow.exists({ follower: id, following: currentUserId, status: 'pending' }));
    }

    res.json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar || null,
      bio: user.bio || '',
      createdAt: user.createdAt,
      isPrivate: user.isPrivate,
      followersCount,
      followingCount,
      coinsCount: coinsCount[0]?.total || 0,
      isFollowing: followStatus === 'accepted',
      followStatus,
      pendingFollowRequestsCount,
      hasPendingRequestFromThem
    });
  } catch (error) {
    logger.error('Error retrieving user profile', { error: error.message });
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
});

// GET /api/users/:id/followers — only accepted follows
router.get('/:id/followers', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ following: userId, status: 'accepted' })
        .populate('follower', 'username avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ following: userId, status: 'accepted' })
    ]);

    res.json({
      users: follows.map(f => f.follower),
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasMore: skip + follows.length < total
      }
    });
  } catch (error) {
    logger.error('Error getting followers', { error: error.message });
    res.status(500).json({ message: 'Error retrieving followers' });
  }
});

// GET /api/users/:id/following — only accepted follows
router.get('/:id/following', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ follower: userId, status: 'accepted' })
        .populate('following', 'username avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ follower: userId, status: 'accepted' })
    ]);

    res.json({
      users: follows.map(f => f.following),
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasMore: skip + follows.length < total
      }
    });
  } catch (error) {
    logger.error('Error getting following', { error: error.message });
    res.status(500).json({ message: 'Error retrieving following' });
  }
});

// GET /api/users/:id/activity
router.get('/:id/activity', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    const recentFollowers = await Follow.find({ following: userId, status: 'accepted' })
      .populate('follower', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    const activities = recentFollowers.map(follow => ({
      type: 'follow',
      user: follow.follower,
      createdAt: follow.createdAt
    }));

    res.json(activities);
  } catch (error) {
    logger.error('Error getting user activity', { error: error.message });
    res.status(500).json({ message: 'Error retrieving user activity' });
  }
});

// GET /api/users/:id/chat
router.get('/:id/chat', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.id;

    const otherUser = await User.findById(otherUserId).select('username avatar isPrivate');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (otherUser.isPrivate) {
      const isFollowing = await Follow.exists({ follower: currentUserId, following: otherUserId, status: 'accepted' });
      if (!isFollowing) {
        return res.status(403).json({
          message: 'This account is private. Follow them to send a message.',
          code: 'PRIVATE_PROFILE'
        });
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId], $size: 2 }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, otherUserId],
        lastActivity: new Date()
      });
    }

    res.json({ conversationId: conversation._id, user: otherUser });
  } catch (error) {
    logger.error('Error creating/getting chat', { error: error.message });
    res.status(500).json({ message: 'Error creating chat' });
  }
});

// PUT /api/users/me/privacy
router.put('/me/privacy', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { isPrivate } = req.body;

    if (typeof isPrivate !== 'boolean') {
      return res.status(400).json({ message: 'isPrivate must be a boolean' });
    }

    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const wasPrivate = user.isPrivate;
    user.isPrivate = isPrivate;
    await user.save();

    // If switching private → public: auto-accept all pending follow requests.
    if (wasPrivate && !isPrivate) {
      await Follow.updateMany(
        { following: currentUserId, status: 'pending' },
        { status: 'accepted' }
      );
    }

    res.json({ isPrivate: user.isPrivate });
  } catch (error) {
    logger.error('Error updating privacy setting', { error: error.message });
    res.status(500).json({ message: 'Error updating privacy setting' });
  }
});

// Data export requests create a temporary ZIP and email a signed download link.
router.post('/me/data-export', authLifecycleLimiter, authMiddleware, requestDataExport);
router.get('/me/data-export/:requestId/download', downloadDataExport);

// PUT /api/users/me/e2ee-keys — register keypair on first login (write-once for publicKey).
// Stores the encrypted private key blob so the user can restore on any new device.
// The server never sees the plaintext private key — only the PBKDF2+AES-GCM blob.
router.put('/me/e2ee-keys', authMiddleware, async (req, res) => {
  try {
    const { publicKey, encryptedPrivateKey } = req.body;
    if (typeof publicKey !== 'string' || publicKey.length < 10 || publicKey.length > 100)
      return res.status(400).json({ message: 'Invalid publicKey' });
    if (typeof encryptedPrivateKey !== 'string' || encryptedPrivateKey.length < 10 || encryptedPrivateKey.length > 2000)
      return res.status(400).json({ message: 'Invalid encryptedPrivateKey' });

    // publicKey is write-once — only set if null. encryptedPrivateKey is always updated
    // (user may change password which re-encrypts the blob).
    const user = await User.findById(req.user.userId).select('publicKey').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const update = { encryptedPrivateKey };
    if (!user.publicKey) update.publicKey = publicKey;

    await User.updateOne({ _id: req.user.userId }, { $set: update });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Error updating E2EE keys', { error: error.message });
    res.status(500).json({ message: 'Error updating E2EE keys' });
  }
});

// GET /api/users/me/e2ee-keys — fetch own encrypted private key blob for new-device restore.
router.get('/me/e2ee-keys', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('publicKey encryptedPrivateKey').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ publicKey: user.publicKey ?? null, encryptedPrivateKey: user.encryptedPrivateKey ?? null });
  } catch (error) {
    logger.error('Error fetching E2EE keys', { error: error.message });
    res.status(500).json({ message: 'Error fetching E2EE keys' });
  }
});

// GET /api/users/:id/public-key — fetch another user's public key for encryption
router.get('/:id/public-key', validateObjectId('id'), authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('publicKey').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ publicKey: user.publicKey ?? null });
  } catch (error) {
    logger.error('Error fetching public key', { error: error.message });
    res.status(500).json({ message: 'Error fetching public key' });
  }
});

module.exports = router;
