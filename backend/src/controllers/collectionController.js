const Collection = require('../models/Collection');
const { validationResult } = require('express-validator');

// Crea una nuova collezione
exports.createCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, isPublic } = req.body;

    const collection = new Collection({
      user: req.user.userId, // preso dal middleware JWT
      name,
      description,
      isPublic
    });

    await collection.save();

    res.status(201).json(collection);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};

// Aggiunge una moneta a una collezione
exports.addCoinToCollection = async (req, res) => {
    const { collectionId } = req.params;
    const { coin, weight, diameter, grade, notes } = req.body;
  
    try {
      const collection = await Collection.findById(collectionId);
  
      if (!collection) {
        return res.status(404).json({ msg: 'Collezione non trovata' });
      }
  
      // Verifica che sia del proprietario
      if (collection.user.toString() !== req.user.userId) {
        return res.status(403).json({ msg: 'Non autorizzato' });
      }
  
      // Aggiunta moneta
      collection.coins.push({ coin, weight, diameter, grade, notes });
      await collection.save();
  
      res.status(200).json(collection);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Errore del server');
    }
};

// Ritorna tutte le collezioni personali dell'utente autenticato
exports.getMyCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user.userId })
      .populate('coins.coin')
      .sort({ createdAt: -1 });

    res.json(collections);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore del server');
  }
};

// Ritorna tutte le collezioni pubbliche di tutti gli utenti
exports.getPublicCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ isPublic: true })
      .populate('coins.coin')
      .populate('user', 'username') // così mostriamo chi è il proprietario
      .sort({ createdAt: -1 });

    res.json(collections);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore del server');
  }
};

// Rimuove una moneta da una collezione
exports.removeCoinFromCollection = async (req, res) => {
  const { collectionId, coinId } = req.params;

  try {
    const collection = await Collection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({ msg: 'Collezione non trovata' });
    }

    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Non autorizzato' });
    }

    // Rimuove la moneta con quell'ID
    collection.coins = collection.coins.filter(
      (c) => c.coin.toString() !== coinId
    );

    await collection.save();
    res.status(200).json(collection);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};

// Aggiorna dati di una moneta nella collezione
exports.updateCoinInCollection = async (req, res) => {
  const { collectionId, coinId } = req.params;
  const { weight, diameter, grade, notes } = req.body;

  try {
    const collection = await Collection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({ msg: 'Collezione non trovata' });
    }

    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Non autorizzato' });
    }

    // Cerca la moneta nella collezione
    const coinEntry = collection.coins.find(
      (c) => c.coin.toString() === coinId
    );

    if (!coinEntry) {
      return res.status(404).json({ msg: 'Moneta non trovata nella collezione' });
    }

    // Aggiorna i dati
    if (weight !== undefined) coinEntry.weight = weight;
    if (diameter !== undefined) coinEntry.diameter = diameter;
    if (grade !== undefined) coinEntry.grade = grade;
    if (notes !== undefined) coinEntry.notes = notes;

    await collection.save();
    res.status(200).json(collection);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};