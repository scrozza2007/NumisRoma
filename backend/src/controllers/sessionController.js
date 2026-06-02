const crypto = require('crypto');
const net = require('net');
const Session = require('../models/Session');
const { extractToken } = require('../middlewares/authMiddleware');
const { hashToken, SESSION_CONFIG, recordAuditEvent } = require('../utils/tokenManager');
const { resolveApproximateLocation } = require('../utils/sessionLocation');
const logger = require('../utils/logger');

// Derive a compact device fingerprint (type / OS / browser) from a User-Agent.
const detectDevice = (userAgent) => {
  const ua = userAgent.toLowerCase();
  let deviceType = 'unknown';
  let os = 'unknown';
  let browser = 'unknown';
  let deviceName = 'Unknown device';

  // Device type
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|webos/i.test(ua)) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // Operating system
  if (ua.includes('windows nt')) {
    os = 'Windows';
    if (ua.includes('windows nt 10')) os = 'Windows 10';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('windows nt 6.0')) os = 'Windows Vista';
    else if (ua.includes('windows nt 5.1')) os = 'Windows XP';
  } else if (ua.includes('mac os x')) {
    os = 'macOS';
    const macOSVersionMatch = ua.match(/mac os x (\d+_\d+)/);
    if (macOSVersionMatch) {
      const version = macOSVersionMatch[1].replace('_', '.');
      os += ` ${version}`;
    }
  } else if (ua.includes('android')) {
    os = 'Android';
    const androidVersionMatch = ua.match(/android (\d+(\.\d+)*)/);
    if (androidVersionMatch) {
      os += ` ${androidVersionMatch[1]}`;
    }
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
    const iOSVersionMatch = ua.match(/os (\d+_\d+)/);
    if (iOSVersionMatch) {
      const version = iOSVersionMatch[1].replace('_', '.');
      os += ` ${version}`;
    }
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  // Browser
  if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser = 'Opera';
  } else if (ua.includes('chrome/') && !ua.includes('chromium/')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/') && !ua.includes('chromium/')) {
    browser = 'Safari';
  } else if (ua.includes('msie ') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
  }

  // Human-readable device label for the UI
  deviceName = `${os} • ${browser}`;

  return {
    type: deviceType,
    operatingSystem: os,
    browser,
    deviceName
  };
};

const normalizeIp = (ipAddress) => {
  if (typeof ipAddress !== 'string') return 'unknown';
  const ip = ipAddress.trim();
  if (!ip) return 'unknown';
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

// Resolve the client IP through Express's trust-proxy policy. Do not read
// forwarded headers directly here: accepting an untrusted header would let a
// caller choose the address shown in their session history.
const resolveIp = (req) => {
  if (!req) return 'unknown';
  return normalizeIp(
    req.ip
    || (req.connection && req.connection.remoteAddress)
    || (req.socket && req.socket.remoteAddress)
  );
};

exports.getRequestSessionMetadata = (req) => {
  const userAgent = req?.headers?.['user-agent'] || '';
  return {
    deviceInfo: detectDevice(userAgent),
    ipAddress: resolveIp(req),
    userAgent: userAgent || null
  };
};

// Create a new session.
//
// SECURITY / RELIABILITY: this function MUST throw on persistence failure.
// Returning silently on a failed save would issue a signed JWT without a
// backing row in the `sessions` collection, causing `authMiddleware` to
// reject every subsequent request with 401. Callers (`registerUser` /
// `loginUser`) handle the thrown error by returning 500 and cleaning up
// any half-created user.
exports.createSession = async (userId, token, req) => {
  const { deviceInfo, ipAddress } = exports.getRequestSessionMetadata(req);
  const geoLocation = await resolveApproximateLocation(ipAddress);
  const now = new Date();
  const session = new Session({
    userId,
    token: hashToken(token),
    deviceInfo,
    ipAddress,
    location: geoLocation.label,
    geoLocation: { ...geoLocation, updatedAt: now },
    lastActive: now,
    idleExpiresAt: new Date(now.getTime() + SESSION_CONFIG.IDLE_TIMEOUT_MS),
    absoluteExpiresAt: new Date(now.getTime() + SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS)
  });

  try {
    await session.save();
    await recordAuditEvent({
      userId,
      sessionId: session._id,
      eventType: 'login',
      ipAddress,
      location: session.location
    });
    return session;
  } catch (error) {
    logger.error('Failed to persist session', {
      userId: String(userId),
      error: error.message
    });
    // Rethrow: auth flow must not proceed with a token that has no session.
    throw error;
  }
};

// Get all active sessions for a user. Capped at 50 by default to keep
// response size bounded for accounts with long session histories. The
// query is always sorted by most-recent activity so the current session
// appears in the first page.
const MAX_SESSIONS_RETURNED = 50;

exports.getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || MAX_SESSIONS_RETURNED, 1),
      MAX_SESSIONS_RETURNED
    );

    const sessions = await Session.find({ userId, isActive: true })
      .sort({ lastActive: -1 })
      .limit(limit)
      .lean();

    // Extract the current token from either the httpOnly cookie or the
    // Authorization header. Using the shared helper handles both sources
    // safely, including the case where the caller has no token at all.
    const { token: currentToken } = extractToken(req);
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;
    const currentIpAddress = resolveIp(req);

    const updateOperations = [];
    const sessionsWithCurrentFlag = await Promise.all(sessions.map(async (session) => {
      const isCurrentSession = currentTokenHash ? session.token === currentTokenHash : false;
      const updates = {};
      if (isCurrentSession && session.ipAddress !== currentIpAddress && shouldUseObservedIp(session.ipAddress, currentIpAddress)) {
        session.ipAddress = currentIpAddress;
        updates.ipAddress = currentIpAddress;
      }

      const geoLocation = await resolveApproximateLocation(session.ipAddress);
      if (session.location !== geoLocation.label) {
        updates.location = geoLocation.label;
      }
      if (!session.geoLocation?.source || session.location !== geoLocation.label || updates.ipAddress) {
        updates.geoLocation = { ...geoLocation, updatedAt: new Date() };
      }
      const publicId = session.publicId || crypto.randomUUID();
      if (!session.publicId) {
        updates.publicId = publicId;
      }
      if (Object.keys(updates).length > 0) {
        updateOperations.push(Session.updateOne(
          { _id: session._id, userId, isActive: true },
          { $set: updates }
        ));
      }

      return {
        id: publicId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress || 'unknown',
        location: geoLocation.label,
        geoLocation,
        riskFlags: session.risk?.flags || [],
        isActive: session.isActive,
        lastActive: session.lastActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isCurrentSession
      };
    }));

    await Promise.all(updateOperations);

    res.json({ sessions: sessionsWithCurrentFlag });
  } catch (error) {
    logger.error('Error retrieving active sessions', {
      error: error.message,
      userId: req.user?.userId
    });
    res.status(500).json({ error: 'Server error during sessions retrieval' });
  }
};

// Terminate a specific session.
// Atomic: we deactivate with a filtered `updateOne` rather than a
// read/mutate/save cycle so two concurrent terminate requests cannot race.
exports.terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Fetch token only to check the "can't terminate current session" rule.
    const session = await Session.findOne({ publicId: sessionId, userId }).select('token');
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { token: currentToken } = extractToken(req);
    if (currentToken && session.token === hashToken(currentToken)) {
      return res.status(400).json({
        error: 'Cannot terminate current session from this endpoint',
        message: 'Use the logout endpoint to end the current session'
      });
    }

    await Session.updateOne(
      { publicId: sessionId, userId },
      { $set: { isActive: false, revokedAt: new Date(), revocationReason: 'user_revoked' } }
    );
    await recordAuditEvent({ userId, sessionId: session._id, eventType: 'session_revoked', severity: 'info' });

    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    logger.error('Error terminating session', {
      error: error.message,
      userId: req.user?.userId,
      sessionId: req.params?.sessionId
    });
    res.status(500).json({ error: 'Server error during session termination' });
  }
};

// Terminate all other sessions except current one
exports.terminateAllOtherSessions = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Extract current token from cookie or Authorization header. If the
    // caller has neither (shouldn't happen — authMiddleware required it —
    // but stay defensive) we refuse rather than terminate every session.
    const { token: currentToken } = extractToken(req);
    if (!currentToken) {
      return res.status(400).json({
        error: 'Current session token not found',
        message: 'Cannot identify current session to preserve'
      });
    }

    // Find and deactivate all other active user sessions
    const result = await Session.updateMany(
      { userId, isActive: true, token: { $ne: hashToken(currentToken) } },
      { $set: { isActive: false, revokedAt: new Date(), revocationReason: 'logout_other_devices' } }
    );
    await recordAuditEvent({
      userId,
      eventType: 'logout_other_devices',
      severity: 'info',
      details: { revokedCount: result.modifiedCount }
    });

    res.json({ message: 'All other sessions have been terminated successfully' });
  } catch (error) {
    logger.error('Error terminating other sessions', {
      error: error.message,
      userId: req.user?.userId
    });
    res.status(500).json({ error: 'Server error during sessions termination' });
  }
};

// Update last activity of a session. Best-effort: never throws to the caller,
// but logs failures at debug level so Mongo connectivity issues are still
// observable in the logs.
exports.updateSessionActivity = async (userId, token) => {
  try {
    await Session.updateOne(
      { userId, token, isActive: true },
      {
        $set: {
          lastActive: new Date(),
          idleExpiresAt: new Date(Date.now() + SESSION_CONFIG.IDLE_TIMEOUT_MS)
        }
      }
    );
  } catch (error) {
    logger.debug('Failed to update session activity', {
      userId: String(userId),
      error: error.message
    });
  }
};
