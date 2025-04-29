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