const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const { createSsrfValidator } = require('../utils/ssrfProtection');
const { validateObjectId } = require('../middlewares/enhancedValidation');
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  searchUsers,
  getUnreadCount
} = require('../controllers/messageController');

const router = express.Router();

router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/conversations/:otherUserId', validateObjectId('otherUserId'), getOrCreateConversation);
router.get('/unread-count', getUnreadCount);
router.get('/search/users', searchUsers);
router.get('/:conversationId', validateObjectId('conversationId'), getMessages);

router.post('/:conversationId', validateObjectId('conversationId'), [
  body('encryptedPayload')
    .optional()
    .isString()
    .isLength({ max: 12000 })
    .withMessage('Encrypted payload too large'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 8000 })
    .withMessage('Message content too long'),
  body('messageType')
    .optional()
    .isIn(['text', 'image'])
    .withMessage('Invalid message type'),
  body('imageUrl')
    .optional()
    .custom(createSsrfValidator({
      allowedProtocols: ['https:', 'http:'],
      performDnsCheck: true
    }))
], sendMessage);

router.put('/:conversationId/read', validateObjectId('conversationId'), markAsRead);
router.delete('/message/:messageId', validateObjectId('messageId'), deleteMessage);

module.exports = router;
