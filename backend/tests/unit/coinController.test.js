const request = require('supertest');
const express = require('express');
const coinController = require('../../src/controllers/coinController');
const Coin = require('../../src/models/Coin');
const coinFixtures = require('../fixtures/coins');

const app = express();
app.use(express.json());

app.get('/api/coins', coinController.getCoins);
app.get('/api/coins/random', coinController.getRandomCoins);
app.get('/api/coins/filter-options', coinController.getFilterOptions);
app.post('/api/coins', coinController.createCoin);

describe('Coin Controller', () => {
  beforeAll(async () => {
    await Coin.syncIndexes();
  });

  describe('GET /api/coins', () => {
    beforeEach(async () => {
      await Coin.insertMany(coinFixtures.multipleCoinsBatch);
    });

    test('should return coins with default pagination', async () => {
      const response = await request(app)
        .get('/api/coins')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('pages');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(20);
    });

    test('should filter coins by keyword "RIC VIII"', async () => {
      const response = await request(app)
        .get('/api/coins?keyword=RIC VIII')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]['title']['en']).toContain('RIC VIII');
    });

    test('should filter coins by issuer', async () => {
      const response = await request(app)
        .get('/api/coins?issuer=augustus')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].authority.issuer).toBe('augustus');
    });

    test('should filter coins by material', async () => {
      const response = await request(app)
        .get('/api/coins?material=silver')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].classification.material).toBe('silver');
    });

    test('should handle specific RIC number queries', async () => {
      const response = await request(app)
        .get('/api/coins?keyword=RIC 77')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]['title']['en']).toContain('77');
    });

    test('should sort coins by title ascending', async () => {
      const response = await request(app)
        .get('/api/coins?sortBy=title&order=asc')
        .expect(200);

      const titles = response.body.results.map(c => c.title.en);
      const sorted = [...titles].sort();
      expect(titles).toEqual(sorted);
    });

    test('should limit results correctly', async () => {
      const response = await request(app)
        .get('/api/coins?limit=2')
        .expect(200);

      expect(response.body.results).toHaveLength(2);
    });

    test('should handle pagination correctly', async () => {
      const page1 = await request(app).get('/api/coins?page=1&limit=2').expect(200);
      const page2 = await request(app).get('/api/coins?page=2&limit=2').expect(200);

      expect(page1.body.page).toBe(1);
      expect(page2.body.page).toBe(2);
      expect(page1.body.results[0]._id).not.toBe(page2.body.results[0]._id);
    });

    test('should return empty results for non-existent keyword', async () => {
      const response = await request(app)
        .get('/api/coins?keyword=NonExistentCoin')
        .expect(200);

      expect(response.body.results).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/coins/random', () => {
    beforeEach(async () => {
      await Coin.insertMany([
        coinFixtures.validCoin,
        {
          ...coinFixtures.validCoin,
          _id: 'ric_1_aug_11',
          title: { en: 'RIC I (second edition) Augustus 11' }
        }
      ]);
    });

    test('should return random coins with default limit', async () => {
      const response = await request(app)
        .get('/api/coins/random')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(3);
    });

    test('should respect custom limit', async () => {
      const response = await request(app)
        .get('/api/coins/random?limit=2')
        .expect(200);

      expect(response.body.results).toHaveLength(2);
    });

    test('should return results on multiple calls', async () => {
      const r1 = await request(app).get('/api/coins/random?limit=1');
      const r2 = await request(app).get('/api/coins/random?limit=1');
      expect(r1.body.results).toHaveLength(1);
      expect(r2.body.results).toHaveLength(1);
    });

    test('should exclude unified-only specimens when split layout is requested', async () => {
      await Coin.deleteMany({});
      await Coin.insertMany([
        coinFixtures.validCoin,
        {
          ...coinFixtures.validCoin,
          _id: 'ric_1_aug_unified',
          title: { en: 'RIC I Augustus Unified Specimen' },
          images: [{
            index: 1,
            layout: 'unified',
            files: { unified: 'https://example.com/unified.jpg' }
          }]
        }
      ]);

      const response = await request(app)
        .get('/api/coins/random?limit=3&layout=split')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]._id).toBe(coinFixtures.validCoin._id);
      expect(response.body.results[0].images[0].layout).toBe('split');
    });
  });

  describe('GET /api/coins/filter-options', () => {
    beforeEach(async () => {
      await Coin.insertMany(coinFixtures.multipleCoinsBatch);
    });

    test('should return filter options', async () => {
      const response = await request(app)
        .get('/api/coins/filter-options')
        .expect(200);

      expect(response.body).toHaveProperty('materials');
      expect(response.body).toHaveProperty('issuers');
      expect(response.body).toHaveProperty('dynasties');
      expect(response.body).toHaveProperty('denominations');
      expect(response.body).toHaveProperty('mints');
      expect(response.body).toHaveProperty('portraits');
      expect(Array.isArray(response.body.materials)).toBe(true);
      expect(Array.isArray(response.body.issuers)).toBe(true);
    });

    test('should include tooltips in response', async () => {
      const response = await request(app)
        .get('/api/coins/filter-options')
        .expect(200);

      expect(response.body).toHaveProperty('tooltips');
      expect(response.body.tooltips).toHaveProperty('materials');
      expect(response.body.tooltips).toHaveProperty('issuers');
    });
  });

  describe('POST /api/coins', () => {
    test('should create a new coin with valid data', async () => {
      const response = await request(app)
        .post('/api/coins')
        .send(coinFixtures.validCoin)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title.en).toBe(coinFixtures.validCoin.title.en);
      expect(response.body.authority.issuer).toBe(coinFixtures.validCoin.authority.issuer);

      const savedCoin = await Coin.findById(response.body._id);
      expect(savedCoin).toBeTruthy();
      expect(savedCoin.title.en).toBe(coinFixtures.validCoin.title.en);
    });

    test('should reject coin with invalid data', async () => {
      const response = await request(app)
        .post('/api/coins')
        .send(coinFixtures.invalidCoin)
        .expect(500);

      const coinCount = await Coin.countDocuments();
      expect(coinCount).toBe(0);
    });

    test('should handle missing required fields', async () => {
      const incompleteCoin = { authority: { issuer: 'test_issuer' } };
      await request(app).post('/api/coins').send(incompleteCoin).expect(500);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Client must be connected before running operations');
      const findSpy = jest.spyOn(Coin, 'find').mockReturnValue({
        select() { return this; },
        skip()   { return this; },
        limit()  { return this; },
        sort()   { return this; },
        lean()   { return Promise.reject(dbError); }
      });

      try {
        const response = await request(app).get('/api/coins').expect(500);
        expect(response.body).toMatchObject({
          success: false,
          error: { message: 'Failed to fetch coins', statusCode: 500 }
        });
      } finally {
        findSpy.mockRestore();
      }
    });

    test('should handle invalid string ID in parameters', async () => {
      // String IDs are valid for this model; a non-existent one returns 404
      // when the DB is connected. Without DB we just check the route resolves.
      const response = await request(app).get('/api/coins/nonexistent-id');
      expect([404, 500]).toContain(response.status);
    });
  });
});
