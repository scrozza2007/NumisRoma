const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateObjectId } = require('../middlewares/enhancedValidation');
const {
  getWishlist,
  createWishlistEntry,
  updateWishlistEntry,
  deleteWishlistEntry,
  markWishlistAcquired,
  convertWishlistToCoin
} = require('../controllers/wishlistController');

const router = express.Router();

const validators = [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('status').optional().isIn(['Wanted', 'Watching', 'Acquired', 'Archived'])
];

router.use(authMiddleware);
router.get('/', getWishlist);
router.post('/', [body('name').trim().notEmpty().isLength({ max: 200 }), ...validators], createWishlistEntry);
router.put('/:entryId', validateObjectId('entryId'), validators, updateWishlistEntry);
router.delete('/:entryId', validateObjectId('entryId'), deleteWishlistEntry);
router.post('/:entryId/acquired', validateObjectId('entryId'), markWishlistAcquired);
router.post('/:entryId/convert', validateObjectId('entryId'), convertWishlistToCoin);

module.exports = router;
