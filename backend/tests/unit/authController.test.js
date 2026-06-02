const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');

jest.mock('../../src/utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ data: { id: 'welcome-email' } }),
  sendAccountDeletionEmail: jest.fn().mockResolvedValue({ data: { id: 'deletion-email' } }),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue({ data: { id: 'security-email' } })
}));

const authController = require('../../src/controllers/authController');
const { hashToken } = require('../../src/utils/tokenManager');
const emailService = require('../../src/utils/emailService');

// Minimal app factory — injects req.user when userId is provided
const makeApp = (handlers, userId) => {
  const app = express();
  app.use(express.json());
  if (userId) {
    app.use((req, _res, next) => {
      req.user = { userId: String(userId) };
      next();
    });
  }
  handlers.forEach(([method, path, fn]) => app[method](path, fn));
  return app;
};

const makeUser = async (suffix = '') => {
  const hash = await bcrypt.hash('TestPass1!', 10);
  return User.create({
    username: `authuser${suffix}`,
    email: `authuser${suffix}@example.com`,
    password: hash,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── registerUser ──────────────────────────────────────────────────────────────
describe('registerUser', () => {
  let app;
  beforeEach(() => {
    app = makeApp([['post', '/register', authController.registerUser]]);
  });

  test('registers a new user and creates protected session cookies', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'newbie1', email: 'newbie1@test.com', password: 'StrongPass1!' })
      .expect(201);
    expect(res.body.authenticated).toBe(true);
    expect(res.body).not.toHaveProperty('token');
    expect(res.headers['set-cookie'].join(';')).toMatch(/token=.*HttpOnly/);
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=.*HttpOnly/);
    expect(res.body.user.username).toBe('newbie1');
  });

  test('rejects duplicate username with 409', async () => {
    await makeUser('dup1');
    await request(app)
      .post('/register')
      .send({ username: 'authuserdup1', email: 'dup1_b@test.com', password: 'StrongPass1!' })
      .expect(409);
  });

  test('rejects duplicate email with 400 (non-enumerable)', async () => {
    const user = await makeUser('dup2');
    await request(app)
      .post('/register')
      .send({ username: 'uniqueUser999', email: user.email, password: 'StrongPass1!' })
      .expect(400);
  });

  test('rejects a common weak password', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'weakpw', email: 'weakpw@test.com', password: 'password123' })
      .expect(400);
    expect(res.body.error).toMatch(/weak|common|password/i);
  });

  test('rejects a too-short password', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'shortpw', email: 'shortpw@test.com', password: 'Ab1!' })
      .expect(400);
  });
});

// ── loginUser ─────────────────────────────────────────────────────────────────
describe('loginUser', () => {
  let app;
  beforeEach(() => {
    app = makeApp([['post', '/login', authController.loginUser]]);
  });

  test('logs in with valid credentials (email identifier)', async () => {
    const user = await makeUser('login1');
    const res = await request(app)
      .post('/login')
      .send({ identifier: user.email, password: 'TestPass1!' })
      .expect(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body).not.toHaveProperty('token');
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=.*HttpOnly/);
  });

  test('logs in with username identifier', async () => {
    const user = await makeUser('login2');
    const res = await request(app)
      .post('/login')
      .send({ identifier: user.username, password: 'TestPass1!' })
      .expect(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body).not.toHaveProperty('token');
  });

  test('persists remembered login preference using a longer-lived session', async () => {
    const user = await makeUser('remember');
    await request(app)
      .post('/login')
      .send({ identifier: user.email, password: 'TestPass1!', rememberMe: true })
      .expect(200);
    const session = await Session.findOne({ userId: user._id, isActive: true });
    expect(session.rememberMe).toBe(true);
  });

  test('returns 400 for wrong password', async () => {
    const user = await makeUser('login3');
    await request(app)
      .post('/login')
      .send({ identifier: user.email, password: 'WrongPass1!' })
      .expect(400);
  });

  test('returns 400 for unknown email', async () => {
    await request(app)
      .post('/login')
      .send({ identifier: 'nobody@nowhere.com', password: 'SomePass1!' })
      .expect(400);
  });

  test('returns 429 for locked account', async () => {
    const user = await makeUser('locked1');
    await User.updateOne({ _id: user._id }, { $set: { lockoutUntil: new Date(Date.now() + 60000) } });
    await request(app)
      .post('/login')
      .send({ identifier: user.email, password: 'TestPass1!' })
      .expect(429);
  });
});

// ── logoutUser ────────────────────────────────────────────────────────────────
describe('logoutUser', () => {
  test('deactivates the session and returns success', async () => {
    const user = await makeUser('logout1');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const sessionController = require('../../src/controllers/sessionController');
    await sessionController.createSession(user._id, token, {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Jest/1.0' },
      connection: {},
      body: {},
    });

    const app = makeApp([['post', '/logout', authController.logoutUser]], user._id);
    const res = await request(app)
      .post('/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.message).toMatch(/logout/i);

    const session = await Session.findOne({ token: hashToken(token) });
    expect(session?.isActive).toBe(false);
  });
});

// ── changePassword ────────────────────────────────────────────────────────────
describe('changePassword', () => {
  test('changes password with correct current password', async () => {
    const user = await makeUser('cp1');
    const app = makeApp([['post', '/change-password', authController.changePassword]], user._id);
    const res = await request(app)
      .post('/change-password')
      .send({ currentPassword: 'TestPass1!', newPassword: 'NewPass2@' })
      .expect(200);
    expect(res.body.message).toMatch(/changed/i);
    const updated = await User.findById(user._id);
    expect(await bcrypt.compare('NewPass2@', updated.password)).toBe(true);
  });

  test('returns 400 for wrong current password', async () => {
    const user = await makeUser('cp2');
    const app = makeApp([['post', '/change-password', authController.changePassword]], user._id);
    await request(app)
      .post('/change-password')
      .send({ currentPassword: 'Wrong1!', newPassword: 'NewPass2@' })
      .expect(400);
  });

  test('returns 400 when new password is same as current', async () => {
    const user = await makeUser('cp3');
    const app = makeApp([['post', '/change-password', authController.changePassword]], user._id);
    await request(app)
      .post('/change-password')
      .send({ currentPassword: 'TestPass1!', newPassword: 'TestPass1!' })
      .expect(400);
  });

  test('returns 400 for weak new password', async () => {
    const user = await makeUser('cp4');
    const app = makeApp([['post', '/change-password', authController.changePassword]], user._id);
    await request(app)
      .post('/change-password')
      .send({ currentPassword: 'TestPass1!', newPassword: 'weak' })
      .expect(400);
  });
});

// ── changeUsername ────────────────────────────────────────────────────────────
describe('changeUsername', () => {
  test('changes username successfully', async () => {
    const user = await makeUser('cu1');
    const app = makeApp([['post', '/change-username', authController.changeUsername]], user._id);
    const res = await request(app)
      .post('/change-username')
      .send({ username: 'brandnew_name' })
      .expect(200);
    expect(res.body.user.username).toBe('brandnew_name');
  });

  test('returns 409 for already-taken username', async () => {
    const user1 = await makeUser('cu2');
    const user2 = await makeUser('cu3');
    const app = makeApp([['post', '/change-username', authController.changeUsername]], user2._id);
    await request(app)
      .post('/change-username')
      .send({ username: user1.username })
      .expect(409);
  });
});

// ── updateProfile ─────────────────────────────────────────────────────────────
describe('updateProfile', () => {
  test('updates fullName and location', async () => {
    const user = await makeUser('up1');
    const app = makeApp([['post', '/profile', authController.updateProfile]], user._id);
    const res = await request(app)
      .post('/profile')
      .send({ fullName: 'Full Name', location: 'Rome, Italy' })
      .expect(200);
    expect(res.body.user.fullName).toBe('Full Name');
  });

  test('updates bio', async () => {
    const user = await makeUser('up2');
    const app = makeApp([['post', '/profile', authController.updateProfile]], user._id);
    const res = await request(app)
      .post('/profile')
      .send({ bio: 'I collect coins.' })
      .expect(200);
    expect(res.body.user.bio).toBe('I collect coins.');
  });
});

// ── deleteAccount ────────────────────────────────────────────────────────────
describe('deleteAccount', () => {
  test('deletes the account and sends a confirmation email', async () => {
    const user = await makeUser('delete1');
    const app = makeApp([['post', '/delete-account', authController.deleteAccount]], user._id);

    const res = await request(app)
      .post('/delete-account')
      .send({ password: 'TestPass1!' })
      .expect(200);

    expect(res.body.message).toBe('Account deleted successfully');
    expect(await User.findById(user._id)).toBeNull();
    expect(emailService.sendAccountDeletionEmail).toHaveBeenCalledWith({
      to: user.email,
      username: user.username
    });
  });

  test('keeps deletion successful if confirmation email delivery fails', async () => {
    emailService.sendAccountDeletionEmail.mockRejectedValueOnce(new Error('Delivery unavailable'));
    const user = await makeUser('delete2');
    const app = makeApp([['post', '/delete-account', authController.deleteAccount]], user._id);

    const res = await request(app)
      .post('/delete-account')
      .send({ password: 'TestPass1!' })
      .expect(200);

    expect(res.body.message).toBe('Account deleted successfully');
    expect(await User.findById(user._id)).toBeNull();
  });
});

// ── checkSession ──────────────────────────────────────────────────────────────
describe('checkSession', () => {
  test('returns active session status', async () => {
    const user = await makeUser('cs1');
    const app = makeApp([['get', '/session', authController.checkSession]], user._id);
    const res = await request(app).get('/session').expect(200);
    expect(res.body.active).toBe(true);
    expect(res.body).not.toHaveProperty('sessionId');
  });
});
