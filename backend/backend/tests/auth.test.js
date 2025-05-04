const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src');
const User = require('../src/models/User');

describe('Auth API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numisroma-test');
    
    // Clear users collection before tests
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Disconnect from database
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
    });

    it('should not register a user with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('msg');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('msg');
    });
  });
}); 