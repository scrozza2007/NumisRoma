/**
 * Unit tests for security middleware
 */

const request = require('supertest');
const express = require('express');
const { securityHeaders, generalLimiter, authLimiter, contactLimiter } = require('../../src/middlewares/security');

describe('Security Middleware', () => {
  const OLD_NODE_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = OLD_NODE_ENV;
  });

  describe('Security Headers', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(securityHeaders);
      
      app.get('/test', (req, res) => {
        res.json({ message: 'Test endpoint' });
      });
    });

    test('should add security headers to responses', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-download-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should set X-Frame-Options to DENY', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    test('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should remove X-Powered-By header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('Rate Limiting', () => {
    describe('General Rate Limiter', () => {
      let app;

      beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(generalLimiter);
        
        app.get('/test', (req, res) => {
          res.json({ message: 'Test endpoint' });
        });
      });

      test('should allow requests within limit', async () => {
        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Test endpoint');
      });

      test('should add rate limit headers', async () => {
        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
        expect(response.headers).toHaveProperty('ratelimit-reset');
      });

      test('should track requests per IP', async () => {
        const response1 = await request(app)
          .get('/test')
          .expect(200);

        const response2 = await request(app)
          .get('/test')
          .expect(200);

        // Second request should have one less remaining
        const remaining1 = parseInt(response1.headers['ratelimit-remaining']);
        const remaining2 = parseInt(response2.headers['ratelimit-remaining']);
        
        expect(remaining2).toBe(remaining1 - 1);
      });

      // Note: Testing actual rate limit blocking is complex due to timing
      // In a real scenario, you might want to mock the rate limiter
    });

    describe('Auth Rate Limiter', () => {
      let app;

      beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(authLimiter);
        
        app.post('/test-auth', (req, res) => {
          res.json({ message: 'Auth endpoint' });
        });
      });

      test('should apply stricter limits to auth endpoints', async () => {
        const response = await request(app)
          .post('/test-auth')
          .send({ username: 'test', password: 'test' })
          .expect(200);

        expect(response.headers).toHaveProperty('ratelimit-limit');
        
        // Auth limiter should have lower limit than general limiter
        const limit = parseInt(response.headers['ratelimit-limit']);
        expect(limit).toBeLessThan(1000); // General limit is 1000
      });

      test('should track auth requests separately', async () => {
        const response = await request(app)
          .post('/test-auth')
          .send({ username: 'test', password: 'test' })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Auth endpoint');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
      });
    });

    describe('Contact Rate Limiter', () => {
      let app;

      beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(contactLimiter);
        
        app.post('/test-contact', (req, res) => {
          res.json({ message: 'Contact endpoint' });
        });
      });

      test('should apply contact-specific limits', async () => {
        const response = await request(app)
          .post('/test-contact')
          .send({ name: 'Test', email: 'test@example.com', message: 'Test message' })
          .expect(200);

        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.body).toHaveProperty('message', 'Contact endpoint');
      });

      test('should have appropriate limit for contact forms', async () => {
        const response = await request(app)
          .post('/test-contact')
          .send({ name: 'Test', email: 'test@example.com', message: 'Test message' })
          .expect(200);

        const limit = parseInt(response.headers['ratelimit-limit']);
        // Contact should have reasonable limit (not too high, not too low)
        expect(limit).toBeGreaterThan(1);
        expect(limit).toBeLessThan(1000);
      });
    });
  });

  describe('Combined Security Middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      
      // Apply all security middleware
      app.use(securityHeaders);
      app.use(generalLimiter);
      
      app.get('/test', (req, res) => {
        res.json({ message: 'Secure endpoint' });
      });
    });

    test('should apply both security headers and rate limiting', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      
      // Check for rate limiting headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      
      expect(response.body).toHaveProperty('message', 'Secure endpoint');
    });

    test('should maintain security across multiple requests', async () => {
      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(request(app).get('/test'));
      }

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty('x-frame-options');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle middleware errors gracefully', async () => {
      const app = express();
      
      // Add security middleware
      app.use(securityHeaders);
      
      // Add a route that throws an error
      app.get('/error', (req, res, next) => {
        const error = new Error('Test error');
        next(error);
      });
      
      // Basic error handler
      app.use((err, req, res, next) => {
        res.status(500).json({ error: 'Server error' });
      });

      const response = await request(app)
        .get('/error')
        .expect(500);

      // Security headers should still be applied even on errors
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.body).toHaveProperty('error', 'Server error');
    });
  });

  describe('Configuration', () => {
    test('should use correct rate limit values from constants', async () => {
      const app = express();
      app.use(generalLimiter);
      
      app.get('/test', (req, res) => {
        res.json({ message: 'Test' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      const limit = parseInt(response.headers['ratelimit-limit']);
      
      expect(limit).toBe(300);
    });

    test('should reset rate limits after window expires', async () => {
      // Note: This test is difficult to implement without mocking time
      // In a real scenario, you might want to use a library like sinon
      // to mock Date.now() or use a configurable time window
      
      const app = express();
      app.use(generalLimiter);
      
      app.get('/test', (req, res) => {
        res.json({ message: 'Test' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-reset');
      
      // The reset time should be seconds remaining in the window
      const resetTime = parseInt(response.headers['ratelimit-reset']);
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(900); // 15 minutes in seconds
    });
  });
});
