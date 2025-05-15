const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tutte le route richiedono autenticazione
router.use(authMiddleware);

// Ottieni tutte le conversazioni dell'utente
router.get('/conversations', messageController.getConversations);

// Crea una nuova conversazione
router.post(
  '/conversations',
  [
    body('recipientId').notEmpty().withMessage('ID destinatario richiesto')
  ],
  messageController.createConversation
);

// Ottieni messaggi di una conversazione
router.get('/conversations/:conversationId/messages', messageController.getMessages);

// Invia un nuovo messaggio
router.post(
  '/conversations/:conversationId/messages',
  [
    body('content').notEmpty().withMessage('Contenuto del messaggio richiesto')
  ],
  messageController.sendMessage
);

// Ottieni utenti con cui si può iniziare una conversazione
router.get('/users', messageController.getAvailableUsers);

module.exports = router; 