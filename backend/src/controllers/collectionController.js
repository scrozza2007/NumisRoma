const Collection = require('../models/Collection');
const { validationResult } = require('express-validator');

// Crea una nuova collezione
exports.createCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, image, isPublic } = req.body;

    console.log('createCollection - dati ricevuti:', {
      name,
      description,
      image,
      isPublic,
      userId: req.user.userId
    });

    const collection = new Collection({
      user: req.user.userId, // preso dal middleware JWT
      name,
      description,
      image,
      isPublic
    });

    await collection.save();
    
    console.log('createCollection - collezione salvata:', {
      id: collection._id,
      user: collection.user,
      name: collection.name,
      isPublic: collection.isPublic
    });

    res.status(201).json(collection);
  } catch (error) {
    console.error('Errore in createCollection:', error.message);
      res.status(500).send('Errore del server');
    }
};

// Ritorna tutte le collezioni personali dell'utente autenticato
exports.getMyCollections = async (req, res) => {
  try {
    console.log('getMyCollections - INIZIO');
    console.log('getMyCollections - req.user:', req.user);
    console.log('getMyCollections - userId:', req.user ? req.user.userId : 'NESSUNO');
    
    if (!req.user || !req.user.userId) {
      console.log('getMyCollections - ERRORE: nessun utente autenticato');
      return res.status(401).json({ msg: 'Utente non autenticato' });
    }
    
    const collections = await Collection.find({ user: req.user.userId })
      .populate('coins.coin')
      .sort({ createdAt: -1 });

    console.log('getMyCollections - trovate', collections.length, 'collezioni per utente', req.user.userId);
    collections.forEach(col => {
      console.log(`  - ${col.name} (isPublic: ${col.isPublic}, owner: ${col.user})`);
    });

    res.json(collections);
  } catch (err) {
    console.error('Errore in getMyCollections:', err.message);
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

// Ritorna collezioni di un utente specifico
exports.getUserCollections = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('getUserCollections - INIZIO');
    console.log('getUserCollections - userId richiesto:', userId);
    console.log('getUserCollections - utente autenticato:', req.user ? req.user.userId : 'nessuno');
    
    // Se l'utente richiede le proprie collezioni, mostra tutte
    // Altrimenti mostra solo quelle pubbliche
    const filter = req.user && req.user.userId === userId 
      ? { user: userId }
      : { user: userId, isPublic: true };

    console.log('getUserCollections - filtro applicato:', filter);
    console.log('getUserCollections - è il proprietario?', req.user && req.user.userId === userId);

    const collections = await Collection.find(filter)
      .populate('coins.coin')
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });

    console.log('getUserCollections - trovate', collections.length, 'collezioni');
    collections.forEach(col => {
      console.log(`  - ${col.name} (isPublic: ${col.isPublic})`);
    });

    res.json(collections);
  } catch (err) {
    console.error('Errore in getUserCollections:', err.message);
    res.status(500).send('Errore del server');
  }
};

// Ritorna una collezione specifica per ID
exports.getCollectionById = async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    console.log('getCollectionById - richiesta per collezione:', collectionId);
    console.log('getCollectionById - utente autenticato:', req.user ? req.user.userId : 'nessuno');
    
    const collection = await Collection.findById(collectionId)
      .populate('coins.coin')
      .populate('user', 'username avatar');

    if (!collection) {
      console.log('getCollectionById - collezione non trovata');
      return res.status(404).json({ msg: 'Collezione non trovata' });
    }

    console.log('getCollectionById - collezione trovata:', {
      id: collection._id,
      name: collection.name,
      isPublic: collection.isPublic,
      owner: collection.user._id.toString()
    });

    // Se la collezione non è pubblica, verifica che sia del proprietario
    if (!collection.isPublic) {
      console.log('getCollectionById - collezione privata, verifico proprietario');
      
      if (!req.user) {
        console.log('getCollectionById - nessun utente autenticato');
        return res.status(403).json({ msg: 'Non autorizzato a visualizzare questa collezione' });
      }
      
      console.log('getCollectionById - confronto IDs:', {
        collectionOwner: collection.user._id.toString(),
        requestUser: req.user.userId,
        areEqual: collection.user._id.toString() === req.user.userId
      });
      
      if (collection.user._id.toString() !== req.user.userId) {
        console.log('getCollectionById - utente non è il proprietario');
        return res.status(403).json({ msg: 'Non autorizzato a visualizzare questa collezione' });
      }
      
      console.log('getCollectionById - utente verificato come proprietario');
    } else {
      console.log('getCollectionById - collezione pubblica, accesso consentito');
    }

    res.json(collection);
  } catch (err) {
    console.error('Errore in getCollectionById:', err.message);
    res.status(500).send('Errore del server');
  }
};

// Aggiorna una collezione
exports.updateCollection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { collectionId } = req.params;
    const { name, description, image, isPublic } = req.body;

    const collection = await Collection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({ msg: 'Collezione non trovata' });
    }

    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Non autorizzato' });
    }

    // Aggiorna i campi forniti
    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (image !== undefined) collection.image = image;
    if (isPublic !== undefined) collection.isPublic = isPublic;

    await collection.save();

    res.json(collection);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};

// Elimina una collezione
exports.deleteCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collection = await Collection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({ msg: 'Collezione non trovata' });
    }

    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Non autorizzato' });
    }

    await Collection.findByIdAndDelete(collectionId);

    res.json({ msg: 'Collezione eliminata con successo' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Errore del server');
  }
};

// Aggiunge una moneta a una collezione
exports.addCoinToCollection = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errori di validazione:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { collectionId } = req.params;
    const { coin, weight, diameter, grade, notes } = req.body;
  
    console.log('Tentativo di aggiungere moneta:', {
      collectionId,
      coin,
      weight,
      diameter,
      grade,
      notes,
      userId: req.user.userId
    });

    try {
      const collection = await Collection.findById(collectionId);
  
      if (!collection) {
        console.log('Collezione non trovata:', collectionId);
        return res.status(404).json({ msg: 'Collezione non trovata' });
      }

      console.log('Collezione trovata:', {
        id: collection._id,
        name: collection.name,
        owner: collection.user.toString(),
        requestUser: req.user.userId
      });
  
      // Verifica che sia del proprietario
      if (collection.user.toString() !== req.user.userId) {
        console.log('Utente non autorizzato:', {
          collectionOwner: collection.user.toString(),
          requestUser: req.user.userId
        });
        return res.status(403).json({ msg: 'Non autorizzato' });
      }

      // Verifica che la moneta esista
      const Coin = require('../models/Coin');
      const coinExists = await Coin.findById(coin);
      if (!coinExists) {
        console.log('Moneta non trovata:', coin);
        return res.status(404).json({ msg: 'Moneta non trovata' });
      }

      console.log('Moneta trovata:', coinExists.name);
  
      // Aggiunta moneta
      collection.coins.push({ coin, weight, diameter, grade, notes });
      await collection.save();

      console.log('Moneta aggiunta con successo alla collezione');
  
      res.status(200).json(collection);
    } catch (error) {
      console.error('Errore nell\'aggiunta moneta:', error.message);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ msg: 'Errore del server', error: error.message });
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