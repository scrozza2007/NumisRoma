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