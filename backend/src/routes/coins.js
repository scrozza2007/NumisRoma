const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createCoin, getCoins, getCoinById, getRandomCoins, updateCoinImages, resetCoinImages, getCustomImages, getFilterOptions, getDateRanges } = require('../controllers/coinController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const { upload, uploadFields, processCoinImage } = require('../middlewares/upload');
const { cacheMiddleware, CACHE_CONFIG } = require('../utils/cache');
const { validateObjectId } = require('../middlewares/enhancedValidation');
const { searchLimiter, failOpen, buildRedisStore } = require('../middlewares/security');
const { CACHE_HEADERS } = require('../config/constants');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Rate limiter for expensive filter options query (Redis-backed, fail-open)
const filterOptionsLimiter = failOpen(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: {
    error: 'Too many filter requests',
    message: 'Please try again in a moment'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildRedisStore('filter-options'),
  handler: (req, res) => {
    logger.security.suspiciousActivity('Filter options rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Too many filter requests',
      message: 'Please try again in a moment'
    });
  }
}));

// Public routes with caching and rate limiting
router.get('/', searchLimiter, cacheMiddleware(CACHE_CONFIG.SEARCH_RESULTS), getCoins);
router.get('/random', getRandomCoins);
router.get('/filter-options', filterOptionsLimiter, cacheMiddleware(CACHE_CONFIG.FILTER_OPTIONS), getFilterOptions);
router.get('/date-ranges', cacheMiddleware(CACHE_CONFIG.FILTER_OPTIONS), getDateRanges);
router.get('/:id', validateObjectId('id', { allowString: true }), optionalAuthMiddleware, getCoinById);
// Catalog creation is admin-only: regular users must never be able to seed
// coins into the reference catalog. Protected by auth + role-check.
router.post('/', authMiddleware, adminMiddleware, createCoin);

// Protected routes — keyed by collection entry ID (unique per specimen)
router.get('/entry/:entryId/images', validateObjectId('entryId'), authMiddleware, getCustomImages);
router.get('/entry/:entryId/images/obverse', validateObjectId('entryId'), authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      logger.security.authFailure('Invalid userId in token', { userId: req.user.userId, ip: req.ip });
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    const CoinCustomImage = require('../models/CoinCustomImage');
    const customImage = await CoinCustomImage.findOne({
      collectionEntryId: new mongoose.Types.ObjectId(req.params.entryId),
      userId: new mongoose.Types.ObjectId(req.user.userId)
    }).select('obverseImageData obverseImageContentType updatedAt');

    if (!customImage || !customImage.obverseImageData) {
      return res.status(404).send('Image not found');
    }

    const etag = `"${customImage.updatedAt.getTime()}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.set('Content-Type', customImage.obverseImageContentType || 'image/webp');
    res.set('Cache-Control', CACHE_HEADERS.USER_IMAGES);
    res.set('ETag', etag);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    res.send(customImage.obverseImageData);
  } catch (err) {
    logger.error('Error serving obverse image', { error: err.message });
    res.status(500).send('Server error');
  }
});
router.get('/entry/:entryId/images/reverse', validateObjectId('entryId'), authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      logger.security.authFailure('Invalid userId in token', { userId: req.user.userId, ip: req.ip });
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    const CoinCustomImage = require('../models/CoinCustomImage');
    const customImage = await CoinCustomImage.findOne({
      collectionEntryId: new mongoose.Types.ObjectId(req.params.entryId),
      userId: new mongoose.Types.ObjectId(req.user.userId)
    }).select('reverseImageData reverseImageContentType updatedAt');

    if (!customImage || !customImage.reverseImageData) {
      return res.status(404).send('Image not found');
    }

    const etag = `"${customImage.updatedAt.getTime()}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.set('Content-Type', customImage.reverseImageContentType || 'image/webp');
    res.set('Cache-Control', CACHE_HEADERS.USER_IMAGES);
    res.set('ETag', etag);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    res.send(customImage.reverseImageData);
  } catch (err) {
    logger.error('Error serving reverse image', { error: err.message });
    res.status(500).send('Server error');
  }
});
router.post('/entry/:entryId/images', validateObjectId('entryId'), authMiddleware, uploadFields, processCoinImage, updateCoinImages);
router.delete('/entry/:entryId/images', validateObjectId('entryId'), authMiddleware, resetCoinImages);

module.exports = router;