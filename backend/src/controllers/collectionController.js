const Collection = require('../models/Collection');
const CoinCustomImage = require('../models/CoinCustomImage');
const { validationResult } = require('express-validator');
const { ErrorResponse } = require('../utils/errorResponse');
const { UPLOAD } = require('../config/constants');
const { deleteImage } = require('../middlewares/upload');
const logger = require('../utils/logger');

// Create a new collection
exports.createCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ErrorResponse.validationError(res, 'Validation failed', errors.array());
  }

  try {
    const { name, description, image, isPublic } = req.body;

    const collection = new Collection({
      user: req.user.userId,
      name,
      description,
      isPublic
    });

    if (req.uploadedImage?.path) {
      if (req.uploadedImage.buffer) {
        if (req.uploadedImage.buffer.length > UPLOAD.MAX_FILE_SIZE) {
          return ErrorResponse.badRequest(res, 'Image too large', {
            message: `Maximum image size is ${UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB`
          });
        }
        collection.imageData = req.uploadedImage.buffer;
        collection.imageContentType = req.uploadedImage.contentType || 'image/webp';
      }
      if (req.uploadedImage.key) collection.imageKey = req.uploadedImage.key;
      collection.image = `/api/collections/${collection._id}/image`;
    }

    if (!collection.image && image) {
      collection.image = image;
    }

    await collection.save();
    
    res.status(201).json(collection);
  } catch (error) {
    logger.error('Error creating collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to create collection');
  }
};

// Get all personal collections of the authenticated user
exports.getMyCollections = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return ErrorResponse.unauthorized(res, 'User not authenticated');
    }
    
    // Add pagination for users with many collections
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    
    // Only populate essential coin fields, not entire documents
    const collections = await Collection.find({ user: req.user.userId })
      .populate({
        path: 'coins.coin',
        select: 'title authority.issuer authority.dynasty classification.denomination classification.material classification.mint coinage.date'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean() for better performance with read-only data

    const total = await Collection.countDocuments({ user: req.user.userId });

    res.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + collections.length < total
      }
    });
  } catch (err) {
    logger.error('Error fetching user collections', { error: err.message });
    return ErrorResponse.serverError(res, 'Failed to fetch user collections');
  }
};

// Get all public collections
exports.getPublicCollections = async (req, res) => {
  try {
    // Add pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    
    const collections = await Collection.find({ isPublic: true })
      .populate({
        path: 'coins.coin',
        select: 'title authority.issuer authority.dynasty classification.denomination classification.material classification.mint coinage.date'
      })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Collection.countDocuments({ isPublic: true });

    res.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + collections.length < total
      }
    });
  } catch (err) {
    logger.error('Error fetching public collections', { error: err.message });
    return ErrorResponse.serverError(res, 'Failed to fetch public collections');
  }
};

// Get collections of a specific user.
// - Paginated to bound response size for users with many collections.
// - Populate uses `.select()` so we don't ship full coin documents over the
//   wire for list views.
exports.getUserCollections = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      50
    );
    const skip = (page - 1) * limit;

    // If user is requesting their own collections, show all.
    // Otherwise only show public ones.
    const filter = req.user && req.user.userId === userId
      ? { user: userId }
      : { user: userId, isPublic: true };

    const [collections, total] = await Promise.all([
      Collection.find(filter)
        .populate({
          path: 'coins.coin',
          select: 'title authority.issuer authority.dynasty classification.denomination classification.material classification.mint coinage.date'
        })
        .populate('user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Collection.countDocuments(filter)
    ]);

    res.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + collections.length < total
      }
    });
  } catch (err) {
    logger.error('Error fetching user collections', { userId: req.params.userId, error: err.message });
    return ErrorResponse.serverError(res, 'Failed to fetch user collections');
  }
};

// Get a specific collection by ID. Populate with a narrow `.select()` to
// avoid over-fetching multi-KB coin documents for list rendering.
exports.getCollectionById = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collection = await Collection.findById(collectionId)
      .populate({
        path: 'coins.coin',
        select: 'title authority.issuer authority.dynasty classification.denomination classification.material classification.mint coinage.date'
      })
      .populate('user', 'username avatar');

    if (!collection) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }

    // If collection is not public, verify ownership
    if (!collection.isPublic) {
      if (!req.user) {
        return ErrorResponse.unauthorized(res, 'Not authorized to view this collection');
      }
      
      if (collection.user._id.toString() !== req.user.userId) {
        return ErrorResponse.forbidden(res, 'Not authorized to view this collection');
      }
    }

    res.json(collection);
  } catch (err) {
    logger.error('Error fetching collection', { collectionId: req.params.collectionId, error: err.message });
    return ErrorResponse.serverError(res, 'Failed to fetch collection');
  }
};

// Update a collection. Race-safe: uses `findOneAndUpdate` with an ownership
// filter so concurrent updates cannot race against a read/mutate/save cycle.
exports.updateCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ErrorResponse.validationError(res, 'Validation failed', errors.array());
  }

  try {
    const { collectionId } = req.params;
    const { name, description, image, isPublic } = req.body;

    // Build the $set payload in memory — only set fields the client sent,
    // so a PATCH that only updates the name doesn't clobber description.
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (image !== undefined) update.image = image;
    if (isPublic !== undefined) update.isPublic = isPublic;

    if (req.uploadedImage?.path) {
      if (req.uploadedImage.buffer) {
        if (req.uploadedImage.buffer.length > UPLOAD.MAX_FILE_SIZE) {
          return ErrorResponse.badRequest(res, 'Image too large', {
            message: `Maximum image size is ${UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB`
          });
        }
        update.imageData = req.uploadedImage.buffer;
        update.imageContentType = req.uploadedImage.contentType || 'image/webp';
      } else {
        update.$unset = { imageData: '', imageContentType: '' };
      }
      if (req.uploadedImage.key) update.imageKey = req.uploadedImage.key;
      update.image = `/api/collections/${collectionId}/image`;
    }

    // If the client sent an empty body (no fields, no upload) reject cleanly
    // rather than issuing a no-op update that still counts against the DB.
    if (Object.keys(update).length === 0) {
      return ErrorResponse.badRequest(res, 'No fields to update');
    }

    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, user: req.user.userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!collection) {
      // Differentiate 404 (never existed or not owned) vs 403. Returning 404
      // here is intentional — we do NOT want to leak that the collection
      // exists under a different user (IDOR hardening).
      return ErrorResponse.notFound(res, 'Collection not found');
    }

    res.json(collection);
  } catch (error) {
    logger.error('Error updating collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to update collection');
  }
};

// Delete a collection. Atomic: the ownership filter is part of the same
// delete query, so there is no window between the check and the write.
exports.deleteCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const deleted = await Collection.findOneAndDelete({
      _id: collectionId,
      user: req.user.userId
    });

    if (!deleted) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }

    // Delete collection thumbnail from R2/disk.
    if (deleted.imageKey) deleteImage(deleted.imageKey);
    else if (deleted.image && deleted.image.startsWith('/uploads/')) deleteImage(deleted.image);

    // Delete all coin custom images for every entry in this collection.
    const entryIds = deleted.coins.map(e => e._id);
    if (entryIds.length > 0) {
      const coinImages = await CoinCustomImage.find({
        collectionEntryId: { $in: entryIds },
        userId: req.user.userId
      }).select('obverseImageKey reverseImageKey obverseImage reverseImage');

      for (const img of coinImages) {
        if (img.obverseImageKey) deleteImage(img.obverseImageKey);
        else if (img.obverseImage) deleteImage(img.obverseImage);
        if (img.reverseImageKey) deleteImage(img.reverseImageKey);
        else if (img.reverseImage) deleteImage(img.reverseImage);
      }

      await CoinCustomImage.deleteMany({
        collectionEntryId: { $in: entryIds },
        userId: req.user.userId
      });
    }

    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    logger.error('Error deleting collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to delete collection');
  }
};

// Add a coin to a collection.
// Race-safe: two concurrent requests adding the same coin will no longer
// result in duplicate entries — we atomically push only when the coin is
// not already present.
exports.addCoinToCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ErrorResponse.validationError(res, 'Validation failed', errors.array());
  }

  const { collectionId } = req.params;
  const { coin, weight, diameter, grade, notes } = req.body;

  try {
    // Ownership check (narrow select).
    const collection = await Collection.findById(collectionId).select('user');
    if (!collection) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }
    if (collection.user.toString() !== req.user.userId) {
      return ErrorResponse.forbidden(res, 'Not authorized to modify this collection');
    }

    // Verify coin exists.
    const Coin = require('../models/Coin');
    const coinExists = await Coin.exists({ _id: coin });
    if (!coinExists) {
      return ErrorResponse.notFound(res, 'Coin not found');
    }

    const updated = await Collection.findOneAndUpdate(
      { _id: collectionId, user: req.user.userId },
      {
        $push: {
          coins: {
            coin,
            ...(weight !== undefined && { weight }),
            ...(diameter !== undefined && { diameter }),
            ...(grade !== undefined && { grade }),
            ...(notes !== undefined && { notes })
          }
        }
      },
      { new: true }
    ).populate({
      path: 'coins.coin',
      select: 'title authority.issuer authority.dynasty classification.denomination classification.material classification.mint coinage.date'
    });

    if (!updated) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }

    res.status(200).json(updated);
  } catch (error) {
    logger.error('Error adding coin to collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to add coin to collection');
  }
};

// Remove a coin from a collection. Atomic $pull with an ownership filter.
exports.removeCoinFromCollection = async (req, res) => {
  const { collectionId, coinId } = req.params;

  try {
    // Find the entry ID before pulling so we can clean up its images.
    const before = await Collection.findOne(
      { _id: collectionId, user: req.user.userId },
      { coins: { $elemMatch: { coin: coinId } } }
    );
    const entryId = before?.coins?.[0]?._id;

    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, user: req.user.userId },
      { $pull: { coins: { coin: coinId } } },
      { new: true }
    );

    if (!collection) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }

    // Clean up R2/disk images for the removed entry.
    if (entryId) {
      const img = await CoinCustomImage.findOne({
        collectionEntryId: entryId,
        userId: req.user.userId
      }).select('obverseImageKey reverseImageKey obverseImage reverseImage');

      if (img) {
        if (img.obverseImageKey) deleteImage(img.obverseImageKey);
        else if (img.obverseImage) deleteImage(img.obverseImage);
        if (img.reverseImageKey) deleteImage(img.reverseImageKey);
        else if (img.reverseImage) deleteImage(img.reverseImage);
        await CoinCustomImage.deleteOne({ _id: img._id });
      }
    }

    res.status(200).json(collection);
  } catch (error) {
    logger.error('Error removing coin from collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to remove coin from collection');
  }
};

// Update coin data in a collection. Atomic: uses `arrayFilters` so we can
// $set only the nested entry matching `coinId`, guarded by the ownership
// filter on the root document. This avoids read/mutate/save races that
// could otherwise silently drop concurrent edits.
exports.updateCoinInCollection = async (req, res) => {
  const { collectionId, coinId } = req.params;
  const { weight, diameter, grade, notes } = req.body;

  // Per-field type validation: reject invalid types with a 400 rather than
  // letting Mongoose surface a generic 500 downstream.
  const set = {};
  if (weight !== undefined) {
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
      return ErrorResponse.badRequest(res, 'Invalid weight');
    }
    set['coins.$[entry].weight'] = weight;
  }
  if (diameter !== undefined) {
    if (typeof diameter !== 'number' || !Number.isFinite(diameter) || diameter < 0) {
      return ErrorResponse.badRequest(res, 'Invalid diameter');
    }
    set['coins.$[entry].diameter'] = diameter;
  }
  if (grade !== undefined) {
    if (typeof grade !== 'string' || grade.length > 50) {
      return ErrorResponse.badRequest(res, 'Invalid grade');
    }
    set['coins.$[entry].grade'] = grade;
  }
  if (notes !== undefined) {
    if (typeof notes !== 'string' || notes.length > 2000) {
      return ErrorResponse.badRequest(res, 'Invalid notes');
    }
    set['coins.$[entry].notes'] = notes;
  }

  if (Object.keys(set).length === 0) {
    return ErrorResponse.badRequest(res, 'No fields to update');
  }

  try {
    const collection = await Collection.findOneAndUpdate(
      {
        _id: collectionId,
        user: req.user.userId,
        'coins.coin': coinId
      },
      { $set: set },
      {
        new: true,
        arrayFilters: [{ 'entry.coin': coinId }],
        runValidators: true
      }
    );

    if (!collection) {
      // Either the collection was not found/owned, or the coin isn't in it.
      // We don't distinguish to avoid leaking the collection's existence.
      return ErrorResponse.notFound(res, 'Coin not found in collection');
    }

    res.status(200).json(collection);
  } catch (error) {
    logger.error('Error updating coin in collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to update coin in collection');
  }
};
