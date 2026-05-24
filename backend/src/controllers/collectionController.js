const Collection = require('../models/Collection');
const CoinCustomImage = require('../models/CoinCustomImage');
const Coin = require('../models/Coin');
const { validationResult } = require('express-validator');
const { ErrorResponse } = require('../utils/errorResponse');
const { UPLOAD } = require('../config/constants');
const { deleteImage } = require('../middlewares/upload');
const logger = require('../utils/logger');

const COIN_POPULATE_SELECT = 'title reference references authority.issuer authority.dynasty classification.denomination classification.material classification.mint coinage.date descriptions subjects source_ocre_url images';

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const normalizeMoney = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' || typeof value === 'string') {
    const amount = toNumber(value);
    return amount === undefined ? undefined : { amount, currency: 'EUR' };
  }
  const amount = toNumber(value.amount);
  return amount === undefined ? undefined : {
    amount,
    currency: value.currency || 'EUR'
  };
};

const coinEntryFields = [
  'name', 'emperor', 'issuingAuthority', 'dynasty', 'historicalPeriod', 'dateOfIssue',
  'mint', 'provinceRegion', 'denomination', 'material', 'axis', 'shape', 'grade',
  'patina', 'conditionNotes', 'obverseLegend', 'obverseDescription', 'bustType',
  'portraitDirection', 'reverseLegend', 'reverseDescription', 'reverseType',
  'symbolDeityPersonification', 'rarity', 'authenticityStatus', 'seller',
  'auctionHouse', 'lotNumber', 'invoiceReferenceNumber', 'sourceType', 'provenance',
  'storageLocation', 'notes'
];

const buildCoinEntryPayload = (body = {}) => {
  const payload = {};
  for (const field of coinEntryFields) {
    if (body[field] !== undefined) payload[field] = body[field];
  }
  for (const field of ['weight', 'diameter', 'thickness']) {
    const value = toNumber(body[field]);
    if (value !== undefined) payload[field] = value;
  }
  if (body.dateRange !== undefined) {
    payload.dateRange = {
      from: toNumber(body.dateRange?.from),
      to: toNumber(body.dateRange?.to)
    };
  }
  if (body.acquisitionDate) payload.acquisitionDate = new Date(body.acquisitionDate);
  if (body.purchasePrice !== undefined) payload.purchasePrice = normalizeMoney(body.purchasePrice);
  if (body.estimatedValue !== undefined) payload.estimatedValue = normalizeMoney(body.estimatedValue);
  if (body.catalogReferences !== undefined) payload.catalogReferences = body.catalogReferences;
  if (Array.isArray(body.tags)) payload.tags = body.tags.map(String).map(t => t.trim()).filter(Boolean);
  else if (typeof body.tags === 'string') payload.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean);
  return payload;
};

const validateCoinEntryInput = (body = {}) => {
  const errors = [];
  for (const field of ['weight', 'diameter', 'thickness']) {
    const value = toNumber(body[field]);
    if (value !== undefined && value < 0) errors.push(`${field} cannot be negative`);
  }
  for (const field of ['purchasePrice', 'estimatedValue']) {
    const money = normalizeMoney(body[field]);
    if (money?.amount !== undefined && money.amount < 0) errors.push(`${field} cannot be negative`);
  }
  return errors;
};

const getCoinName = (entry) => entry.name || entry.coin?.title?.en || '';
const getIssuer = (entry) => entry.emperor || entry.issuingAuthority || entry.coin?.authority?.issuer || '';
const getDynasty = (entry) => entry.dynasty || entry.coin?.authority?.dynasty || '';
const getMint = (entry) => entry.mint || entry.coin?.classification?.mint || '';
const getDenomination = (entry) => entry.denomination || entry.coin?.classification?.denomination || '';
const getMaterial = (entry) => entry.material || entry.coin?.classification?.material || '';
const getPeriod = (entry) => entry.historicalPeriod || '';
const getFromYear = (entry) => entry.dateRange?.from ?? entry.coin?.coinage?.date?.from;
const getToYear = (entry) => entry.dateRange?.to ?? entry.coin?.coinage?.date?.to;

const valueAmount = (money) => Number(money?.amount || 0);
const topValue = (items) => {
  const counts = new Map();
  for (const item of items.filter(Boolean)) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
};
const distribution = (items) => items.filter(Boolean).reduce((acc, item) => {
  acc[item] = (acc[item] || 0) + 1;
  return acc;
}, {});

const computeCollectionStats = (collection) => {
  const entries = collection.coins || [];
  const totalEstimatedValue = entries.reduce((sum, entry) => sum + valueAmount(entry.estimatedValue), 0);
  const totalPurchaseCost = entries.reduce((sum, entry) => sum + valueAmount(entry.purchasePrice), 0);
  const byFromYear = entries.filter(entry => getFromYear(entry) !== undefined);
  const byToYear = entries.filter(entry => getToYear(entry) !== undefined);
  const byEstimatedValue = entries.filter(entry => valueAmount(entry.estimatedValue) > 0);
  return {
    totalCoins: entries.length,
    totalEstimatedValue,
    totalPurchaseCost,
    averageCoinValue: entries.length ? totalEstimatedValue / entries.length : 0,
    mostRepresentedEmperor: topValue(entries.map(getIssuer)),
    mostRepresentedMint: topValue(entries.map(getMint)),
    distributionByEmperor: distribution(entries.map(getIssuer)),
    distributionByDenomination: distribution(entries.map(getDenomination)),
    distributionByMaterial: distribution(entries.map(getMaterial)),
    distributionByHistoricalPeriod: distribution(entries.map(getPeriod)),
    distributionByPreservationGrade: distribution(entries.map(entry => entry.grade)),
    oldestCoin: byFromYear.sort((a, b) => getFromYear(a) - getFromYear(b))[0] || null,
    newestCoin: byToYear.sort((a, b) => getToYear(b) - getToYear(a))[0] || null,
    mostValuableCoin: byEstimatedValue.sort((a, b) => valueAmount(b.estimatedValue) - valueAmount(a.estimatedValue))[0] || null,
    recentlyAddedCoins: [...entries].sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0)).slice(0, 5)
  };
};

const attachStats = (collection) => {
  const obj = typeof collection.toObject === 'function' ? collection.toObject() : collection;
  obj.visibility = obj.visibility || (obj.isPublic ? 'Public' : 'Private');
  obj.statistics = computeCollectionStats(obj);
  return obj;
};

const applyCollectionFilters = (entries, query = {}) => {
  const keyword = String(query.keyword || query.search || '').trim().toLowerCase();
  const matches = (value, expected) => !expected || String(value || '').toLowerCase().includes(String(expected).toLowerCase());
  return entries.filter((entry) => {
    if (keyword) {
      const haystack = [
        getCoinName(entry), getIssuer(entry), getDynasty(entry), getMint(entry),
        getDenomination(entry), getMaterial(entry), entry.grade, entry.rarity,
        entry.sourceType, entry.notes, ...(entry.tags || [])
      ].join(' ').toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return matches(getIssuer(entry), query.emperor || query.issuer)
      && matches(getDynasty(entry), query.dynasty)
      && matches(getMint(entry), query.mint)
      && matches(getPeriod(entry), query.historicalPeriod)
      && matches(getDenomination(entry), query.denomination)
      && matches(getMaterial(entry), query.material)
      && matches(entry.grade, query.grade || query.preservationGrade)
      && matches(entry.rarity, query.rarity)
      && matches(entry.sourceType, query.sourceType || query.acquisitionSource)
      && (!query.tags || (entry.tags || []).some(tag => matches(tag, query.tags)));
  });
};

const sortCollectionEntries = (entries, sortBy = 'dateAdded', order = 'desc') => {
  const dir = order === 'asc' ? 1 : -1;
  const selectors = {
    name: getCoinName,
    dateOfIssue: getFromYear,
    dateAdded: entry => new Date(entry.addedAt || 0).getTime(),
    weight: entry => entry.weight,
    diameter: entry => entry.diameter,
    estimatedValue: entry => valueAmount(entry.estimatedValue),
    purchasePrice: entry => valueAmount(entry.purchasePrice)
  };
  const select = selectors[sortBy] || selectors.dateAdded;
  return [...entries].sort((a, b) => {
    const av = select(a);
    const bv = select(b);
    if (typeof av === 'string' || typeof bv === 'string') return dir * String(av || '').localeCompare(String(bv || ''));
    return dir * ((av || 0) - (bv || 0));
  });
};

// Create a new collection
exports.createCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ErrorResponse.validationError(res, 'Validation failed', errors.array());
  }

  try {
    const { name, description, image, isPublic, visibility } = req.body;

    const collection = new Collection({
      user: req.user.userId,
      name,
      description,
      isPublic: isPublic === undefined ? visibility === 'Public' : isPublic,
      visibility: visibility || (isPublic ? 'Public' : 'Private')
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
        select: COIN_POPULATE_SELECT
      })
      .sort({ sortOrder: 1, createdAt: -1 })
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
        select: COIN_POPULATE_SELECT
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
          select: COIN_POPULATE_SELECT
        })
        .populate('user', 'username avatar')
        .sort({ sortOrder: 1, createdAt: -1 })
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
        select: COIN_POPULATE_SELECT
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

    const response = attachStats(collection);
    response.coins = sortCollectionEntries(
      applyCollectionFilters(response.coins || [], req.query),
      req.query.sortBy,
      req.query.order
    );
    res.json(response);
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
    const { name, description, image, isPublic, visibility, sortOrder } = req.body;

    // Build the $set payload in memory — only set fields the client sent,
    // so a PATCH that only updates the name doesn't clobber description.
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (image !== undefined) update.image = image;
    if (isPublic !== undefined) {
      update.isPublic = isPublic;
      update.visibility = isPublic ? 'Public' : 'Private';
    }
    if (visibility !== undefined) {
      update.visibility = visibility;
      update.isPublic = visibility === 'Public';
    }
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

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

// Add a coin to a collection. Multiple entries for the same catalog coin are
// allowed, because collectors can own duplicate specimens.
exports.addCoinToCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ErrorResponse.validationError(res, 'Validation failed', errors.array());
  }

  const { collectionId } = req.params;
  const { coin } = req.body;
  const validationErrors = validateCoinEntryInput(req.body);
  if (validationErrors.length) {
    return ErrorResponse.badRequest(res, 'Invalid coin details', { errors: validationErrors });
  }

  try {
    // Ownership check (narrow select).
    const collection = await Collection.findById(collectionId).select('user');
    if (!collection) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }
    if (collection.user.toString() !== req.user.userId) {
      return ErrorResponse.forbidden(res, 'Not authorized to modify this collection');
    }

    const coinExists = await Coin.exists({ _id: coin });
    if (!coinExists) {
      return ErrorResponse.notFound(res, 'Coin not found');
    }

    const updated = await Collection.findOneAndUpdate(
      { _id: collectionId, user: req.user.userId },
      {
        $push: {
          coins: { coin, ...buildCoinEntryPayload(req.body) }
        }
      },
      { new: true }
    ).populate({
      path: 'coins.coin',
      select: COIN_POPULATE_SELECT
    });

    if (!updated) {
      return ErrorResponse.notFound(res, 'Collection not found');
    }

    res.status(200).json(attachStats(updated));
  } catch (error) {
    logger.error('Error adding coin to collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to add coin to collection');
  }
};

// Remove a coin from a collection. Atomic $pull with an ownership filter.
exports.removeCoinFromCollection = async (req, res) => {
  const { collectionId, coinId } = req.params;

  try {
    const isEntryId = /^[0-9a-fA-F]{24}$/.test(coinId);
    const entryMatch = isEntryId ? { _id: coinId } : { coin: coinId };
    // Find the entry ID before pulling so we can clean up its images.
    const before = await Collection.findOne(
      { _id: collectionId, user: req.user.userId },
      { coins: { $elemMatch: entryMatch } }
    );
    const entryId = before?.coins?.[0]?._id;

    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, user: req.user.userId },
      { $pull: { coins: entryMatch } },
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
  const validationErrors = validateCoinEntryInput(req.body);
  if (validationErrors.length) {
    return ErrorResponse.badRequest(res, 'Invalid coin details', { errors: validationErrors });
  }
  const payload = buildCoinEntryPayload(req.body);
  const set = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) set[`coins.$[entry].${key}`] = value;
  });

  if (Object.keys(set).length === 0) {
    return ErrorResponse.badRequest(res, 'No fields to update');
  }

  try {
    const isEntryId = /^[0-9a-fA-F]{24}$/.test(coinId);
    const match = isEntryId ? { 'coins._id': coinId } : { 'coins.coin': coinId };
    const arrayFilter = isEntryId ? { 'entry._id': coinId } : { 'entry.coin': coinId };
    const collection = await Collection.findOneAndUpdate(
      {
        _id: collectionId,
        user: req.user.userId,
        ...match
      },
      { $set: set },
      {
        new: true,
        arrayFilters: [arrayFilter],
        runValidators: true
      }
    ).populate({ path: 'coins.coin', select: COIN_POPULATE_SELECT });

    if (!collection) {
      // Either the collection was not found/owned, or the coin isn't in it.
      // We don't distinguish to avoid leaking the collection's existence.
      return ErrorResponse.notFound(res, 'Coin not found in collection');
    }

    res.status(200).json(attachStats(collection));
  } catch (error) {
    logger.error('Error updating coin in collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to update coin in collection');
  }
};

exports.reorderCollections = async (req, res) => {
  try {
    const { collectionIds } = req.body;
    if (!Array.isArray(collectionIds)) return ErrorResponse.badRequest(res, 'collectionIds must be an array');

    await Promise.all(collectionIds.map((id, index) => Collection.updateOne(
      { _id: id, user: req.user.userId },
      { $set: { sortOrder: index } }
    )));

    const collections = await Collection.find({ user: req.user.userId })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.json({ collections });
  } catch (error) {
    logger.error('Error reordering collections', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to reorder collections');
  }
};

exports.reorderCollectionCoins = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { entryIds } = req.body;
    if (!Array.isArray(entryIds)) return ErrorResponse.badRequest(res, 'entryIds must be an array');

    const collection = await Collection.findOne({ _id: collectionId, user: req.user.userId });
    if (!collection) return ErrorResponse.notFound(res, 'Collection not found');

    const byId = new Map(collection.coins.map(entry => [entry._id.toString(), entry]));
    const ordered = entryIds.map(id => byId.get(String(id))).filter(Boolean);
    const remaining = collection.coins.filter(entry => !entryIds.includes(entry._id.toString()));
    collection.coins = [...ordered, ...remaining];
    await collection.save();
    await collection.populate({ path: 'coins.coin', select: COIN_POPULATE_SELECT });
    res.json(attachStats(collection));
  } catch (error) {
    logger.error('Error reordering collection coins', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to reorder coins');
  }
};

exports.duplicateCoinEntry = async (req, res) => {
  try {
    const { collectionId, entryId } = req.params;
    const collection = await Collection.findOne({ _id: collectionId, user: req.user.userId });
    if (!collection) return ErrorResponse.notFound(res, 'Collection not found');
    const entry = collection.coins.id(entryId);
    if (!entry) return ErrorResponse.notFound(res, 'Coin entry not found');

    const copy = entry.toObject();
    delete copy._id;
    copy.addedAt = new Date();
    collection.coins.push(copy);
    await collection.save();
    await collection.populate({ path: 'coins.coin', select: COIN_POPULATE_SELECT });
    res.status(201).json(attachStats(collection));
  } catch (error) {
    logger.error('Error duplicating coin entry', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to duplicate coin');
  }
};

exports.moveOrCopyCoinEntry = async (req, res) => {
  try {
    const { collectionId, entryId } = req.params;
    const { targetCollectionId, mode = 'move' } = req.body;
    if (!targetCollectionId) return ErrorResponse.badRequest(res, 'targetCollectionId is required');
    if (!['move', 'copy'].includes(mode)) return ErrorResponse.badRequest(res, 'mode must be move or copy');

    const [source, target] = await Promise.all([
      Collection.findOne({ _id: collectionId, user: req.user.userId }),
      Collection.findOne({ _id: targetCollectionId, user: req.user.userId })
    ]);
    if (!source || !target) return ErrorResponse.notFound(res, 'Collection not found');
    const entry = source.coins.id(entryId);
    if (!entry) return ErrorResponse.notFound(res, 'Coin entry not found');

    const copy = entry.toObject();
    delete copy._id;
    copy.addedAt = new Date();
    target.coins.push(copy);
    if (mode === 'move') source.coins.pull(entryId);
    await Promise.all([source.save(), target.save()]);
    await target.populate({ path: 'coins.coin', select: COIN_POPULATE_SELECT });
    res.json({ source: attachStats(source), target: attachStats(target) });
  } catch (error) {
    logger.error('Error moving/copying coin entry', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to move or copy coin');
  }
};

const collectionToExportRows = (collection) => (collection.coins || []).map((entry) => ({
  entryId: entry._id,
  coinId: entry.coin?._id || entry.coin,
  name: getCoinName(entry),
  emperor: getIssuer(entry),
  dynasty: getDynasty(entry),
  historicalPeriod: getPeriod(entry),
  dateFrom: getFromYear(entry),
  dateTo: getToYear(entry),
  mint: getMint(entry),
  denomination: getDenomination(entry),
  material: getMaterial(entry),
  weight: entry.weight,
  diameter: entry.diameter,
  grade: entry.grade,
  rarity: entry.rarity,
  sourceType: entry.sourceType,
  purchasePrice: entry.purchasePrice?.amount,
  estimatedValue: entry.estimatedValue?.amount,
  tags: (entry.tags || []).join('|'),
  notes: entry.notes
}));

const csvEscape = (value) => {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const rowsToCsv = (rows) => {
  const headers = Object.keys(rows[0] || { name: '', emperor: '', mint: '', denomination: '', material: '' });
  return [headers.join(','), ...rows.map(row => headers.map(key => csvEscape(row[key])).join(','))].join('\n');
};

const createSimplePdf = (title, lines) => {
  const text = [title, '', ...lines].join('\n').replace(/[()\\]/g, '\\$&');
  const stream = `BT /F1 12 Tf 50 780 Td 14 TL (${text.replace(/\n/g, ') Tj T* (')}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(body.length);
    body += `${obj}\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { body += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  body += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, 'utf8');
};

exports.exportCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const format = String(req.query.format || 'json').toLowerCase();
    const selectedIds = String(req.query.selected || '').split(',').filter(Boolean);
    const collection = await Collection.findOne({ _id: collectionId, user: req.user.userId })
      .populate({ path: 'coins.coin', select: COIN_POPULATE_SELECT });
    if (!collection) return ErrorResponse.notFound(res, 'Collection not found');

    const output = attachStats(collection);
    if (selectedIds.length) output.coins = output.coins.filter(entry => selectedIds.includes(String(entry._id)));
    const rows = collectionToExportRows(output);
    const filename = `${collection.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'collection'}.${format}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(rowsToCsv(rows));
    }
    if (format === 'pdf') {
      const pdf = createSimplePdf(collection.name, [
        `Coins: ${output.statistics.totalCoins}`,
        `Estimated value: ${output.statistics.totalEstimatedValue}`,
        `Purchase cost: ${output.statistics.totalPurchaseCost}`,
        '',
        ...rows.slice(0, 40).map(row => `${row.name} | ${row.emperor || 'Unknown'} | ${row.mint || ''}`)
      ]);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdf);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.json({
      collection: output,
      options: {
        includeImages: req.query.includeImages === 'true',
        includeStatistics: req.query.includeStatistics !== 'false',
        exportPublicVersion: req.query.publicVersion === 'true',
        exportPrivateArchive: req.query.privateArchive === 'true'
      }
    });
  } catch (error) {
    logger.error('Error exporting collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to export collection');
  }
};

const parseCsv = (content) => {
  const lines = String(content || '').split(/\r?\n/).filter(Boolean);
  const headers = lines.shift()?.split(',').map(h => h.trim()) || [];
  return lines.map((line) => {
    const values = line.split(',');
    return headers.reduce((row, header, index) => {
      row[header] = values[index]?.trim() || '';
      return row;
    }, {});
  });
};

const escapeRegexLiteral = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findCatalogCoinForImport = async (row) => {
  const coinId = row.coinId || row.coin?._id || row.coin;
  if (coinId) {
    const existing = await Coin.findById(coinId).select('_id title').lean();
    if (existing) return existing;
  }
  if (!row.name) return null;
  return Coin.findOne({ 'title.en': { $regex: `^${escapeRegexLiteral(row.name)}$`, $options: 'i' } })
    .select('_id title')
    .lean();
};

const normalizeImportRows = (req) => {
  const { format = 'json', rows, content, columnMapping = {} } = req.body;
  const parsedJson = String(format).toLowerCase() === 'json' && content ? JSON.parse(content) : null;
  const rawRows = Array.isArray(rows)
    ? rows
    : String(format).toLowerCase() === 'csv'
      ? parseCsv(content)
      : Array.isArray(parsedJson)
        ? parsedJson
        : parsedJson?.collection?.coins || parsedJson?.coins || [];
  return rawRows.map((row) => {
    const mapped = {};
    for (const [target, source] of Object.entries(columnMapping)) mapped[target] = row[source];
    return { ...row, ...mapped };
  });
};

exports.previewImport = async (req, res) => {
  try {
    const rows = normalizeImportRows(req);
    const matches = await Promise.all(rows.map(findCatalogCoinForImport));
    const validation = rows.map((row, index) => ({
      index,
      valid: Boolean(matches[index]),
      matchedCoinId: matches[index]?._id || null,
      matchedTitle: matches[index]?.title?.en || null,
      errors: matches[index] ? [] : ['No matching browse catalog coin found by coinId or exact name']
    }));
    const seen = new Set();
    const duplicates = rows
      .map((row, index) => ({ index, key: row.coin || row.coinId || row.name }))
      .filter(({ key }) => {
        if (!key) return false;
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      });
    res.json({ rows, validation, duplicates, canImport: validation.every(v => v.valid) });
  } catch (error) {
    logger.error('Error previewing import', { error: error.message });
    return ErrorResponse.badRequest(res, 'Import preview failed', { message: error.message });
  }
};

exports.importCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { overwrite = false } = req.body;
    const rows = normalizeImportRows(req);
    const collection = await Collection.findOne({ _id: collectionId, user: req.user.userId });
    if (!collection) return ErrorResponse.notFound(res, 'Collection not found');
    const matches = await Promise.all(rows.map(findCatalogCoinForImport));
    if (matches.some(match => !match)) {
      return ErrorResponse.badRequest(res, 'Some rows do not match a browse catalog coin. Preview the import first.');
    }
    if (overwrite !== true && matches.some(match => collection.coins.some(entry => entry.coin === match._id))) {
      return ErrorResponse.badRequest(res, 'Duplicate coins detected. Confirm overwrite to continue.');
    }

    for (const [index, row] of rows.entries()) {
      const validationErrors = validateCoinEntryInput(row);
      if (validationErrors.length) {
        return ErrorResponse.badRequest(res, `Invalid coin details in row ${index + 1}`, { errors: validationErrors });
      }
      collection.coins.push({ coin: matches[index]._id, ...buildCoinEntryPayload(row) });
    }
    await collection.save();
    await collection.populate({ path: 'coins.coin', select: COIN_POPULATE_SELECT });
    res.json(attachStats(collection));
  } catch (error) {
    logger.error('Error importing collection', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to import collection');
  }
};
