const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateObjectId } = require('../middlewares/enhancedValidation');
const {
  registerIdentity,
  getMyIdentity,
  getIdentity,
  getPreKeyBundle,
  replenishPreKeys,
  getOTPKCount,
  rotateSignedPreKey,
} = require('../controllers/e2eeController');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Register / rotate own device identity + initial pre-key bundle
router.post('/identity', registerIdentity);

// Fetch own encrypted key bundle (new-device restore)
// Must come before /identity/:userId so "me" is not matched as an ObjectId
router.get('/identity/me', getMyIdentity);

// Rotate signed pre-key (run every 7 days)
// Must come before /identity/:userId so "signed-pre-key" is not matched as an ObjectId
router.put('/identity/signed-pre-key', rotateSignedPreKey);

// Fetch another user's identity public key (safety numbers)
router.get('/identity/:userId', validateObjectId('userId'), getIdentity);

// Check own OTPK count
// Must come before /pre-keys/:userId so "count" is not matched as an ObjectId
router.get('/pre-keys/count', getOTPKCount);

// Upload more OTPKs when supply runs low
// Must come before /pre-keys/:userId so "replenish" is not matched as an ObjectId
router.post('/pre-keys/replenish', replenishPreKeys);

// Fetch a user's pre-key bundle — consumes one OTPK atomically
router.get('/pre-keys/:userId', validateObjectId('userId'), getPreKeyBundle);

module.exports = router;
