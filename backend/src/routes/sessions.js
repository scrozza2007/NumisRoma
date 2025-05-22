const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// Proteggere tutte le rotte con il middleware di autenticazione
router.use(authMiddleware);

// Ottieni tutte le sessioni attive dell'utente corrente
router.get('/', sessionController.getActiveSessions);

// Termina una sessione specifica
router.delete('/:sessionId', sessionController.terminateSession);

// Termina tutte le altre sessioni tranne quella corrente
router.delete('/', sessionController.terminateAllOtherSessions);

module.exports = router; 