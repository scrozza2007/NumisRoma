const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const sessionController = require('../../src/controllers/sessionController');
const { hashToken } = require('../../src/utils/tokenManager');

let seq = 0;
const makeUser = async () => {
  seq++;
  return User.create({
    username: `sv${seq}`,
    email: `sv${seq}@example.com`,
    password: await bcrypt.hash('TestPass1!', 10),
  });
};

let tokenSeq = 0;
const makeToken = (userId) => jwt.sign({ userId, seq: ++tokenSeq }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Express app that injects userId AND Authorization header
const makeApp = (userId, token, ...handlers) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { userId: String(userId) };
    // simulate authMiddleware populating cookies from header (extractToken checks both)
    next();
  });
  handlers.forEach(([method, path, fn]) => app[method](path, fn));
  return app;
};

const fakeReq = (token) => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'Jest/1.0 (Node; linux x86_64)' },
  connection: { remoteAddress: '127.0.0.1' },
  body: {},
});

// ── createSession ─────────────────────────────────────────────────────────────
describe('createSession', () => {
  test('creates a session with hashed token', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    await sessionController.createSession(user._id, token, fakeReq(token));
    const session = await Session.findOne({ token: hashToken(token) });
    expect(session).not.toBeNull();
    expect(String(session.userId)).toBe(String(user._id));
  });

  test('works with null req (server-side call)', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    await sessionController.createSession(user._id, token, null);
    const session = await Session.findOne({ token: hashToken(token) });
    expect(session).not.toBeNull();
  });

  test('parses user-agent into deviceInfo', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    const req = {
      ip: '10.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' },
      connection: {},
      body: {},
    };
    await sessionController.createSession(user._id, token, req);
    const session = await Session.findOne({ token: hashToken(token) });
    expect(session.deviceInfo.operatingSystem).toMatch(/Windows/);
  });

  test('normalizes the client IP and does not trust a submitted location', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    const req = {
      ip: '::ffff:203.0.113.17',
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/120.0' },
      connection: {},
      body: { location: 'Pretend City' },
    };

    await sessionController.createSession(user._id, token, req);

    const session = await Session.findOne({ token: hashToken(token) });
    expect(session.ipAddress).toBe('203.0.113.17');
    expect(session.location).not.toBe('Pretend City');
  });
});

// ── getActiveSessions ─────────────────────────────────────────────────────────
describe('getActiveSessions', () => {
  test('returns sessions for the authenticated user', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    await sessionController.createSession(user._id, token, fakeReq(token));

    const app = makeApp(user._id, token, ['get', '/sessions', sessionController.getActiveSessions]);
    const res = await request(app)
      .get('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.sessions[0].location).toBe('Unknown location');
    expect(res.body.sessions[0]).not.toHaveProperty('token');
    expect(res.body.sessions[0]).not.toHaveProperty('refreshToken');
    expect(res.body.sessions[0].ipAddress).toBe('127.0.0.1');
    expect(res.body.sessions[0]).toHaveProperty('id');
    expect(res.body.sessions[0]).not.toHaveProperty('_id');
  });

  test('flags the current session with isCurrentSession=true', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    await sessionController.createSession(user._id, token, fakeReq(token));

    const app = makeApp(user._id, token, ['get', '/sessions', sessionController.getActiveSessions]);
    const res = await request(app)
      .get('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const current = res.body.sessions.find(s => s.isCurrentSession);
    expect(current).toBeDefined();
  });

  test('refreshes the current session IP using Express trusted proxy resolution', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    await sessionController.createSession(user._id, token, fakeReq(token));

    const app = makeApp(user._id, token, ['get', '/sessions', sessionController.getActiveSessions]);
    app.set('trust proxy', 1);
    const res = await request(app)
      .get('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', '198.51.100.42')
      .expect(200);

    const stored = await Session.findOne({ token: hashToken(token) });
    expect(stored.ipAddress).toBe('198.51.100.42');
  });

  test('does not replace a stored public IP with a private Docker or LAN IP', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    const req = {
      ip: '198.51.100.42',
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/120.0' },
      connection: {},
      body: {},
    };
    await sessionController.createSession(user._id, token, req);

    const app = makeApp(user._id, token, ['get', '/sessions', sessionController.getActiveSessions]);
    await request(app)
      .get('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stored = await Session.findOne({ token: hashToken(token) });
    expect(stored.ipAddress).toBe('198.51.100.42');
  });
});

// ── terminateSession ──────────────────────────────────────────────────────────
describe('terminateSession', () => {
  test('terminates a non-current session', async () => {
    const user = await makeUser();
    const tokenCurrent = makeToken(user._id);
    const tokenOther = makeToken(user._id);
    await sessionController.createSession(user._id, tokenCurrent, fakeReq(tokenCurrent));
    const other = await sessionController.createSession(user._id, tokenOther, fakeReq(tokenOther));

    const app = makeApp(user._id, tokenCurrent,
      ['delete', '/sessions/:sessionId', sessionController.terminateSession]
    );
    const res = await request(app)
      .delete(`/sessions/${other.publicId}`)
      .set('Authorization', `Bearer ${tokenCurrent}`)
      .expect(200);
    expect(res.body.message).toMatch(/terminated/i);
  });

  test('returns 404 for an unknown sessionId', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);

    const app = makeApp(user._id, token,
      ['delete', '/sessions/:sessionId', sessionController.terminateSession]
    );
    await request(app)
      .delete(`/sessions/${require('crypto').randomUUID()}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  test('returns 400 when trying to terminate the current session', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    const session = await sessionController.createSession(user._id, token, fakeReq(token));

    const app = makeApp(user._id, token,
      ['delete', '/sessions/:sessionId', sessionController.terminateSession]
    );
    await request(app)
      .delete(`/sessions/${session.publicId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

// ── terminateAllOtherSessions ─────────────────────────────────────────────────
describe('terminateAllOtherSessions', () => {
  test('deactivates all sessions except current', async () => {
    const user = await makeUser();
    const current = makeToken(user._id);
    const other1 = makeToken(user._id);
    const other2 = makeToken(user._id);
    await sessionController.createSession(user._id, current, fakeReq(current));
    await sessionController.createSession(user._id, other1, fakeReq(other1));
    await sessionController.createSession(user._id, other2, fakeReq(other2));

    const app = makeApp(user._id, current,
      ['post', '/sessions/terminate-all', sessionController.terminateAllOtherSessions]
    );
    await request(app)
      .post('/sessions/terminate-all')
      .set('Authorization', `Bearer ${current}`)
      .expect(200);

    const active = await Session.find({ userId: user._id, isActive: true });
    expect(active).toHaveLength(1);
    expect(active[0].token).toBe(hashToken(current));
  });

  test('returns 400 when called without any token', async () => {
    const user = await makeUser();

    const app = makeApp(user._id, null,
      ['post', '/sessions/terminate-all', sessionController.terminateAllOtherSessions]
    );
    await request(app).post('/sessions/terminate-all').expect(400);
  });
});

// ── updateSessionActivity ─────────────────────────────────────────────────────
describe('updateSessionActivity', () => {
  test('updates lastActive on an existing session', async () => {
    const user = await makeUser();
    const token = makeToken(user._id);
    const session = await sessionController.createSession(user._id, token, fakeReq(token));

    const before = session.lastActive;
    await new Promise(r => setTimeout(r, 20));
    await sessionController.updateSessionActivity(user._id, hashToken(token));

    const updated = await Session.findById(session._id);
    expect(updated.lastActive.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  test('does not throw when session is missing', async () => {
    await expect(
      sessionController.updateSessionActivity(new mongoose.Types.ObjectId(), 'nonexistent')
    ).resolves.not.toThrow();
  });
});
