/**
 * Advanced token management system for NumisRoma
 * Implements refresh tokens for enhanced security and user experience
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');
const SessionAuditEvent = require('../models/SessionAuditEvent');
const logger = require('./logger');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const durationMs = (value, fallbackMs) => {
  if (/^\d+$/.test(String(value || ''))) return Number(value);
  const match = String(value || '').match(/^(\d+)(m|h|d)$/);
  if (!match) return fallbackMs;
  const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * multipliers[match[2]];
};

/**
 * Token configuration
 */
const TOKEN_CONFIG = {
  // Access token settings
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m', // Short-lived
  ACCESS_TOKEN_SECRET: process.env.JWT_SECRET,
  
  // Refresh token settings
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d', // Long-lived
  REFRESH_TOKEN_SECRET: (() => {
    // REFRESH_TOKEN_SECRET must ALWAYS be explicitly set
    if (!process.env.REFRESH_TOKEN_SECRET) {
      const envType = process.env.NODE_ENV || 'development';
      logger.error(`CRITICAL: REFRESH_TOKEN_SECRET must be explicitly set in ${envType} environment`);
      throw new Error('REFRESH_TOKEN_SECRET must be set in environment variables. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    }
    return process.env.REFRESH_TOKEN_SECRET;
  })(),
  
  // Token rotation settings
  ROTATE_REFRESH_TOKENS: process.env.ROTATE_REFRESH_TOKENS !== 'false', // Default: true
  MAX_REFRESH_TOKENS_PER_USER: parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER) || 5,
  
  // Security settings
  TOKEN_ISSUER: process.env.TOKEN_ISSUER || 'numisroma-api',
  TOKEN_AUDIENCE: process.env.TOKEN_AUDIENCE || 'numisroma-client'
};

const SESSION_CONFIG = {
  IDLE_TIMEOUT_MS: durationMs(process.env.SESSION_IDLE_TIMEOUT || '30m', 30 * 60 * 1000),
  ABSOLUTE_TIMEOUT_MS: durationMs(process.env.SESSION_ABSOLUTE_TIMEOUT || '7d', 7 * 24 * 60 * 60 * 1000),
  REMEMBER_ME_TIMEOUT_MS: durationMs(process.env.SESSION_REMEMBER_ME_TIMEOUT || '30d', 30 * 24 * 60 * 60 * 1000)
};

const recordAuditEvent = async (event) => {
  try {
    await SessionAuditEvent.create(event);
  } catch (error) {
    logger.warn('Failed to record session audit event', { eventType: event.eventType, error: error.message });
  }
};

const riskScore = (flags) => flags.reduce((total, flag) => total + ({
  new_device: 20,
  new_country: 35,
  impossible_travel: 60,
  anonymous_network: 30,
  vpn_detected: 30,
  proxy_detected: 30,
  tor_detected: 75,
  ip_changed: 15,
  user_agent_changed: 40
}[flag] || 0), 0);

const distanceKm = (first, second) => {
  if (![first?.latitude, first?.longitude, second?.latitude, second?.longitude].every(Number.isFinite)) return 0;
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(second.latitude - first.latitude);
  const dLon = radians(second.longitude - first.longitude);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const identifyLoginRisks = async (userId, sessionMetadata) => {
  const previousSessions = await Session.find({ userId }).sort({ lastActive: -1 }).limit(10).lean();
  const flags = [];
  const geo = sessionMetadata.geoLocation || {};
  if (geo.isAnonymous) flags.push('anonymous_network');
  if (geo.isVpn) flags.push('vpn_detected');
  if (geo.isProxy) flags.push('proxy_detected');
  if (geo.isTor) flags.push('tor_detected');
  if (previousSessions.length === 0) return Array.from(new Set(flags));

  const device = sessionMetadata.deviceInfo || {};
  const knownDevice = previousSessions.some((session) =>
    session.deviceInfo?.browser === device.browser
    && session.deviceInfo?.operatingSystem === device.operatingSystem
    && session.deviceInfo?.type === device.type);
  if (!knownDevice) flags.push('new_device');

  if (geo.countryCode && previousSessions.some((session) =>
    session.geoLocation?.countryCode && session.geoLocation.countryCode !== geo.countryCode)) {
    flags.push('new_country');
  }

  const latestWithGeo = previousSessions.find((session) =>
    Number.isFinite(session.geoLocation?.latitude) && Number.isFinite(session.geoLocation?.longitude));
  if (latestWithGeo && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude)) {
    const hours = Math.max((Date.now() - new Date(latestWithGeo.lastActive).getTime()) / 3600000, 0.01);
    if (hours < 24 && distanceKm(latestWithGeo.geoLocation, geo) / hours > 900) flags.push('impossible_travel');
  }
  return Array.from(new Set(flags));
};

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
  try {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      iss: TOKEN_CONFIG.TOKEN_ISSUER,
      aud: TOKEN_CONFIG.TOKEN_AUDIENCE
    };

    return jwt.sign(tokenPayload, TOKEN_CONFIG.ACCESS_TOKEN_SECRET, {
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY
    });
  } catch (error) {
    logger.error('Failed to generate access token', { error: error.message, payload });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload, expiresIn = TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY) => {
  try {
    const tokenPayload = {
      ...payload,
      type: 'refresh',
      jti: crypto.randomUUID(), // Unique token ID for tracking
      iat: Math.floor(Date.now() / 1000),
      iss: TOKEN_CONFIG.TOKEN_ISSUER,
      aud: TOKEN_CONFIG.TOKEN_AUDIENCE
    };

    return jwt.sign(tokenPayload, TOKEN_CONFIG.REFRESH_TOKEN_SECRET, {
      expiresIn
    });
  } catch (error) {
    logger.error('Failed to generate refresh token', { error: error.message, payload });
    throw new Error('Refresh token generation failed');
  }
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.ACCESS_TOKEN_SECRET, {
      issuer: TOKEN_CONFIG.TOKEN_ISSUER,
      audience: TOKEN_CONFIG.TOKEN_AUDIENCE
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    logger.security.authFailure('Access token verification failed', { 
      error: error.message,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
    });
    throw error;
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.REFRESH_TOKEN_SECRET, {
      issuer: TOKEN_CONFIG.TOKEN_ISSUER,
      audience: TOKEN_CONFIG.TOKEN_AUDIENCE
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    logger.security.authFailure('Refresh token verification failed', { 
      error: error.message,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
    });
    throw error;
  }
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = async (userId, additionalPayload = {}) => {
  try {
    const { sessionMetadata = {}, rememberMe = false, ...tokenClaims } = additionalPayload;
    const sessionFamilyId = crypto.randomUUID();
    const absoluteTimeout = rememberMe ? SESSION_CONFIG.REMEMBER_ME_TIMEOUT_MS : SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS;
    const absoluteExpiresAt = new Date(Date.now() + absoluteTimeout);
    const refreshExpiry = rememberMe ? '30d' : TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY;
    const flags = await identifyLoginRisks(userId, sessionMetadata);
    const basePayload = {
      userId,
      sessionFamilyId,
      ...tokenClaims
    };

    const accessToken = generateAccessToken(basePayload);
    const refreshToken = generateRefreshToken(basePayload, refreshExpiry);

    // Store refresh token in database
    const refreshTokenDecoded = verifyRefreshToken(refreshToken);
    
    // Clean up old refresh tokens if limit exceeded
    await cleanupOldRefreshTokens(userId);

    // Create session — store hashes only, never plaintext tokens
    const session = new Session({
      userId,
      token: hashToken(accessToken),
      refreshToken: hashToken(refreshToken),
      refreshTokenId: refreshTokenDecoded.jti,
      sessionFamilyId,
      rememberMe: Boolean(rememberMe),
      isActive: true,
      lastActive: new Date(),
      expiresAt: absoluteExpiresAt,
      absoluteExpiresAt,
      idleExpiresAt: new Date(Date.now() + SESSION_CONFIG.IDLE_TIMEOUT_MS),
      deviceInfo: sessionMetadata.deviceInfo,
      ipAddress: sessionMetadata.ipAddress,
      location: sessionMetadata.geoLocation?.label || 'Unknown',
      geoLocation: sessionMetadata.geoLocation
        ? { ...sessionMetadata.geoLocation, updatedAt: new Date() }
        : undefined,
      risk: {
        score: riskScore(flags),
        flags
      },
      metadata: {
        tokenType: 'jwt_with_refresh',
        userAgent: sessionMetadata.userAgent || null,
        ipAddress: sessionMetadata.ipAddress || null,
        loginMethod: sessionMetadata.loginMethod || 'password'
      }
    });

    await session.save();
    await recordAuditEvent({
      userId,
      sessionId: session._id,
      eventType: flags.length ? 'suspicious_login' : 'login',
      severity: flags.length ? 'warning' : 'info',
      ipAddress: session.ipAddress,
      userAgent: session.metadata?.userAgent,
      location: session.location,
      riskFlags: flags
    });

    logger.info('Token pair generated', {
      userId,
      sessionId: session._id,
      refreshTokenId: refreshTokenDecoded.jti
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session._id,
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      rememberMe: Boolean(rememberMe),
      riskFlags: flags,
      location: session.location,
      deviceInfo: session.deviceInfo
    };
  } catch (error) {
    logger.error('Failed to generate token pair', { 
      error: error.message, 
      userId 
    });
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken, additionalPayload = {}) => {
  try {
    const { sessionMetadata = {}, ...tokenClaims } = additionalPayload;
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find session with this refresh token
    const session = await Session.findOne({
      refreshTokenId: decoded.jti,
      isActive: true
    });

    if (!session) {
      if (decoded.sessionFamilyId) {
        const reusedSession = await Session.findOne({
          sessionFamilyId: decoded.sessionFamilyId,
          previousRefreshTokenHashes: hashToken(refreshToken)
        });
        if (reusedSession) {
          await Session.updateMany(
            { sessionFamilyId: decoded.sessionFamilyId, isActive: true },
            { $set: { isActive: false, revokedAt: new Date(), revocationReason: 'refresh_token_reuse' } }
          );
          await recordAuditEvent({
            userId: decoded.userId,
            sessionId: reusedSession._id,
            eventType: 'refresh_token_reuse',
            severity: 'critical',
            riskFlags: ['refresh_token_reuse']
          });
          const reuseError = new Error('Refresh token reuse detected');
          reuseError.code = 'REFRESH_TOKEN_REUSED';
          throw reuseError;
        }
      }
      logger.security.authFailure('Refresh token session not found', {
        refreshTokenId: decoded.jti,
        userId: decoded.userId
      });
      throw new Error('Invalid refresh token session');
    }

    // Check if session is expired
    const now = new Date();
    if ((session.absoluteExpiresAt || session.expiresAt) < now || (session.idleExpiresAt && session.idleExpiresAt < now)) {
      logger.security.authFailure('Refresh token session expired', {
        sessionId: session._id,
        userId: decoded.userId,
        expiredAt: session.expiresAt
      });
      
      // Clean up expired session
      await Session.findByIdAndUpdate(session._id, {
        isActive: false,
        revokedAt: now,
        revocationReason: 'expired'
      });
      await recordAuditEvent({ userId: decoded.userId, sessionId: session._id, eventType: 'expired', severity: 'info' });
      throw new Error('Refresh token expired');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      ...tokenClaims
    });

    let newRefreshToken = refreshToken; // Keep same refresh token by default

    if (TOKEN_CONFIG.ROTATE_REFRESH_TOKENS) {
      const refreshPayload = {
        userId: decoded.userId,
        sessionFamilyId: session.sessionFamilyId || decoded.sessionFamilyId || crypto.randomUUID(),
        ...tokenClaims
      };

      newRefreshToken = generateRefreshToken(refreshPayload, session.rememberMe ? '30d' : TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY);
      const newRefreshDecoded = jwt.decode(newRefreshToken);

      session.sessionFamilyId = refreshPayload.sessionFamilyId;
      session.previousRefreshTokenHashes = [...(session.previousRefreshTokenHashes || []), session.refreshToken].slice(-10);
      session.refreshToken = hashToken(newRefreshToken);
      session.refreshTokenId = newRefreshDecoded.jti;
    }

    session.token = hashToken(newAccessToken);
    session.lastActive = now;
    session.idleExpiresAt = new Date(now.getTime() + SESSION_CONFIG.IDLE_TIMEOUT_MS);
    const refreshRiskFlags = [];
    if (sessionMetadata.ipAddress) {
      if (session.ipAddress && session.ipAddress !== sessionMetadata.ipAddress) refreshRiskFlags.push('ip_changed');
      session.ipAddress = sessionMetadata.ipAddress;
      session.metadata = session.metadata || {};
      session.metadata.ipAddress = sessionMetadata.ipAddress;
    }
    if (sessionMetadata.userAgent) {
      if (session.metadata?.userAgent && session.metadata.userAgent !== sessionMetadata.userAgent) {
        refreshRiskFlags.push('user_agent_changed');
      }
      session.metadata = session.metadata || {};
      session.metadata.userAgent = sessionMetadata.userAgent;
    }
    if (sessionMetadata.geoLocation) {
      session.location = sessionMetadata.geoLocation.label;
      session.geoLocation = { ...sessionMetadata.geoLocation, updatedAt: now };
    }
    if (refreshRiskFlags.length) {
      session.risk = session.risk || { flags: [], score: 0 };
      session.risk.flags = Array.from(new Set([...(session.risk.flags || []), ...refreshRiskFlags]));
      session.risk.score = riskScore(session.risk.flags);
    }
    await session.save();
    await recordAuditEvent({
      userId: decoded.userId,
      sessionId: session._id,
      eventType: refreshRiskFlags.length ? 'session_changed' : 'refreshed',
      severity: refreshRiskFlags.length ? 'warning' : 'info',
      ipAddress: session.ipAddress,
      userAgent: session.metadata?.userAgent,
      location: session.location,
      riskFlags: refreshRiskFlags
    });

    logger.info('Access token refreshed', {
      userId: decoded.userId,
      sessionId: session._id,
      rotatedRefresh: TOKEN_CONFIG.ROTATE_REFRESH_TOKENS
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: session._id,
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      rememberMe: session.rememberMe
    };
  } catch (error) {
    logger.error('Failed to refresh access token', { error: error.message });
    throw error;
  }
};

/**
 * Revoke refresh token
 */
const revokeRefreshToken = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    const session = await Session.findOneAndUpdate(
      { refreshTokenId: decoded.jti, isActive: true },
      { isActive: false, revokedAt: new Date(), revocationReason: 'logout' }
    );

    if (session) {
      logger.info('Refresh token revoked', {
        userId: decoded.userId,
        sessionId: session._id,
        refreshTokenId: decoded.jti
      });
      await recordAuditEvent({ userId: decoded.userId, sessionId: session._id, eventType: 'logout', severity: 'info' });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to revoke refresh token', { error: error.message });
    return false;
  }
};

/**
 * Revoke all refresh tokens for a user
 */
const revokeAllRefreshTokens = async (userId) => {
  try {
    const result = await Session.updateMany(
      { userId, isActive: true },
      { isActive: false, revokedAt: new Date(), revocationReason: 'logout_all' }
    );

    logger.info('All refresh tokens revoked for user', {
      userId,
      revokedCount: result.modifiedCount
    });
    await recordAuditEvent({ userId, eventType: 'logout_all', severity: 'info', details: { revokedCount: result.modifiedCount } });

    return result.modifiedCount;
  } catch (error) {
    logger.error('Failed to revoke all refresh tokens', { error: error.message, userId });
    throw error;
  }
};

/**
 * Clean up old refresh tokens for a user (keep only the most recent ones)
 */
const cleanupOldRefreshTokens = async (userId) => {
  try {
    const sessions = await Session.find({ 
      userId, 
      isActive: true 
    }).sort({ lastActive: -1 });

    if (sessions.length > TOKEN_CONFIG.MAX_REFRESH_TOKENS_PER_USER) {
      const sessionsToDeactivate = sessions.slice(TOKEN_CONFIG.MAX_REFRESH_TOKENS_PER_USER);
      
      const sessionIds = sessionsToDeactivate.map(s => s._id);
      
      await Session.updateMany(
        { _id: { $in: sessionIds } },
        { isActive: false, revokedAt: new Date() }
      );

      logger.info('Old refresh tokens cleaned up', {
        userId,
        cleanedCount: sessionIds.length,
        remainingCount: TOKEN_CONFIG.MAX_REFRESH_TOKENS_PER_USER
      });
    }
  } catch (error) {
    logger.error('Failed to cleanup old refresh tokens', { error: error.message, userId });
  }
};

/**
 * Get token information
 */
const getTokenInfo = (token, type = 'access') => {
  try {
    const secret = type === 'access' ? TOKEN_CONFIG.ACCESS_TOKEN_SECRET : TOKEN_CONFIG.REFRESH_TOKEN_SECRET;
    const decoded = jwt.verify(token, secret, { ignoreExpiration: true });
    
    return {
      userId: decoded.userId,
      type: decoded.type,
      issued: new Date(decoded.iat * 1000),
      expires: new Date(decoded.exp * 1000),
      isExpired: decoded.exp < (Date.now() / 1000),
      jti: decoded.jti || null
    };
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupOldRefreshTokens,
  getTokenInfo,
  hashToken,
  TOKEN_CONFIG,
  SESSION_CONFIG,
  recordAuditEvent
};
