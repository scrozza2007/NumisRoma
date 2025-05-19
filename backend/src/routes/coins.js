const express = require('express');
const router = express.Router();
const { createCoin, getCoins, getCoinById, getRandomCoins } = require('../controllers/coinController');

// Rotte pubbliche
router.get('/', getCoins);
router.get('/random', getRandomCoins);
router.get('/:id', getCoinById);
router.post('/', createCoin);

module.exports = router;