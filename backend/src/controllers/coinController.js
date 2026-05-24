const Coin = require('../models/Coin');
const CoinCustomImage = require('../models/CoinCustomImage');
const { validationResult } = require('express-validator');
const { deleteImage } = require('../middlewares/upload');
const { cacheHelpers } = require('../utils/cache');
const { PAGINATION, QUERY_LIMITS } = require('../config/constants');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');

const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildEraQuery = (era) => {
  if (era === 'imperial') {
    return {
      $or: [
        { 'reference.system': { $regex: /^RIC$/i } },
        { 'references.system': { $regex: /^RIC$/i } },
        { _id: { $regex: /^ric[_\-.]/i } },
        { source_ocre_url: { $regex: /\/ocre\//i } }
      ]
    };
  }

  if (era === 'republican') {
    return {
      $or: [
        { 'reference.system': { $regex: /^(RRC|CRRO|Crawford)$/i } },
        { 'references.system': { $regex: /^(RRC|CRRO|Crawford)$/i } },
        { _id: { $regex: /^(rrc|crro|crawford)[_\-.]/i } },
        { source_ocre_url: { $regex: /\/(crro|rrc)\//i } },
        { 'authority.dynasty': { $regex: /republic/i } }
      ]
    };
  }

  return null;
};

const addAndQuery = (query, condition) => {
  if (!condition) return;
  query.$and = query.$and || [];
  query.$and.push(condition);
};

// Returns the primary display image URL for a coin document.
// Prefers the first image's obverse file; falls back to unified; returns null
// when no images are present.
const getPrimaryImageUrl = (coin) => {
  if (!coin.images || coin.images.length === 0) return null;
  const first = coin.images[0];
  if (first.files) {
    return first.files.obverse || first.files.unified || null;
  }
  return null;
};

// Add a new coin (admin-only — enforced in the route layer).
exports.createCoin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ErrorResponse.validationError(res, 'Validation failed', errors.array());
  }

  try {
    const coin = new Coin(req.body);
    await coin.save();

    Promise.allSettled([
      cacheHelpers.filters.clear(),
      cacheHelpers.api.clear()
    ]).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') {
          logger.error('Failed to invalidate cache after coin creation', {
            error: r.reason?.message
          });
        }
      }
    });

    res.status(201).json(coin);
  } catch (error) {
    logger.error('Error creating coin', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to create coin');
  }
};

exports.getRandomCoins = async (req, res) => {
  try {
    const requestedLimit = parseInt(req.query.limit) || QUERY_LIMITS.DEFAULT_RANDOM_COINS;
    const limit = Math.min(Math.max(requestedLimit, 1), QUERY_LIMITS.MAX_RANDOM_COINS);

    const total = await Coin.countDocuments();
    const randomCoins = await Coin.aggregate([
      { $match: { 'images.0': { $exists: true } } },
      { $sample: { size: limit } },
    ]);

    res.json({ total, results: randomCoins });
  } catch (error) {
    logger.error('Error fetching random coins', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to fetch random coins');
  }
};

// Get distinct values for filter dropdowns.
exports.getFilterOptions = async (req, res) => {
  try {
    const EXAMPLES_LIMIT = 5;

    const [materials, issuers, dynasties, denominations, mints, portraits] = await Promise.all([
      Coin.aggregate([
        { $match: { 'classification.material': { $exists: true, $ne: '', $ne: null } } },
        { $group: {
          _id: '$classification.material',
          count: { $sum: 1 },
          examples: { $push: '$title.en' }
        }},
        { $project: { count: 1, examples: { $slice: ['$examples', EXAMPLES_LIMIT] } } },
        { $sort: { _id: 1 } }
      ]),

      Coin.aggregate([
        { $match: { 'authority.issuer': { $exists: true, $ne: '', $ne: null } } },
        { $group: {
          _id: '$authority.issuer',
          count: { $sum: 1 },
          dynasties: { $addToSet: '$authority.dynasty' },
          dateFromMin: { $min: '$coinage.date.from' },
          dateToMax:   { $max: '$coinage.date.to' },
          examples: { $push: '$title.en' }
        }},
        { $project: {
          count: 1, dynasties: 1, dateFromMin: 1, dateToMax: 1,
          examples: { $slice: ['$examples', EXAMPLES_LIMIT] }
        }},
        { $sort: { _id: 1 } }
      ]),

      Coin.aggregate([
        { $match: { 'authority.dynasty': { $exists: true, $ne: '', $ne: null } } },
        { $group: {
          _id: '$authority.dynasty',
          count: { $sum: 1 },
          issuers: { $addToSet: '$authority.issuer' },
          examples: { $push: '$title.en' }
        }},
        { $project: {
          count: 1, issuers: 1,
          examples: { $slice: ['$examples', EXAMPLES_LIMIT] }
        }},
        { $sort: { _id: 1 } }
      ]),

      Coin.aggregate([
        { $match: { 'classification.denomination': { $exists: true, $ne: '', $ne: null } } },
        { $group: {
          _id: '$classification.denomination',
          count: { $sum: 1 },
          materials: { $addToSet: '$classification.material' },
          examples: { $push: '$title.en' }
        }},
        { $project: {
          count: 1, materials: 1,
          examples: { $slice: ['$examples', EXAMPLES_LIMIT] }
        }},
        { $sort: { _id: 1 } }
      ]),

      Coin.aggregate([
        { $match: { 'classification.mint': { $exists: true, $ne: '', $ne: null } } },
        { $group: {
          _id: '$classification.mint',
          count: { $sum: 1 },
          examples: { $push: '$title.en' }
        }},
        { $project: { count: 1, examples: { $slice: ['$examples', EXAMPLES_LIMIT] } } },
        { $sort: { _id: 1 } }
      ]),

      // Distinct portraits from obverse across all coins
      Coin.aggregate([
        {
          $facet: {
            obversePortraits: [
              { $match: { 'descriptions.obverse.portrait': { $exists: true, $ne: '', $ne: null } } },
              { $group: {
                _id: '$descriptions.obverse.portrait',
                count: { $sum: 1 },
                examples: { $push: '$title.en' }
              }},
              { $project: { count: 1, examples: { $slice: ['$examples', EXAMPLES_LIMIT] } } }
            ],
            reversePortraits: [
              { $match: { 'descriptions.reverse.portrait': { $exists: true, $ne: '', $ne: null } } },
              { $group: {
                _id: '$descriptions.reverse.portrait',
                count: { $sum: 1 },
                examples: { $push: '$title.en' }
              }},
              { $project: { count: 1, examples: { $slice: ['$examples', EXAMPLES_LIMIT] } } }
            ]
          }
        },
        { $project: { all: { $concatArrays: ['$obversePortraits', '$reversePortraits'] } } },
        { $unwind: '$all' },
        { $replaceRoot: { newRoot: '$all' } },
        { $group: { _id: '$_id', count: { $sum: '$count' } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const createTooltip = (item, type) => {
      const count = item.count;
      switch (type) {
        case 'issuer': {
          const dynastyInfo = item.dynasties?.filter(Boolean).join(', ');
          return `Roman issuer${dynastyInfo ? ` (${dynastyInfo})` : ''} — ${count} coins in catalog`;
        }
        case 'dynasty': {
          const issuerList = item.issuers?.filter(Boolean).slice(0, 3).join(', ');
          return `${item._id} dynasty${issuerList ? ` (${issuerList}${item.issuers.length > 3 ? '…' : ''})` : ''} — ${count} coins`;
        }
        case 'material':
          return `${item._id} coins — ${count} examples in catalog`;
        case 'denomination': {
          const matInfo = item.materials?.filter(Boolean).join(', ');
          return `${item._id}${matInfo ? ` — usually ${matInfo}` : ''} — ${count} coins`;
        }
        case 'mint':
          return `${item._id} mint — ${count} coins produced here`;
        case 'portrait':
          return `${item._id} — ${count} depictions in catalog`;
        default:
          return `${item._id} — ${count} coins`;
      }
    };

    const response = {
      materials:    materials.map(m => m._id),
      issuers:      issuers.map(e => e._id),
      dynasties:    dynasties.map(d => d._id),
      denominations: denominations.map(d => d._id),
      mints:        mints.map(m => m._id),
      portraits:    portraits.map(p => p._id),

      tooltips: {
        materials:    materials.reduce((a, i) => { a[i._id] = createTooltip(i, 'material'); return a; }, {}),
        issuers:      issuers.reduce((a, i) => { a[i._id] = createTooltip(i, 'issuer'); return a; }, {}),
        dynasties:    dynasties.reduce((a, i) => { a[i._id] = createTooltip(i, 'dynasty'); return a; }, {}),
        denominations: denominations.reduce((a, i) => { a[i._id] = createTooltip(i, 'denomination'); return a; }, {}),
        mints:        mints.reduce((a, i) => { a[i._id] = createTooltip(i, 'mint'); return a; }, {}),
        portraits:    portraits.reduce((a, i) => { a[i._id] = createTooltip(i, 'portrait'); return a; }, {})
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching filter options', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to fetch filter options');
  }
};

// Get min/max coinage years for the period range slider.
exports.getDateRanges = async (req, res) => {
  try {
    const [minResult, maxResult] = await Promise.all([
      Coin.findOne({ 'coinage.date.from': { $exists: true } })
        .sort({ 'coinage.date.from': 1 })
        .select('coinage.date.from')
        .lean(),
      Coin.findOne({ 'coinage.date.to': { $exists: true } })
        .sort({ 'coinage.date.to': -1 })
        .select('coinage.date.to')
        .lean()
    ]);

    const minYear = minResult?.coinage?.date?.from ?? -31;
    const maxYear = maxResult?.coinage?.date?.to   ?? 491;

    res.json({ minYear, maxYear });
  } catch (error) {
    logger.error('Error fetching date ranges', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to fetch date ranges');
  }
};

exports.getCoins = async (req, res) => {
  try {
    const {
      keyword,
      material,
      issuer,
      dynasty,
      denomination,
      mint,
      portrait,
      subject,
      era = 'both',
      startYear,
      endYear,
      sortBy = 'title',
      order  = 'asc'
    } = req.query;

    const page  = Math.max(parseInt(req.query.page,  10) || PAGINATION.DEFAULT_PAGE,  PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MIN_LIMIT),
      PAGINATION.MAX_LIMIT
    );

    const MAX_KEYWORD_LENGTH = 200;
    if (keyword && String(keyword).length > MAX_KEYWORD_LENGTH) {
      return ErrorResponse.badRequest(res, 'Keyword too long', {
        message: `Keyword cannot exceed ${MAX_KEYWORD_LENGTH} characters`
      });
    }

    let query = {};
    const normalizedEra = ['imperial', 'republican'].includes(String(era).toLowerCase())
      ? String(era).toLowerCase()
      : 'both';
    addAndQuery(query, buildEraQuery(normalizedEra));

    if (keyword) {
      const safe = escapeRegex(keyword);

      if (/\bRIC\b/i.test(keyword)) {
        if (/^RIC\s+\d+$/i.test(keyword.trim())) {
          const num = keyword.match(/\d+$/)[0];
          query['title.en'] = { $regex: `RIC.*\\b${num}\\b`, $options: 'i' };
        } else {
          query['title.en'] = { $regex: safe, $options: 'i' };
        }
      } else {
        query.$or = [
          { 'title.en':                        { $regex: safe, $options: 'i' } },
          { 'descriptions.obverse.legend':     { $regex: safe, $options: 'i' } },
          { 'descriptions.reverse.legend':     { $regex: safe, $options: 'i' } },
          { 'descriptions.obverse.type':       { $regex: safe, $options: 'i' } },
          { 'descriptions.reverse.type':       { $regex: safe, $options: 'i' } },
          { 'authority.issuer':                { $regex: safe, $options: 'i' } },
          { 'authority.dynasty':               { $regex: safe, $options: 'i' } },
          { 'classification.mint':             { $regex: safe, $options: 'i' } },
          { 'classification.material':         { $regex: safe, $options: 'i' } },
          { 'classification.denomination':     { $regex: safe, $options: 'i' } },
          { subjects:                          { $regex: safe, $options: 'i' } },
        ];
      }
    }

    if (portrait) {
      const esc = escapeRegex(portrait);
      addAndQuery(query, { $or: [
        { 'descriptions.obverse.portrait': { $regex: esc, $options: 'i' } },
        { 'descriptions.reverse.portrait': { $regex: esc, $options: 'i' } }
      ]});
      // Move any top-level $or (from keyword) into $and so they don't conflict
      if (query.$or) {
        addAndQuery(query, { $or: query.$or });
        delete query.$or;
      }
    }

    if (subject) {
      query.subjects = { $regex: escapeRegex(subject), $options: 'i' };
    }

    // Year range filter — uses numeric coinage.date fields
    if (startYear || endYear) {
      const MAX_YEAR_RANGE = 600;
      const MIN_YEAR = -500;
      const MAX_YEAR = 700;
      const YEAR_PATTERN = /^-?\d+$/;

      if (startYear && !YEAR_PATTERN.test(String(startYear).trim())) {
        return ErrorResponse.badRequest(res, 'Invalid year format', { message: 'startYear must be a valid integer' });
      }
      if (endYear && !YEAR_PATTERN.test(String(endYear).trim())) {
        return ErrorResponse.badRequest(res, 'Invalid year format', { message: 'endYear must be a valid integer' });
      }

      const start = startYear ? parseInt(startYear, 10) : MIN_YEAR;
      const end   = endYear   ? parseInt(endYear,   10) : MAX_YEAR;

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return ErrorResponse.badRequest(res, 'Invalid year format', { message: 'Years must be valid finite numbers' });
      }
      if (start > end) {
        return ErrorResponse.badRequest(res, 'Invalid year range', { message: 'startYear must be ≤ endYear' });
      }
      if (start < MIN_YEAR || end > MAX_YEAR) {
        return ErrorResponse.badRequest(res, 'Invalid year range', {
          message: `Years must be between ${MIN_YEAR} and ${MAX_YEAR}`
        });
      }

      // Overlap: coin range [from, to] overlaps query range [start, end]
      addAndQuery(query, {
        'coinage.date.from': { $exists: true, $lte: end },
        'coinage.date.to':   { $exists: true, $gte: start }
      });
    }

    if (material)     query['classification.material']     = { $regex: escapeRegex(material),     $options: 'i' };
    if (issuer)       query['authority.issuer']             = { $regex: escapeRegex(issuer),       $options: 'i' };
    if (dynasty)      query['authority.dynasty']            = { $regex: escapeRegex(dynasty),      $options: 'i' };
    if (denomination) query['classification.denomination']  = { $regex: escapeRegex(denomination), $options: 'i' };
    if (mint)         query['classification.mint']          = { $regex: escapeRegex(mint),         $options: 'i' };

    const skip = (page - 1) * limit;

    const ALLOWED_SORT_FIELDS = [
      'title', 'issuer', 'dynasty', 'chronological',
      'denomination', 'mint', 'material', 'relevance'
    ];
    const validatedSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'title';
    const sortOrder = order === 'desc' ? -1 : 1;
    let sortOptions = {};

    switch (validatedSortBy) {
      case 'relevance':
        sortOptions = { 'title.en': sortOrder };
        break;
      case 'issuer':
        sortOptions['authority.issuer'] = sortOrder;
        break;
      case 'dynasty':
        sortOptions['authority.dynasty'] = sortOrder;
        break;
      case 'chronological':
        sortOptions['coinage.date.from'] = sortOrder;
        break;
      case 'denomination':
        sortOptions['classification.denomination'] = sortOrder;
        break;
      case 'mint':
        sortOptions['classification.mint'] = sortOrder;
        break;
      case 'material':
        sortOptions['classification.material'] = sortOrder;
        break;
      default:
        sortOptions['title.en'] = sortOrder;
    }

    const [coins, total] = await Promise.all([
      Coin.find(query).skip(skip).limit(limit).sort(sortOptions).lean(),
      Coin.countDocuments(query)
    ]);

    res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      results: coins
    });
  } catch (error) {
    logger.error('Error fetching coins', { error: error.message });
    return ErrorResponse.serverError(res, 'Failed to fetch coins');
  }
};

exports.getCoinById = async (req, res) => {
  try {
    const coinId = req.params.id;

    if (!req.user) {
      const cachedCoin = await cacheHelpers.coins.get(coinId);
      if (cachedCoin) {
        logger.debug('Coin cache hit', { coinId });
        return res.json(cachedCoin);
      }
    }

    const coin = await Coin.findById(coinId);
    if (!coin) return ErrorResponse.notFound(res, 'Coin not found');

    if (req.user) {
      try {
        const customImages = await CoinCustomImage.findOne({
          coinId,
          userId: req.user.userId
        });

        if (customImages) {
          const coinObj = coin.toObject();
          // Inject custom images as a synthetic first images entry
          const customEntry = {
            index: 0,
            layout: 'split',
            license: null,
            source: 'user',
            copyright_holder: null,
            files: {}
          };
          if (customImages.obverseImage) customEntry.files.obverse = customImages.obverseImage;
          if (customImages.reverseImage) customEntry.files.reverse = customImages.reverseImage;
          coinObj.images = [customEntry, ...(coinObj.images || [])];
          return res.json(coinObj);
        }
      } catch (customError) {
        logger.warn('Custom image lookup failed; falling back to catalog', {
          coinId,
          userId: req.user?.userId,
          error: customError.message
        });
      }
    }

    if (!req.user) {
      cacheHelpers.coins.set(coinId, coin).catch(err =>
        logger.error('Failed to cache coin', { coinId, error: err.message })
      );
    }

    res.json(coin);
  } catch (error) {
    logger.error('Error fetching coin by ID', { coinId: req.params.id, error: error.message });
    return ErrorResponse.serverError(res, 'Failed to fetch coin');
  }
};

exports.updateCoinImages = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.userId;

    let customImages = await CoinCustomImage.findOne({ collectionEntryId: entryId, userId });
    if (!customImages) {
      customImages = new CoinCustomImage({ collectionEntryId: entryId, userId });
    }

    if (req.processedImages.obverse) {
      if (customImages.obverseImageKey) deleteImage(customImages.obverseImageKey);
      else if (customImages.obverseImage) deleteImage(customImages.obverseImage);
    }
    if (req.processedImages.reverse) {
      if (customImages.reverseImageKey) deleteImage(customImages.reverseImageKey);
      else if (customImages.reverseImage) deleteImage(customImages.reverseImage);
    }

    if (req.processedImages.obverse) {
      if (req.processedImages.obverse.buffer) {
        customImages.obverseImageData        = req.processedImages.obverse.buffer;
        customImages.obverseImageContentType = req.processedImages.obverse.contentType;
      } else {
        customImages.obverseImageData        = undefined;
        customImages.obverseImageContentType = undefined;
      }
      if (req.processedImages.obverse.key) customImages.obverseImageKey = req.processedImages.obverse.key;
      customImages.obverseImage = `/api/coins/entry/${entryId}/images/obverse`;
    }
    if (req.processedImages.reverse) {
      if (req.processedImages.reverse.buffer) {
        customImages.reverseImageData        = req.processedImages.reverse.buffer;
        customImages.reverseImageContentType = req.processedImages.reverse.contentType;
      } else {
        customImages.reverseImageData        = undefined;
        customImages.reverseImageContentType = undefined;
      }
      if (req.processedImages.reverse.key) customImages.reverseImageKey = req.processedImages.reverse.key;
      customImages.reverseImage = `/api/coins/entry/${entryId}/images/reverse`;
    }

    await customImages.save();
    res.json({ message: 'Coin images updated successfully' });
  } catch (error) {
    logger.error('Error updating coin custom images', {
      entryId: req.params.entryId,
      userId: req.user?.userId,
      error: error.message
    });
    return ErrorResponse.serverError(res, 'Failed to update coin images');
  }
};

exports.resetCoinImages = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.userId;

    const customImages = await CoinCustomImage.findOne({ collectionEntryId: entryId, userId });
    if (customImages) {
      if (customImages.obverseImageKey) deleteImage(customImages.obverseImageKey);
      else if (customImages.obverseImage) deleteImage(customImages.obverseImage);
      if (customImages.reverseImageKey) deleteImage(customImages.reverseImageKey);
      else if (customImages.reverseImage) deleteImage(customImages.reverseImage);
      await CoinCustomImage.deleteOne({ collectionEntryId: entryId, userId });
    }

    res.json({ message: 'Coin images reset to catalog defaults successfully' });
  } catch (error) {
    logger.error('Error resetting coin custom images', {
      entryId: req.params.entryId,
      userId: req.user?.userId,
      error: error.message
    });
    return ErrorResponse.serverError(res, 'Failed to reset coin images');
  }
};

exports.getCustomImages = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.userId;

    const customImages = await CoinCustomImage.findOne({ collectionEntryId: entryId, userId }).lean();
    if (!customImages) return res.json(null);

    res.json({
      obverseImage: customImages.obverseImage || null,
      reverseImage: customImages.reverseImage || null,
      createdAt: customImages.createdAt,
      updatedAt: customImages.updatedAt
    });
  } catch (error) {
    logger.error('Error fetching coin custom images', {
      entryId: req.params.entryId,
      userId: req.user?.userId,
      error: error.message
    });
    return ErrorResponse.serverError(res, 'Failed to fetch custom images');
  }
};
