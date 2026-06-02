const Session = require('../../src/models/Session');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  hashToken,
} = require('../../src/utils/tokenManager');

const makeUser = async (suffix = '') => User.create({
  username: `tkusr${suffix}`.slice(0, 20),
  email: `tkusr${suffix}@example.com`,
  password: await bcrypt.hash('TestPass1!', 10),
});

let genSeq = 0;
// generateTokenPair takes (userId, additionalPayload) — no req param
// Pass a unique seq so repeated calls don't produce identical token hashes
const gen = (userId) => generateTokenPair(userId, { seq: ++genSeq });

describe('hashToken', () => {
  test('returns a 64-char hex sha256 digest', () => {
    expect(hashToken('abc')).toHaveLength(64);
    expect(hashToken('abc')).toMatch(/^[0-9a-f]+$/);
  });

  test('is deterministic', () => {
    expect(hashToken('foo')).toBe(hashToken('foo'));
  });

  test('different inputs produce different hashes', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('generateTokenPair', () => {
  test('returns accessToken and refreshToken strings', async () => {
    const user = await makeUser('g1');
    const result = await gen(user._id);
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });

  test('creates a Session document keyed on accessToken hash', async () => {
    const user = await makeUser('g2');
    const { accessToken } = await gen(user._id);
    const session = await Session.findOne({ token: hashToken(accessToken) });
    expect(session).not.toBeNull();
    expect(String(session.userId)).toBe(String(user._id));
  });

  test('stores hashed refreshToken in session, never plaintext', async () => {
    const user = await makeUser('g3');
    const { refreshToken } = await gen(user._id);
    const session = await Session.findOne({ refreshToken: hashToken(refreshToken) });
    expect(session).not.toBeNull();
    // Plaintext should never appear
    const raw = await Session.findOne({ refreshToken });
    expect(raw).toBeNull();
  });

  test('stores device metadata in the session but not in bearer tokens', async () => {
    const user = await makeUser('g4');
    const { accessToken } = await generateTokenPair(user._id, {
      sessionMetadata: {
        deviceInfo: { type: 'mobile', operatingSystem: 'iOS', browser: 'Safari', deviceName: 'iOS - Safari' },
        ipAddress: '203.0.113.9',
        userAgent: 'Mobile browser'
      }
    });
    const session = await Session.findOne({ token: hashToken(accessToken) });
    const decoded = jwt.decode(accessToken);
    expect(session.ipAddress).toBe('203.0.113.9');
    expect(session.deviceInfo.browser).toBe('Safari');
    expect(decoded.sessionMetadata).toBeUndefined();
  });

  test('creates longer-lived remembered sessions', async () => {
    const user = await makeUser('g5');
    const { accessToken } = await generateTokenPair(user._id, { rememberMe: true });
    const session = await Session.findOne({ token: hashToken(accessToken) });
    expect(session.rememberMe).toBe(true);
    expect(session.absoluteExpiresAt.getTime() - Date.now()).toBeGreaterThan(20 * 24 * 60 * 60 * 1000);
  });
});

describe('refreshAccessToken', () => {
  test('issues a new accessToken for a valid refresh token', async () => {
    const user = await makeUser('r1');
    const { refreshToken } = await gen(user._id);
    const result = await refreshAccessToken(refreshToken, {});
    expect(result).toHaveProperty('accessToken');
  });

  test('throws for a malformed token', async () => {
    await expect(refreshAccessToken('not.a.jwt', {})).rejects.toThrow();
  });

  test('throws for a jwt signed with the correct secret but no matching session', async () => {
    const user = await makeUser('r2');
    const jwt = require('jsonwebtoken');
    const phantom = jwt.sign(
      { userId: user._id, type: 'refresh', jti: 'phantom-id' },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    await expect(refreshAccessToken(phantom, {})).rejects.toThrow();
  });

  test('rotates refresh tokens and revokes a family when an old token is reused', async () => {
    const user = await makeUser('r3');
    const { refreshToken } = await gen(user._id);
    await refreshAccessToken(refreshToken, {});
    await expect(refreshAccessToken(refreshToken, {})).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSED' });
    const active = await Session.find({ userId: user._id, isActive: true });
    expect(active).toHaveLength(0);
  });
});

describe('revokeRefreshToken', () => {
  test('deactivates the session for the given refresh token', async () => {
    const user = await makeUser('rv1');
    const { refreshToken } = await gen(user._id);
    await revokeRefreshToken(refreshToken);
    const session = await Session.findOne({ refreshToken: hashToken(refreshToken) });
    // Session should be inactive or deleted
    if (session) {
      expect(session.isActive).toBe(false);
    } else {
      expect(session).toBeNull();
    }
  });

  test('does not throw for an already-revoked token', async () => {
    const user = await makeUser('rv2');
    const { refreshToken } = await gen(user._id);
    await revokeRefreshToken(refreshToken);
    await expect(revokeRefreshToken(refreshToken)).resolves.not.toThrow();
  });
});

describe('revokeAllRefreshTokens', () => {
  test('deactivates all active sessions for a user', async () => {
    const user = await makeUser('ra1');
    await gen(user._id);
    await gen(user._id);
    await revokeAllRefreshTokens(user._id);
    const active = await Session.find({ userId: user._id, isActive: true });
    expect(active).toHaveLength(0);
  });

  test('does not affect sessions belonging to other users', async () => {
    const u1 = await makeUser('ra2');
    const u2 = await makeUser('ra3');
    await gen(u1._id);
    await gen(u2._id);
    await revokeAllRefreshTokens(u1._id);
    const u2Active = await Session.find({ userId: u2._id, isActive: true });
    expect(u2Active.length).toBeGreaterThanOrEqual(1);
  });
});
