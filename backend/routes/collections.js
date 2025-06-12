const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const Coin = require('../models/Coin');
const { auth, optionalAuth } = require('../middleware/auth');

// GET /api/collections - Get user's collections (both public and private)
router.get('/', auth, async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user.id })
      .populate('user', 'username avatar')
      .populate({
        path: 'coins.coin',
        model: 'Coin'
      })
      .sort({ createdAt: -1 });

    res.json(collections);
  } catch (err) {
    console.error('Error in GET /api/collections:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/collections/public - Get all public collections
router.get('/public', async (req, res) => {
  try {
    const collections = await Collection.find({ isPublic: true })
      .populate('user', 'username avatar')
      .populate({
        path: 'coins.coin',
        model: 'Coin'
      })
      .sort({ createdAt: -1 });

    res.json(collections);
  } catch (err) {
    console.error('Error in GET /api/collections/public:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/collections/:id - Get specific collection
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('user', 'username avatar')
      .populate({
        path: 'coins.coin',
        model: 'Coin'
      });

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check if collection is public or if user is the owner
    const isOwner = req.user && req.user.id === collection.user._id.toString();
    
    if (!collection.isPublic && !isOwner) {
      return res.status(403).json({ msg: 'Access denied. This collection is private.' });
    }

    res.json(collection);
  } catch (err) {
    console.error('Error in GET /api/collections/:id:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/collections - Create new collection
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, image, isPublic } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ msg: 'Collection name is required' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ msg: 'Collection name cannot exceed 100 characters' });
    }

    if (description && description.length > 1000) {
      return res.status(400).json({ msg: 'Description cannot exceed 1000 characters' });
    }

    // Validate image URL if provided
    if (image && image.trim() !== '') {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(image.trim())) {
        return res.status(400).json({ msg: 'Invalid image URL format' });
      }
    }

    const collection = new Collection({
      name: name.trim(),
      description: description ? description.trim() : '',
      image: image && image.trim() !== '' ? image.trim() : '',
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      user: req.user.id,
      coins: []
    });

    const savedCollection = await collection.save();
    
    // Populate user data for response
    await savedCollection.populate('user', 'username avatar');

    res.status(201).json(savedCollection);
  } catch (err) {
    console.error('Error in POST /api/collections:', err);
    res.status(500).json({ msg: 'Server error during collection creation' });
  }
});

// PUT /api/collections/:id - Update collection
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, image, isPublic } = req.body;

    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check if user owns the collection
    if (collection.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to edit this collection' });
    }

    // Validation
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ msg: 'Collection name is required' });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ msg: 'Collection name cannot exceed 100 characters' });
      }
      collection.name = name.trim();
    }

    if (description !== undefined) {
      if (description.length > 1000) {
        return res.status(400).json({ msg: 'Description cannot exceed 1000 characters' });
      }
      collection.description = description.trim();
    }

    if (image !== undefined) {
      if (image.trim() !== '') {
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(image.trim())) {
          return res.status(400).json({ msg: 'Invalid image URL format' });
        }
        collection.image = image.trim();
      } else {
        collection.image = '';
      }
    }

    if (isPublic !== undefined) {
      collection.isPublic = Boolean(isPublic);
    }

    collection.updatedAt = Date.now();

    const updatedCollection = await collection.save();
    await updatedCollection.populate('user', 'username avatar');
    await updatedCollection.populate({
      path: 'coins.coin',
      model: 'Coin'
    });

    res.json(updatedCollection);
  } catch (err) {
    console.error('Error in PUT /api/collections/:id:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/collections/:id - Delete collection
router.delete('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check if user owns the collection
    if (collection.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this collection' });
    }

    await Collection.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Collection deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/collections/:id:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/collections/:id/coins - Add coin to collection
router.post('/:id/coins', auth, async (req, res) => {
  try {
    const { coin, weight, diameter, grade, notes } = req.body;

    if (!coin) {
      return res.status(400).json({ msg: 'Coin ID is required' });
    }

    // Check if coin exists
    const coinDoc = await Coin.findById(coin);
    if (!coinDoc) {
      return res.status(404).json({ msg: 'Coin not found' });
    }

    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check if user owns the collection
    if (collection.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to modify this collection' });
    }

    // Check if coin is already in collection
    const existingCoin = collection.coins.find(c => c.coin.toString() === coin);
    if (existingCoin) {
      return res.status(400).json({ msg: 'Coin is already in this collection' });
    }

    // Add coin to collection
    const coinEntry = {
      coin: coin,
      weight: weight || undefined,
      diameter: diameter || undefined,
      grade: grade || undefined,
      notes: notes || undefined,
      addedAt: new Date()
    };

    collection.coins.push(coinEntry);
    collection.updatedAt = Date.now();

    await collection.save();

    // Populate the response
    await collection.populate({
      path: 'coins.coin',
      model: 'Coin'
    });

    res.json(collection);
  } catch (err) {
    console.error('Error in POST /api/collections/:id/coins:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection or coin not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/collections/:id/coins/:coinId - Remove coin from collection
router.delete('/:id/coins/:coinId', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check if user owns the collection
    if (collection.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to modify this collection' });
    }

    // Find coin in collection
    const coinIndex = collection.coins.findIndex(c => c.coin.toString() === req.params.coinId);
    
    if (coinIndex === -1) {
      return res.status(404).json({ msg: 'Coin not found in this collection' });
    }

    // Remove coin from collection
    collection.coins.splice(coinIndex, 1);
    collection.updatedAt = Date.now();

    await collection.save();

    // Populate the response
    await collection.populate({
      path: 'coins.coin',
      model: 'Coin'
    });

    res.json(collection);
  } catch (err) {
    console.error('Error in DELETE /api/collections/:id/coins/:coinId:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection or coin not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 