const express = require('express');
const router = express.Router();
const { createCoin, getCoins, getCoinById, getRandomCoins, updateCoinImages, resetCoinImages } = require('../controllers/coinController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const { upload, uploadFields, processCoinImage } = require('../../middleware/upload');

// Rotte pubbliche
router.get('/', getCoins);
router.get('/random', getRandomCoins);
router.get('/:id', optionalAuthMiddleware, getCoinById);
router.post('/', createCoin);

// Rotte protette
router.put('/:id/images', authMiddleware, uploadFields, processCoinImage, updateCoinImages);
router.delete('/:id/images', authMiddleware, resetCoinImages);

module.exports = router;