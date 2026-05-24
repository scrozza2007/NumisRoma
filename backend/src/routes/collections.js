const express = require('express');
const { body } = require('express-validator');
const { createSsrfValidator } = require('../utils/ssrfProtection');
const { 
  createCollection, 
  addCoinToCollection,
  getMyCollections, 
  getPublicCollections,
  removeCoinFromCollection,
  updateCoinInCollection,
  getCollectionById,
  getUserCollections,
  deleteCollection,
  updateCollection,
  reorderCollections,
  reorderCollectionCoins,
  duplicateCoinEntry,
  moveOrCopyCoinEntry,
  exportCollection,
  previewImport,
  importCollection
} = require('../controllers/collectionController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const { upload, processCollectionImage, deleteImage } = require('../middlewares/upload');
const { isS3Enabled, streamFromS3, buildKey } = require('../utils/s3Storage');
const { validateObjectId } = require('../middlewares/enhancedValidation');
const logger = require('../utils/logger');

const router = express.Router();

// Wrapper to handle both FormData and JSON.
// `processCollectionImage` may itself end the response (e.g. invalid image
// buffer, oversize, processing failure). If it did so we MUST NOT fall
// through to `createCollection` or we send two responses and corrupt the
// client connection.
const createCollectionWrapper = async (req, res) => {
  try {
    if (req.file) {
      await processCollectionImage(req, res, () => {});
      if (res.headersSent) {
        return; // image middleware already responded (error path)
      }
    }
    return createCollection(req, res);
  } catch (error) {
    logger.error('Error in createCollectionWrapper', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server error during collection creation',
        message: 'Server error during collection creation',
        msg: 'Server error during collection creation'
      });
    }
  }
};

// Create a new personal collection
router.post(
  '/',
  authMiddleware,
  upload, // Upload middleware
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Collection name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Collection name must be between 1-100 characters')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be max 500 characters')
      .escape(),
    body('image')
      .optional()
      .custom(createSsrfValidator({ 
        allowedProtocols: ['https:', 'http:'],
        performDnsCheck: true 
      })),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('visibility').optional().isIn(['Private', 'Public', 'Shared']).withMessage('Invalid visibility')
  ],
  createCollectionWrapper
);

// Return all personal collections of logged user
router.get('/', authMiddleware, getMyCollections);

// Reorder personal collections
router.put('/reorder', authMiddleware, reorderCollections);

// Return all public collections (no authentication required)
router.get('/public', getPublicCollections);

// Return collections owned by a specific user
router.get('/user/:userId', validateObjectId('userId'), optionalAuthMiddleware, getUserCollections);

// Serve the collection image saved in DB (must be BEFORE the generic
// :collectionId route). IDOR-protected: private collections require the
// requester to be the owner. Public collections are served to anyone.
router.get('/:collectionId/image', validateObjectId('collectionId'), optionalAuthMiddleware, async (req, res) => {
  try {
    const Collection = require('../models/Collection');
    const collection = await Collection.findById(req.params.collectionId)
      .select('imageData imageContentType imageKey isPublic user updatedAt');

    if (!collection) return res.status(404).send('Image not found');

    // Authorization: private collections only visible to their owner.
    if (!collection.isPublic) {
      if (!req.user || collection.user.toString() !== req.user.userId) {
        return res.status(404).send('Image not found');
      }
    }

    const firstAllowed = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const cacheControl = collection.isPublic ? 'public, max-age=86400' : 'private, no-store';
    const etag = `"${(collection.updatedAt || new Date()).getTime()}"`;

    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    const sharedHeaders = {
      'Cache-Control': cacheControl,
      'ETag': etag,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': firstAllowed
    };

    // R2/S3 path: stream from bucket using the stored key.
    if (isS3Enabled() && collection.imageKey) {
      return streamFromS3(collection.imageKey, res, sharedHeaders);
    }

    // MongoDB binary fallback (local disk mode or legacy documents).
    if (!collection.imageData) return res.status(404).send('Image not found');

    let data = collection.imageData;
    if (!Buffer.isBuffer(data)) {
      if (data?.buffer) data = Buffer.from(data.buffer);
      else if (Array.isArray(data?.data)) data = Buffer.from(data.data);
      else data = Buffer.from(data);
    }

    res
      .status(200)
      .set('Content-Type', collection.imageContentType || 'image/webp')
      .set('Cache-Control', cacheControl)
      .set('ETag', etag)
      .set('Cross-Origin-Resource-Policy', 'cross-origin')
      .set('Access-Control-Allow-Origin', firstAllowed)
      .send(data);
  } catch (err) {
    logger.error('Error serving collection image', { error: err.message });
    res.status(500).send('Server error');
  }
});

// Return a specific collection by ID
router.get('/:collectionId', validateObjectId('collectionId'), optionalAuthMiddleware, getCollectionById);

// Wrapper for collection updates.
// Same double-response guard as createCollectionWrapper.
const updateCollectionWrapper = async (req, res) => {
  try {
    const Collection = require('../models/Collection');

    if (req.file) {
      await processCollectionImage(req, res, () => {});
      if (res.headersSent) {
        return; // image middleware already responded (error path)
      }

      // Delete the previous image (R2 key or local disk path) before replacing.
      if (req.uploadedImage) {
        const collection = await Collection.findById(req.params.collectionId).select('imageKey image');
        if (collection) {
          if (collection.imageKey) deleteImage(collection.imageKey);
          else if (collection.image && collection.image.startsWith('/uploads/collections/')) deleteImage(collection.image);
        }
      }
    }

    return updateCollection(req, res);
  } catch (error) {
    logger.error('Error in updateCollectionWrapper', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server error during collection update',
        message: 'Server error during collection update',
        msg: 'Server error during collection update'
      });
    }
  }
};

// Update a collection
router.put(
  '/:collectionId',
  validateObjectId('collectionId'),
  authMiddleware,
  upload, // Upload middleware
  [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Collection name cannot be empty')
      .isLength({ min: 1, max: 100 }).withMessage('Collection name must be between 1-100 characters')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be max 500 characters')
      .escape(),
    body('image')
      .optional()
      .custom(createSsrfValidator({ 
        allowedProtocols: ['https:', 'http:'],
        performDnsCheck: true 
      })),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('visibility').optional().isIn(['Private', 'Public', 'Shared']).withMessage('Invalid visibility')
  ],
  updateCollectionWrapper
);

// Delete a collection
router.delete('/:collectionId', validateObjectId('collectionId'), authMiddleware, deleteCollection);

router.get('/:collectionId/export', validateObjectId('collectionId'), authMiddleware, exportCollection);
router.post('/:collectionId/import/preview', validateObjectId('collectionId'), authMiddleware, previewImport);
router.post('/:collectionId/import', validateObjectId('collectionId'), authMiddleware, importCollection);

// Add a coin to a personal collection
router.post(
  '/:collectionId/coins',
  validateObjectId('collectionId'),
  authMiddleware,
  [
    body('coin').notEmpty().withMessage('Coin ID is required')
      .isString().withMessage('Invalid coin ID')
      .isLength({ max: 200 }).withMessage('Invalid coin ID')
  ],
  addCoinToCollection
);

router.put('/:collectionId/coins/reorder', validateObjectId('collectionId'), authMiddleware, reorderCollectionCoins);
router.post('/:collectionId/entries/:entryId/duplicate', validateObjectId('collectionId'), validateObjectId('entryId'), authMiddleware, duplicateCoinEntry);
router.post('/:collectionId/entries/:entryId/transfer', validateObjectId('collectionId'), validateObjectId('entryId'), authMiddleware, moveOrCopyCoinEntry);

// Update the user-supplied metadata of a coin inside a collection
router.put('/:collectionId/coins/:coinId', validateObjectId('collectionId'), validateObjectId('coinId', { allowString: true }), authMiddleware, updateCoinInCollection);

// Remove a coin from a collection
router.delete('/:collectionId/coins/:coinId', validateObjectId('collectionId'), validateObjectId('coinId', { allowString: true }), authMiddleware, removeCoinFromCollection);

// Batch fetch custom images for all entries in a collection — single query
// instead of N per-entry requests, preventing rate-limit exhaustion.
router.get('/:collectionId/entry-images', validateObjectId('collectionId'), authMiddleware, async (req, res) => {
  try {
    const Collection = require('../models/Collection');
    const CoinCustomImage = require('../models/CoinCustomImage');

    const collection = await Collection.findById(req.params.collectionId).select('user coins');
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const entryIds = collection.coins.map(e => e._id);
    const images = await CoinCustomImage.find({
      collectionEntryId: { $in: entryIds },
      userId: req.user.userId
    }).select('collectionEntryId obverseImage reverseImage updatedAt').lean();

    // Return a map of entryId -> { obverseImage, reverseImage, updatedAt }
    const result = {};
    for (const img of images) {
      result[img.collectionEntryId.toString()] = {
        obverseImage: img.obverseImage || null,
        reverseImage: img.reverseImage || null,
        updatedAt: img.updatedAt
      };
    }
    res.json(result);
  } catch (err) {
    logger.error('Error fetching collection entry images', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch entry images' });
  }
});

module.exports = router;
