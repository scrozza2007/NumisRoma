const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const DeviceIdentity = require('../models/DeviceIdentity');
const logger = require('../utils/logger');
const { PAGINATION } = require('../config/constants');
const { createNotification } = require('./notificationController');

const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 30, 1),
      PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find({ participants: userId })
        .populate('participants', 'username fullName avatar')
        .populate({
          path: 'lastMessage',
          select: 'content messageType sender createdAt isDeleted isEncrypted encryptedPayload'
        })
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments({ participants: userId })
    ]);

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + conversations.length < total
      }
    });
  } catch (error) {
    logger.error('Error retrieving conversations', { userId: req.user.userId, error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.params;

    if (String(userId) === String(otherUserId)) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }

    const otherUser = await User.findById(otherUserId).select('isPrivate').lean();
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (otherUser.isPrivate) {
      const Follow = require('../models/Follow');
      const isFollowing = await Follow.exists({ follower: userId, following: otherUserId, status: 'accepted' });
      if (!isFollowing) {
        return res.status(403).json({
          message: 'This account is private. Follow them to send a message.',
          code: 'PRIVATE_PROFILE'
        });
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId], $size: 2 }
    }).populate('participants', 'username fullName avatar');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, otherUserId],
        lastActivity: new Date()
      });
      conversation = await conversation.populate('participants', 'username fullName avatar');
    }

    res.json(conversation);
  } catch (error) {
    logger.error('Error getting/creating conversation', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit) || 50, 1),
      PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Access denied to conversation' });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false
    })
    .populate('sender', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    res.json(messages.reverse());
  } catch (error) {
    logger.error('Error retrieving messages', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const ENCRYPTED_PAYLOAD_MAX = 12000;

const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { encryptedPayload, content, messageType = 'text', imageUrl } = req.body;

    const isMember = await Conversation.exists({ _id: conversationId, participants: userId });
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied to conversation' });
    }

    // E2EE path — encryptedPayload is an opaque Signal Protocol blob
    if (encryptedPayload !== undefined) {
      if (typeof encryptedPayload !== 'string' || encryptedPayload.length === 0) {
        return res.status(400).json({ message: 'encryptedPayload must be a non-empty string' });
      }
      if (encryptedPayload.length > ENCRYPTED_PAYLOAD_MAX) {
        return res.status(400).json({ message: 'encryptedPayload too large' });
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: userId,
        encryptedPayload,
        messageType: 'text',
        isEncrypted: true,
      });
      await message.populate('sender', 'username fullName avatar');

      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { lastMessage: message._id, lastActivity: new Date() } }
      );

      await _notifyRecipient(conversationId, userId);
      return res.status(201).json(message);
    }

    // Plaintext path — only allowed when the sender has NOT registered E2EE keys.
    // If they have keys, the client must encrypt; reject plaintext to prevent data leaks.
    const senderHasE2EE = await DeviceIdentity.exists({ userId });
    if (senderHasE2EE) {
      return res.status(400).json({
        message: 'Encrypted messaging required. Use encryptedPayload.',
        code: 'E2EE_REQUIRED',
      });
    }

    if (messageType !== 'text' && messageType !== 'image') {
      return res.status(400).json({ message: 'Invalid messageType' });
    }
    if (messageType === 'text') {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      if (content.length > 8000) {
        return res.status(400).json({ message: 'Message cannot exceed 8000 characters' });
      }
    }
    if (messageType === 'image' && (typeof imageUrl !== 'string' || imageUrl.length === 0)) {
      return res.status(400).json({ message: 'imageUrl is required for image messages' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      content,
      messageType,
      imageUrl: messageType === 'image' ? imageUrl : undefined,
      isEncrypted: false
    });
    await message.populate('sender', 'username fullName avatar');

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { lastMessage: message._id, lastActivity: new Date() } }
    );

    await _notifyRecipient(conversationId, userId);
    res.status(201).json(message);
  } catch (error) {
    logger.error('Error sending message', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

async function _notifyRecipient(conversationId, senderId) {
  try {
    const conversation = await Conversation.findById(conversationId).select('participants').lean();
    if (!conversation) return;
    const recipientId = conversation.participants.find(p => String(p) !== String(senderId));
    if (!recipientId) return;
    const existingUnread = await Notification.findOne({
      recipient: recipientId,
      type: 'new_message',
      relatedConversation: conversationId,
      isRead: false
    });
    if (!existingUnread) {
      await createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'new_message',
        relatedConversation: conversationId
      });
    }
  } catch (err) {
    logger.warn('Failed to create message notification', { error: err.message });
  }
}

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Access denied to conversation' });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    logger.error('Error marking messages as read', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ message: 'Message deleted' });
  } catch (error) {
    logger.error('Error deleting message', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const MESSAGE_SEARCH_MAX_LENGTH = 100;

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.json([]);
    }
    if (query.length > MESSAGE_SEARCH_MAX_LENGTH) {
      return res.status(400).json({
        message: `Search cannot exceed ${MESSAGE_SEARCH_MAX_LENGTH} characters`
      });
    }

    const escapedQuery = escapeRegex(query);
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: escapedQuery, $options: 'i' } },
        { fullName: { $regex: escapedQuery, $options: 'i' } }
      ]
    })
      .select('username fullName avatar')
      .limit(10)
      .lean();

    res.json(users);
  } catch (error) {
    logger.error('Error searching users', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId
    }).select('_id');

    const conversationIds = conversations.map(c => c._id);

    const unreadCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
      isDeleted: false
    });

    res.json({ unreadCount });
  } catch (error) {
    logger.error('Error counting unread messages', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  searchUsers,
  getUnreadCount
};
