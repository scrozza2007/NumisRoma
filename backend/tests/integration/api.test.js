/**
 * Integration tests for API endpoints
 * Tests the complete API flow with real database operations
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { hashToken } = require('../../src/utils/tokenManager');

// Create test app (similar to main app but without server startup)
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import middlewares
const { securityHeaders, generalLimiter, authLimiter, contactLimiter } = require('../../src/middlewares/security');
const { errorHandler, notFoundHandler } = require('../../src/middlewares/errorHandler');
const { requestLogger, errorLogger, dbLogger } = require('../../src/middlewares/logger');

// Import routes
const authRoutes = require('../../src/routes/auth');
const coinRoutes = require('../../src/routes/coins');
const collectionRoutes = require('../../src/routes/collections');
const userRoutes = require('../../src/routes/users');
const contactRoutes = require('../../src/routes/contact');
const sessionRoutes = require('../../src/routes/sessions');
const messageRoutes = require('../../src/routes/messages');
const healthRoutes = require('../../src/routes/health');

// Create test app
const app = express();

// Apply same middlewares as main app
app.use(securityHeaders);
app.use(generalLimiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health check routes
app.use('/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'NumisRoma API Online', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);

// General routes
app.use('/api/coins', coinRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);

// Error handling middlewares
app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);

// Import models
const User = require('../../src/models/User');
const Coin = require('../../src/models/Coin');
const Follow = require('../../src/models/Follow');
const Session = require('../../src/models/Session');

// Import fixtures
const userFixtures = require('../fixtures/users');
const coinFixtures = require('../fixtures/coins');

const adminAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'X-Admin-API-Key': process.env.ADMIN_API_KEY
});

describe('API Integration Tests', () => {
  let testUser, authToken, testCoin;

  beforeAll(async () => {
    // Wait for the app to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Coin.deleteMany({});
    await Follow.deleteMany({});
    await Session.deleteMany({});

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      fullName: 'Test User',
      location: 'Test City'
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test_jwt_secret_for_testing_purposes_only',
      { expiresIn: '1h' }
    );

    await Session.create({
      userId: testUser._id,
      token: hashToken(authToken),
      isActive: true,
      lastActive: new Date()
    });

    // Create test coin
    testCoin = await Coin.create(coinFixtures.validCoin);
  });

  describe('Health Check Endpoints', () => {
    test('GET /health should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /health/detailed should return detailed health info', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .set(adminAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('memory');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /health/ready should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    test('GET /health/live should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('Coin API Endpoints', () => {
    test('GET /api/coins should return paginated coins', async () => {
      // Create multiple coins
      await Coin.insertMany(coinFixtures.multipleCoinsBatch);

      const response = await request(app)
        .get('/api/coins')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    test('GET /api/coins with search should filter results', async () => {
      await Coin.insertMany(coinFixtures.multipleCoinsBatch);

      const response = await request(app)
        .get('/api/coins?keyword=RIC VIII')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].title.en).toContain('RIC VIII');
    });

    test('GET /api/coins/random should return random coins', async () => {
      await Coin.insertMany(coinFixtures.multipleCoinsBatch);

      const response = await request(app)
        .get('/api/coins/random')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('GET /api/coins/filter-options should return filter options', async () => {
      await Coin.insertMany(coinFixtures.multipleCoinsBatch);

      const response = await request(app)
        .get('/api/coins/filter-options')
        .expect(200);

      expect(response.body).toHaveProperty('materials');
      expect(response.body).toHaveProperty('issuers');
      expect(response.body).toHaveProperty('dynasties');
      expect(response.body).toHaveProperty('tooltips');
    });

    test('POST /api/coins should create a new coin', async () => {
      const newCoin = {
        _id: 'test_coin_creation',
        title: { en: 'Test Coin Creation' },
        reference: { system: 'TEST', series: 'test', number: 1, suffix: '' },
        references: [{ system: 'TEST', series: 'test', number: 1, suffix: '' }],
        coinage: { date: { from: 100, to: 101 } },
        authority: {
          issuer: 'test_emperor',
          dynasty: 'test_dynasty'
        },
        classification: {
          material: 'test_material',
          denomination: 'test_denomination'
        },
        descriptions: {
          obverse: { legend: 'Test Obverse', type: 'Test obverse type', portrait: 'Test Emperor' },
          reverse: { legend: 'Test Reverse', type: 'Test reverse type' }
        },
        subjects: [],
        images: []
      };

      const response = await request(app)
        .post('/api/coins')
        .set(adminAuthHeaders(authToken))
        .send(newCoin)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title.en).toBe(newCoin.title.en);

      // Verify in database
      const savedCoin = await Coin.findById(response.body._id);
      expect(savedCoin).toBeTruthy();
      expect(savedCoin.title.en).toBe(newCoin.title.en);
    });
  });

  describe('User API Endpoints', () => {
    let testUser2;

    beforeEach(async () => {
      // Create second test user
      const hashedPassword = await bcrypt.hash('password456', 10);
      testUser2 = await User.create({
        username: 'testuser2',
        email: 'test2@example.com',
        password: hashedPassword,
        fullName: 'Test User 2',
        location: 'Test City 2'
      });
    });

    test('GET /api/users/:id/followers should return user followers', async () => {
      // Create follow relationship
      await Follow.create({
        follower: testUser2._id,
        following: testUser._id
      });

      const response = await request(app)
        .get(`/api/users/${testUser._id}/followers`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].username).toBe('testuser2');
    });

    test('GET /api/users/:id/following should return users being followed', async () => {
      // Create follow relationship
      await Follow.create({
        follower: testUser._id,
        following: testUser2._id
      });

      const response = await request(app)
        .get(`/api/users/${testUser._id}/following`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].username).toBe('testuser2');
    });

    test('POST /api/users/:id/follow should create follow relationship', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser2._id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Successfully followed user');

      // Verify in database
      const follow = await Follow.findOne({
        follower: testUser._id,
        following: testUser2._id
      });
      expect(follow).toBeTruthy();
    });

    test('DELETE /api/users/:id/follow should remove follow relationship', async () => {
      // Create follow relationship first
      await Follow.create({
        follower: testUser._id,
        following: testUser2._id
      });

      const response = await request(app)
        .delete(`/api/users/${testUser2._id}/unfollow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Successfully unfollowed user');

      // Verify removed from database
      const follow = await Follow.findOne({
        follower: testUser._id,
        following: testUser2._id
      });
      expect(follow).toBeNull();
    });
  });

  describe('Authentication Flow', () => {
    test('should reject requests to protected endpoints without token', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser._id}/follow`)
        .expect(401);

      expect(response.body).toHaveProperty('msg', 'Missing token, access denied');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser._id}/follow`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('msg', 'Invalid token, access denied');
    });

    test('should allow requests with valid token', async () => {
      const testUser2 = await User.create({
        username: 'testuser2',
        email: 'test2@example.com',
        password: await bcrypt.hash('password456', 10),
        fullName: 'Test User 2'
      });

      const response = await request(app)
        .post(`/api/users/${testUser2._id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Successfully followed user');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Route /api/nonexistent not found');
    });

    test('should handle invalid ObjectId parameters', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id/followers')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid ID format',
        message: "Parameter 'id' must be a valid MongoDB ObjectId"
      });
    });

    test('should handle validation errors gracefully', async () => {
      const invalidCoin = {
        authority: {
          emperor: 'Test Emperor'
        }
      };

      const response = await request(app)
        .post('/api/coins')
        .set(adminAuthHeaders(authToken))
        .send(invalidCoin)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: { message: 'Failed to create coin', statusCode: 500 }
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should expose rate limit headers on coin search endpoint', async () => {
      const response = await request(app).get('/api/coins').expect(200);
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(parseInt(response.headers['ratelimit-limit'], 10)).toBe(30);
    });
  });

  describe('Database Integration', () => {
    test('should handle database operations correctly', async () => {
      // Test creating multiple related records
      const user1 = await User.create({
        username: 'dbtest1',
        email: 'dbtest1@example.com',
        password: await bcrypt.hash('password', 10),
        fullName: 'DB Test 1'
      });

      const user2 = await User.create({
        username: 'dbtest2',
        email: 'dbtest2@example.com',
        password: await bcrypt.hash('password', 10),
        fullName: 'DB Test 2'
      });

      const coin = await Coin.create({
        _id: 'db_test_coin',
        title: { en: 'DB Test Coin' },
        reference: { system: 'TEST', series: 'test', number: 2, suffix: '' },
        references: [],
        coinage: { date: { from: 101, to: 102 } },
        authority: { issuer: 'test_emperor' },
        classification: { material: 'test_material', denomination: 'test_denomination' },
        descriptions: {
          obverse: { legend: 'Test Obverse', type: 'Test obverse type', portrait: 'Test Emperor' },
          reverse: { legend: 'Test Reverse', type: 'Test reverse type' }
        },
        subjects: [],
        images: []
      });

      // Create relationships
      await Follow.create({
        follower: user1._id,
        following: user2._id
      });

      // Test API endpoints work with this data
      const followersResponse = await request(app)
        .get(`/api/users/${user2._id}/followers`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(followersResponse.body.users).toHaveLength(1);
      expect(followersResponse.body.users[0].username).toBe('dbtest1');

      const coinsResponse = await request(app)
        .get('/api/coins?keyword=DB Test')
        .expect(200);

      expect(coinsResponse.body.results).toHaveLength(1);
      expect(coinsResponse.body.results[0].title.en).toBe('DB Test Coin');
    });

    test('should handle database transactions correctly', async () => {
      // Test that follow/unfollow operations are atomic
      const user1 = await User.create({
        username: 'transtest1',
        email: 'transtest1@example.com',
        password: await bcrypt.hash('password', 10),
        fullName: 'Trans Test 1'
      });

      const user2 = await User.create({
        username: 'transtest2',
        email: 'transtest2@example.com',
        password: await bcrypt.hash('password', 10),
        fullName: 'Trans Test 2'
      });

      const token = jwt.sign(
        { userId: user1._id },
        process.env.JWT_SECRET || 'test_jwt_secret_for_testing_purposes_only',
        { expiresIn: '1h' }
      );

      await Session.create({
        userId: user1._id,
        token: hashToken(token),
        isActive: true,
        lastActive: new Date()
      });

      // Follow user
      await request(app)
        .post(`/api/users/${user2._id}/follow`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Verify follow exists
      let follow = await Follow.findOne({
        follower: user1._id,
        following: user2._id
      });
      expect(follow).toBeTruthy();

      // Unfollow user
      await request(app)
        .delete(`/api/users/${user2._id}/unfollow`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify follow is removed
      follow = await Follow.findOne({
        follower: user1._id,
        following: user2._id
      });
      expect(follow).toBeNull();
    });
  });
});
