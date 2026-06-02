const jwt = require('jsonwebtoken');
const net = require('net');
const Session = require('../models/Session');
const logger = require('../utils/logger');
const { hashToken, SESSION_CONFIG, recordAuditEvent } = require('../utils/tokenManager');

const normalizeIp = (ipAddress) => {
  if (typeof ipAddress !== 'string' || !ipAddress.trim()) return null;
  const ip = ipAddress.trim();
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
};

const isPrivateIpv4 = (ipAddress) => {
  const octets = ipAddress.split('.').map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet))) return false;
  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

const isPublicIp = (ipAddress) => {
  if (!ipAddress || ipAddress === 'unknown') return false;
  if (net.isIPv4(ipAddress)) return !isPrivateIpv4(ipAddress);
  if (net.isIPv6(ipAddress)) {
    if (ipAddress === '::1') return false;
    return !(/^f[cd]/i.test(ipAddress) || /^fe[89ab]/i.test(ipAddress));
  }
  return false;
};

const shouldUseObservedIp = (storedIpAddress, observedIpAddress) => {
  if (!observedIpAddress || observedIpAddress === 'unknown') return false;
  if (!storedIpAddress || storedIpAddress === 'unknown') return true;
  if (isPublicIp(observedIpAddress)) return true;
  return !isPublicIp(storedIpAddress);
};

/**
 * Extract the JWT from the request.
 *
 * Precedence:
 *   1. httpOnly cookie `token` — preferred for browser clients (XSS-resistant).
 *   2. `Authorization: Bearer <token>` header — for non-browser clients that
 *      cannot rely on cookies.
 *
 * Records which source the token came from on the request, so downstream
 * middleware (e.g. CSRF) can decide whether to apply cookie-specific protections.
 */
const extractToken = (req) => {
  // 1. Prefer httpOnly cookie when cookie-parser is mounted
  if (req.cookies && typeof req.cookies.token === 'string' && req.cookies.token.length > 0) {
    return { token: req.cookies.token, source: 'cookie' };
  }

  // 2. Fallback: Authorization header
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      return { token, source: 'header' };
    }
  }

  return { token: null, source: null };
};

const authMiddleware = async (req, res, next) => {
  const { token, source } = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Missing token, access denied',
      message: 'Missing token, access denied',
      msg: 'Missing token, access denied'
    });
  }

  try {
    // Pin to HS256 to prevent algorithm-confusion attacks where a crafted
    // JWT header asks for `none` or RS256-with-public-key-as-HMAC-secret.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    // Lookup by hash — the DB stores SHA-256(token), never the plaintext
    const session = await Session.findOne({ token: hashToken(token), isActive: true });

    if (!session) {
      return res.status(401).json({
        error: 'Session terminated',
        message: 'Session terminated',
        msg: 'Session terminated',
        code: 'SESSION_TERMINATED',
        sessionTerminated: true
      });
    }

    const now = new Date();
    const sessionDeadline = session.absoluteExpiresAt || session.expiresAt;
    if ((sessionDeadline && sessionDeadline <= now) || (session.idleExpiresAt && session.idleExpiresAt <= now)) {
      await Session.updateOne(
        { _id: session._id, isActive: true },
        { $set: { isActive: false, revokedAt: now, revocationReason: 'expired' } }
      );
      await recordAuditEvent({
        userId: session.userId,
        sessionId: session._id,
        eventType: 'expired',
        severity: 'info'
      });
      return res.status(401).json({
        error: 'Session expired',
        message: 'Session expired',
        msg: 'Session expired',
        code: 'SESSION_EXPIRED',
        sessionTerminated: true
      });
    }

    const observedIp = normalizeIp(req.ip);
    const observedUserAgent = req.get('User-Agent') || null;
    const shouldPersistObservedIp = shouldUseObservedIp(session.ipAddress, observedIp);
    const changeFlags = [];
    if (shouldPersistObservedIp && observedIp && session.ipAddress && observedIp !== session.ipAddress) changeFlags.push('ip_changed');
    if (observedUserAgent && session.metadata?.userAgent && observedUserAgent !== session.metadata.userAgent) {
      changeFlags.push('user_agent_changed');
    }
    if (changeFlags.length) {
      await Session.updateOne(
        { _id: session._id, isActive: true },
        {
          $set: {
            ...(shouldPersistObservedIp && observedIp && { ipAddress: observedIp, 'metadata.ipAddress': observedIp }),
            ...(observedUserAgent && { 'metadata.userAgent': observedUserAgent })
          },
          $addToSet: { 'risk.flags': { $each: changeFlags } }
        }
      );
      await recordAuditEvent({
        userId: session.userId,
        sessionId: session._id,
        eventType: 'session_changed',
        severity: 'warning',
        ipAddress: observedIp,
        userAgent: observedUserAgent,
        riskFlags: changeFlags
      });
    }

    // Update session last activity with throttling to reduce DB load
    // Only update if last update was more than 1 minute ago
    const lastUpdateThreshold = new Date(now.getTime() - 60000); // 1 minute

    if (session.lastActive < lastUpdateThreshold) {
      // Fire-and-forget update with condition to prevent race conditions
      Session.updateOne(
        {
          _id: session._id,
          isActive: true,
          lastActive: { $lt: lastUpdateThreshold }
        },
        { $set: { lastActive: now, idleExpiresAt: new Date(now.getTime() + SESSION_CONFIG.IDLE_TIMEOUT_MS) } }
      ).exec().catch(err =>
        logger.error('Failed to update session lastActive', {
          sessionId: session._id,
          error: err.message
        })
      );
    }

    // Set userId in the request for controllers
    req.user = {
      userId: decoded.userId,
      _id: decoded.userId,
      sessionId: session._id
    };

    // Record auth source so other middleware (CSRF) can act accordingly
    req.authSource = source;

    next();
  } catch (err) {
    logger.security.authFailure('JWT verification failed', { error: err.message, source });
    res.status(401).json({
      error: 'Invalid token, access denied',
      message: 'Invalid token, access denied',
      msg: 'Invalid token, access denied'
    });
  }
};

module.exports = authMiddleware;
module.exports.extractToken = extractToken;
