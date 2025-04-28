const Coin = require('../models/Coin');
const { validationResult } = require('express-validator');

// Aggiunge una nuova moneta
exports.createCoin = async (req, res) => {
  // Validazione
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const coin = new Coin(req.body);
    await coin.save();
    res.status(201).json(coin);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};

exports.getCoins = async (req, res) => {
  try {
    const { 
      keyword, 
      date_range, 
      material, 
      emperor, 
      dynasty, 
      denomination, 
      mint, 
      portrait, 
      deity,
      page = 1,
      limit = 20,
      sortBy = 'name',
      order = 'asc'
    } = req.query;

    let query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { 'obverse.legend': { $regex: keyword, $options: 'i' } },
        { 'reverse.legend': { $regex: keyword, $options: 'i' } }
      ];
    }
    if (date_range) {
      query['description.date_range'] = { $regex: date_range, $options: 'i' };
    }
    if (material) {
      query['description.material'] = { $regex: material, $options: 'i' };
    }
    if (emperor) {
      query['authority.emperor'] = { $regex: emperor, $options: 'i' };
    }
    if (dynasty) {
      query['authority.dynasty'] = { $regex: dynasty, $options: 'i' };
    }
    if (denomination) {
      query['description.denomination'] = { $regex: denomination, $options: 'i' };
    }
    if (mint) {
      query['description.mint'] = { $regex: mint, $options: 'i' };
    }
    if (portrait) {
      query['obverse.portrait'] = { $regex: portrait, $options: 'i' };
    }
    if (deity) {
      query['reverse.deity'] = { $regex: deity, $options: 'i' };
    }

    // PAGINAZIONE
    const skip = (page - 1) * limit;

    // ORDINAMENTO
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const coins = await Coin.find(query)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort(sortOptions);

    const total = await Coin.countDocuments(query);

    res.json({
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      results: coins
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};