const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { param, validationResult } = require('express-validator');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// All routes require authentication.
router.use(authMiddleware);

// List all active sessions for the current user.
router.get('/', sessionController.getActiveSessions);

// Terminate all sessions except the current one.
// NOTE: must be registered BEFORE /:sessionId so that "DELETE /" resolves
// here rather than being matched as an empty param.
router.delete('/', sessionController.terminateAllOtherSessions);

// Terminate a specific session by non-sensitive public identifier.
router.delete(
  '/:sessionId',
  param('sessionId').isUUID().withMessage('Invalid session identifier'),
  (req, res, next) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Invalid session identifier' });
    return next();
  },
  sessionController.terminateSession
);

module.exports = router;
