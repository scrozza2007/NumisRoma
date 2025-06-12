const express = require('express');
const { body } = require('express-validator');
const { 
  createCollection, 
  addCoinToCollection,
  getMyCollections, 
  getPublicCollections,
  removeCoinFromCollection,
  updateCoinInCollection,
  getCollectionById,
  getUserCollections,
  deleteCollection,
  updateCollection
} = require('../controllers/collectionController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');

const router = express.Router();

// Crea una nuova collezione personale
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Il nome della collezione è obbligatorio'),
    body('description').optional(),
    body('image').optional().custom((value) => {
      if (value && value.trim() !== '') {
        // Se c'è un valore, deve essere un URL valido
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('L\'immagine deve essere un URL valido');
        }
      }
      return true;
    }),
    body('isPublic').optional().isBoolean()
  ],
  createCollection
);

// Ritorna tutte le collezioni personali dell'utente loggato
router.get('/', authMiddleware, getMyCollections);

// Ritorna tutte le collezioni pubbliche (nessuna autenticazione richiesta)
router.get('/public', getPublicCollections);

// Ritorna collezioni di un utente specifico
router.get('/user/:userId', optionalAuthMiddleware, getUserCollections);

// Ritorna una collezione specifica per ID
router.get('/:collectionId', optionalAuthMiddleware, getCollectionById);

// Aggiorna una collezione
router.put(
  '/:collectionId',
  authMiddleware,
  [
    body('name').optional().notEmpty().withMessage('Il nome della collezione non può essere vuoto'),
    body('description').optional(),
    body('image').optional().custom((value) => {
      if (value && value.trim() !== '') {
        // Se c'è un valore, deve essere un URL valido
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('L\'immagine deve essere un URL valido');
        }
      }
      return true;
    }),
    body('isPublic').optional().isBoolean()
  ],
  updateCollection
);

// Elimina una collezione
router.delete('/:collectionId', authMiddleware, deleteCollection);

// Aggiunge una moneta a una collezione personale
router.post(
  '/:collectionId/coins',
  authMiddleware,
  [
    body('coin').notEmpty().withMessage('ID della moneta obbligatorio')
  ],
  addCoinToCollection
);

// Aggiorna dati personalizzati della moneta nella collezione
router.put('/:collectionId/coins/:coinId', authMiddleware, updateCoinInCollection);

// Rimuove una moneta da una collezione
router.delete('/:collectionId/coins/:coinId', authMiddleware, removeCoinFromCollection);

// DEBUG: Endpoint temporaneo per debugging - rimuovere in produzione
router.get('/debug/:collectionId', authMiddleware, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const Collection = require('../models/Collection');
    
    console.log('DEBUG - richiesta per collezione:', collectionId);
    console.log('DEBUG - utente autenticato:', req.user ? req.user.userId : 'nessuno');
    
    const collection = await Collection.findById(collectionId)
      .populate('coins.coin')
      .populate('user', 'username avatar');

    if (!collection) {
      return res.status(404).json({ msg: 'Collezione non trovata' });
    }

    const debugInfo = {
      collection: {
        id: collection._id.toString(),
        name: collection.name,
        isPublic: collection.isPublic,
        ownerId: collection.user._id.toString(),
        ownerUsername: collection.user.username
      },
      requestUser: req.user ? {
        userId: req.user.userId,
        userIdType: typeof req.user.userId
      } : null,
      comparison: req.user ? {
        ownerId: collection.user._id.toString(),
        requestUserId: req.user.userId,
        areEqual: collection.user._id.toString() === req.user.userId,
        ownerIdType: typeof collection.user._id.toString(),
        requestUserIdType: typeof req.user.userId
      } : null
    };

    console.log('DEBUG - info completa:', JSON.stringify(debugInfo, null, 2));
    
    // Testiamo anche getMyCollections
    const myCollections = await Collection.find({ user: req.user.userId })
      .populate('coins.coin')
      .sort({ createdAt: -1 });
    
    console.log('DEBUG - collezioni personali trovate:', myCollections.length);
    myCollections.forEach(col => {
      console.log(`  - ${col.name} (isPublic: ${col.isPublic}, owner: ${col.user})`);
    });
    
    debugInfo.myCollections = {
      count: myCollections.length,
      collections: myCollections.map(col => ({
        id: col._id.toString(),
        name: col.name,
        isPublic: col.isPublic,
        owner: col.user.toString()
      }))
    };
    
    res.json(debugInfo);
  } catch (err) {
    console.error('DEBUG - errore:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;