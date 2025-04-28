const express = require('express');
const { body } = require('express-validator');
const { createCoin, getCoins } = require('../controllers/coinController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Rotta protetta: aggiunta moneta (solo utenti autenticati per ora)
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Nome moneta obbligatorio'),
    body('authority.emperor').notEmpty().withMessage('Imperatore obbligatorio'),
    body('description.material').notEmpty().withMessage('Materiale obbligatorio')
  ],
  createCoin
);

// Rotta pubblica: elenco tutte le monete
router.get('/', getCoins);

module.exports = router;