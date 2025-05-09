const express = require('express');
const { body } = require('express-validator');
const { createCollection } = require('../controllers/collectionController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Crea una nuova collezione personale
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Il nome della collezione è obbligatorio'),
    body('description').optional(),
    body('isPublic').optional().isBoolean()
  ],
  createCollection
);

module.exports = router;

const { addCoinToCollection } = require('../controllers/collectionController');

// Aggiunge una moneta a una collezione personale
router.post(
  '/:collectionId/coins',
  authMiddleware,
  [
    body('coin').notEmpty().withMessage('ID della moneta obbligatorio')
  ],
  addCoinToCollection
);

const { getMyCollections, getPublicCollections } = require('../controllers/collectionController');

// Ritorna tutte le collezioni personali dell'utente loggato
router.get('/', authMiddleware, getMyCollections);

// Ritorna tutte le collezioni pubbliche (nessuna autenticazione richiesta)
router.get('/public', getPublicCollections);

const { removeCoinFromCollection } = require('../controllers/collectionController');

// Rimuove una moneta da una collezione
router.delete('/:collectionId/coins/:coinId', authMiddleware, removeCoinFromCollection);

const { updateCoinInCollection } = require('../controllers/collectionController');

// Aggiorna dati personalizzati della moneta nella collezione
router.put('/:collectionId/coins/:coinId', authMiddleware, updateCoinInCollection);