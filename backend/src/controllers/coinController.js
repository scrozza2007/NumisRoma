const Coin = require('../models/Coin');
const CoinCustomImage = require('../models/CoinCustomImage');
const { validationResult } = require('express-validator');
const { deleteImage } = require('../../middleware/upload');

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

// Gets random coins
exports.getRandomCoins = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    // Get total count of coins in the database
    const total = await Coin.countDocuments();
    
    // Aggregate with $sample provides true random selection
    const randomCoins = await Coin.aggregate([
      { $sample: { size: limit } }
    ]);
    
    res.json({
      total,
      results: randomCoins
    });
  } catch (error) {
    console.error('Error fetching random coins:', error.message);
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

// Ottiene una singola moneta per ID
exports.getCoinById = async (req, res) => {
  try {
    const coin = await Coin.findById(req.params.id);
    
    if (!coin) {
      return res.status(404).json({ msg: 'Moneta non trovata' });
    }

    // Se l'utente è autenticato, controlla se ha immagini personalizzate
    if (req.user) {
      try {
        const customImages = await CoinCustomImage.findOne({
          coinId: req.params.id,
          userId: req.user.userId
        });

        if (customImages) {
          // Sostituisci le immagini con quelle personalizzate se esistono
          const coinWithCustomImages = coin.toObject();
          if (customImages.obverseImage) {
            coinWithCustomImages.obverse = {
              ...coinWithCustomImages.obverse,
              image: customImages.obverseImage
            };
            console.log('Using custom obverse image:', customImages.obverseImage);
          }
          if (customImages.reverseImage) {
            coinWithCustomImages.reverse = {
              ...coinWithCustomImages.reverse,
              image: customImages.reverseImage
            };
            console.log('Using custom reverse image:', customImages.reverseImage);
          }
          return res.json(coinWithCustomImages);
        }
      } catch (customError) {
        console.error('Error fetching custom images:', customError);
        // Continua con le immagini originali se c'è un errore
      }
    }

    res.json(coin);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Moneta non trovata' });
    }
    res.status(500).send('Errore del server');
  }
};

// Aggiorna le immagini personalizzate di una moneta
exports.updateCoinImages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verifica che la moneta esista
    const coin = await Coin.findById(id);
    if (!coin) {
      return res.status(404).json({ msg: 'Coin not found' });
    }

    // Trova o crea il record delle immagini personalizzate
    let customImages = await CoinCustomImage.findOne({ coinId: id, userId });
    
    if (!customImages) {
      customImages = new CoinCustomImage({ coinId: id, userId });
    }

    // Elimina le vecchie immagini se esistono e vengono sostituite
    if (req.processedImages.obverse && customImages.obverseImage) {
      deleteImage(customImages.obverseImage);
    }
    if (req.processedImages.reverse && customImages.reverseImage) {
      deleteImage(customImages.reverseImage);
    }

    // Aggiorna con le nuove immagini
    if (req.processedImages.obverse) {
      customImages.obverseImage = req.processedImages.obverse.path;
      console.log('Saved obverse image path:', req.processedImages.obverse.path);
    }
    if (req.processedImages.reverse) {
      customImages.reverseImage = req.processedImages.reverse.path;
      console.log('Saved reverse image path:', req.processedImages.reverse.path);
    }

    await customImages.save();

    // Restituisce la moneta con le immagini aggiornate
    const updatedCoin = coin.toObject();
    if (customImages.obverseImage) {
      updatedCoin.obverse = {
        ...updatedCoin.obverse,
        image: customImages.obverseImage
      };
    }
    if (customImages.reverseImage) {
      updatedCoin.reverse = {
        ...updatedCoin.reverse,
        image: customImages.reverseImage
      };
    }

    res.json({
      msg: 'Coin images updated successfully',
      coin: updatedCoin
    });
  } catch (error) {
    console.error('Error updating coin images:', error);
    res.status(500).json({ msg: 'Server error during image update' });
  }
};

// Resetta le immagini personalizzate di una moneta (torna a quelle del catalogo)
exports.resetCoinImages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verifica che la moneta esista
    const coin = await Coin.findById(id);
    if (!coin) {
      return res.status(404).json({ msg: 'Coin not found' });
    }

    // Trova il record delle immagini personalizzate
    const customImages = await CoinCustomImage.findOne({ coinId: id, userId });
    
    if (customImages) {
      // Elimina i file fisici
      if (customImages.obverseImage) {
        deleteImage(customImages.obverseImage);
        console.log('Deleted custom obverse image:', customImages.obverseImage);
      }
      if (customImages.reverseImage) {
        deleteImage(customImages.reverseImage);
        console.log('Deleted custom reverse image:', customImages.reverseImage);
      }

      // Elimina il record dal database
      await CoinCustomImage.deleteOne({ coinId: id, userId });
      console.log('Deleted custom images record for coin:', id, 'user:', userId);
    }

    // Restituisce la moneta con le immagini originali del catalogo
    res.json({
      msg: 'Coin images reset to catalog defaults successfully',
      coin: coin
    });
  } catch (error) {
    console.error('Error resetting coin images:', error);
    res.status(500).json({ msg: 'Server error during image reset' });
  }
};