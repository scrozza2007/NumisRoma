const WishlistEntry = require('../models/WishlistEntry');
const Collection = require('../models/Collection');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');

const allowedFields = [
  'collection', 'coinId', 'name', 'emperor', 'mint', 'material', 'denomination',
  'estimatedPrice', 'priority', 'notes', 'references', 'status'
];

const pickPayload = (body) => allowedFields.reduce((payload, field) => {
  if (body[field] !== undefined) payload[field] = body[field];
  return payload;
}, {});

exports.getWishlist = async (req, res) => {
  try {
    const filter = { user: req.user.userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.collection) filter.collection = req.query.collection;
    const entries = await WishlistEntry.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ entries });
  } catch (error) {
    logger.error('Error fetching wishlist', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to fetch wishlist');
  }
};

exports.createWishlistEntry = async (req, res) => {
  try {
    const entry = await WishlistEntry.create({ user: req.user.userId, ...pickPayload(req.body) });
    res.status(201).json(entry);
  } catch (error) {
    logger.error('Error creating wishlist entry', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to create wishlist entry');
  }
};

exports.updateWishlistEntry = async (req, res) => {
  try {
    const entry = await WishlistEntry.findOneAndUpdate(
      { _id: req.params.entryId, user: req.user.userId },
      { $set: pickPayload(req.body) },
      { new: true, runValidators: true }
    );
    if (!entry) return ErrorResponse.notFound(res, 'Wishlist entry not found');
    res.json(entry);
  } catch (error) {
    logger.error('Error updating wishlist entry', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to update wishlist entry');
  }
};

exports.deleteWishlistEntry = async (req, res) => {
  try {
    const deleted = await WishlistEntry.findOneAndDelete({ _id: req.params.entryId, user: req.user.userId });
    if (!deleted) return ErrorResponse.notFound(res, 'Wishlist entry not found');
    res.json({ message: 'Wishlist entry removed' });
  } catch (error) {
    logger.error('Error deleting wishlist entry', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to delete wishlist entry');
  }
};

exports.markWishlistAcquired = async (req, res) => {
  try {
    const entry = await WishlistEntry.findOneAndUpdate(
      { _id: req.params.entryId, user: req.user.userId },
      { $set: { status: 'Acquired' } },
      { new: true }
    );
    if (!entry) return ErrorResponse.notFound(res, 'Wishlist entry not found');
    res.json(entry);
  } catch (error) {
    logger.error('Error marking wishlist acquired', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to mark wishlist entry acquired');
  }
};

exports.convertWishlistToCoin = async (req, res) => {
  try {
    const { collectionId, coinId } = req.body;
    if (!collectionId || !coinId) return ErrorResponse.badRequest(res, 'collectionId and coinId are required');

    const [entry, collection] = await Promise.all([
      WishlistEntry.findOne({ _id: req.params.entryId, user: req.user.userId }),
      Collection.findOne({ _id: collectionId, user: req.user.userId })
    ]);
    if (!entry) return ErrorResponse.notFound(res, 'Wishlist entry not found');
    if (!collection) return ErrorResponse.notFound(res, 'Collection not found');

    collection.coins.push({
      coin: coinId,
      name: entry.name,
      emperor: entry.emperor,
      mint: entry.mint,
      material: entry.material,
      denomination: entry.denomination,
      estimatedValue: entry.estimatedPrice,
      notes: entry.notes
    });
    entry.status = 'Acquired';
    await Promise.all([collection.save(), entry.save()]);
    res.status(201).json({ wishlistEntry: entry, collection });
  } catch (error) {
    logger.error('Error converting wishlist entry', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to convert wishlist entry');
  }
};
