const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
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

// Tutte le rotte richiedono autenticazione
router.use(authMiddleware);

// GET /api/messages/conversations - Ottieni tutte le conversazioni dell'utente
router.get('/conversations', getConversations);

// GET /api/messages/conversations/:otherUserId - Ottieni o crea conversazione con un utente
router.get('/conversations/:otherUserId', getOrCreateConversation);

// GET /api/messages/unread-count - Ottieni conteggio messaggi non letti
router.get('/unread-count', getUnreadCount);

// GET /api/messages/:conversationId - Ottieni messaggi di una conversazione
router.get('/:conversationId', getMessages);

// POST /api/messages/:conversationId - Invia un messaggio
router.post('/:conversationId', [
  body('content').notEmpty().withMessage('Il contenuto del messaggio è richiesto'),
  body('messageType').optional().isIn(['text', 'image']).withMessage('Tipo messaggio non valido'),
  body('imageUrl').optional().isURL().withMessage('URL immagine non valido')
], sendMessage);

// PUT /api/messages/:conversationId/read - Segna messaggi come letti
router.put('/:conversationId/read', markAsRead);

// DELETE /api/messages/message/:messageId - Elimina un messaggio
router.delete('/message/:messageId', deleteMessage);

// GET /api/messages/search/users - Cerca utenti per iniziare conversazione
router.get('/search/users', searchUsers);

module.exports = router; 