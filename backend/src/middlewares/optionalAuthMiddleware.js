const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const { extractToken } = require('./authMiddleware');
const { hashToken, SESSION_CONFIG } = require('../utils/tokenManager');
const logger = require('../utils/logger');

/**
 * Like `authMiddleware`, but never blocks the request. If a valid token is
 * present (via httpOnly cookie or Authorization header), populates `req.user`;
 * otherwise proceeds as an anonymous request.
 */
const optionalAuthMiddleware = async (req, res, next) => {
  const { token, source } = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    // Pinned to HS256 — see authMiddleware for rationale.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    const session = await Session.findOne({ token: hashToken(token), isActive: true });
    if (!session) {
      return next();
    }

    // Throttled activity update. Use a conditional updateOne (race-safe) and
    // log failures rather than swallowing them silently.
    const now = new Date();
    const sessionDeadline = session.absoluteExpiresAt || session.expiresAt;
    if ((sessionDeadline && sessionDeadline <= now) || (session.idleExpiresAt && session.idleExpiresAt <= now)) {
      await Session.updateOne(
        { _id: session._id, isActive: true },
        { $set: { isActive: false, revokedAt: now, revocationReason: 'expired' } }
      );
      return next();
    }
    const lastUpdateThreshold = new Date(now.getTime() - 60000);
    if (session.lastActive < lastUpdateThreshold) {
      Session.updateOne(
        {
          _id: session._id,
          isActive: true,
          lastActive: { $lt: lastUpdateThreshold }
        },
        { $set: { lastActive: now, idleExpiresAt: new Date(now.getTime() + SESSION_CONFIG.IDLE_TIMEOUT_MS) } }
      ).exec().catch(err =>
        logger.debug('Optional-auth session touch failed', {
          sessionId: session._id,
          error: err.message
        })
      );
    }

    req.user = {
      userId: decoded.userId,
      _id: decoded.userId,
      sessionId: session._id
    };
    req.authSource = source;

    next();
  } catch (err) {
    // Invalid token -> continue as anonymous
    next();
  }
};

module.exports = optionalAuthMiddleware;
