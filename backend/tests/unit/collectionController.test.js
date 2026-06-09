const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Collection = require('../../src/models/Collection');
const Coin = require('../../src/models/Coin');
const collectionController = require('../../src/controllers/collectionController');
const coinFixtures = require('../fixtures/coins');

let seq = 0;
const makeUser = async () => {
  seq++;
  return User.create({
    username: `cc${seq}`,
    email: `cc${seq}@test.com`,
    password: await bcrypt.hash('TestPass1!', 10),
  });
};

// Minimal app that injects req.user and mounts a single handler
const app1 = (userId, method, path, fn) => {
  const a = express();
  a.use(express.json());
  if (userId) a.use((req, _r, next) => { req.user = { userId: String(userId) }; next(); });
  a[method](path, fn);
  return a;
};

// Public app (no user)
const pubApp = (method, path, fn) => {
  const a = express();
  a.use(express.json());
  a[method](path, fn);
  return a;
};

describe('Collection Controller', () => {
  let user;
  beforeEach(async () => { user = await makeUser(); });

  // ── createCollection ───────────────────────────────────────────────────────
  describe('createCollection', () => {
    test('creates a collection → 201', async () => {
      const a = app1(user._id, 'post', '/collections', collectionController.createCollection);
      const res = await request(a)
        .post('/collections')
        .send({ name: 'TestCol', isPublic: true })
        .expect(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe('TestCol');
    });

    test('missing name → 500 (Mongoose validation, no express-validator in test)', async () => {
      const a = app1(user._id, 'post', '/collections', collectionController.createCollection);
      await request(a).post('/collections').send({ isPublic: true }).expect(500);
    });
  });

  // ── getMyCollections ───────────────────────────────────────────────────────
  describe('getMyCollections', () => {
    test('returns { collections, pagination } with only this user\'s collections', async () => {
      await Collection.create([
        { user: user._id, name: 'M1', isPublic: true },
        { user: user._id, name: 'M2', isPublic: false },
      ]);
      const other = await makeUser();
      await Collection.create({ user: other._id, name: 'Their', isPublic: true });

      const a = app1(user._id, 'get', '/my', collectionController.getMyCollections);
      const res = await request(a).get('/my').expect(200);
      expect(Array.isArray(res.body.collections)).toBe(true);
      expect(res.body.collections).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
    });
  });

  // ── getPublicCollections ───────────────────────────────────────────────────
  describe('getPublicCollections', () => {
    test('returns only public collections in paginated shape', async () => {
      await Collection.create([
        { user: user._id, name: 'Pub', isPublic: true },
        { user: user._id, name: 'Priv', isPublic: false },
      ]);
      const a = pubApp('get', '/public', collectionController.getPublicCollections);
      const res = await request(a).get('/public').expect(200);
      expect(res.body.collections.every(c => c.isPublic === true)).toBe(true);
    });
  });

  // ── getUserCollections ─────────────────────────────────────────────────────
  describe('getUserCollections', () => {
    test('returns public collections for the given user', async () => {
      await Collection.create([
        { user: user._id, name: 'PubCol', isPublic: true },
        { user: user._id, name: 'PrivCol', isPublic: false },
      ]);
      const a = pubApp('get', '/users/:userId/collections', collectionController.getUserCollections);
      const res = await request(a).get(`/users/${user._id}/collections`).expect(200);
      expect(res.body.collections.every(c => c.isPublic)).toBe(true);
    });

    test('invalid userId format → 500 (no validator middleware in test)', async () => {
      const a = pubApp('get', '/users/:userId/collections', collectionController.getUserCollections);
      await request(a).get('/users/notanid/collections').expect(500);
    });
  });

  // ── getCollectionById ──────────────────────────────────────────────────────
  describe('getCollectionById', () => {
    test('owner can access their private collection', async () => {
      const col = await Collection.create({ user: user._id, name: 'Priv', isPublic: false });
      const a = app1(user._id, 'get', '/collections/:collectionId', collectionController.getCollectionById);
      const res = await request(a).get(`/collections/${col._id}`).expect(200);
      expect(String(res.body._id)).toBe(String(col._id));
    });

    test('unknown id → 404', async () => {
      const a = app1(user._id, 'get', '/collections/:collectionId', collectionController.getCollectionById);
      await request(a).get(`/collections/${new mongoose.Types.ObjectId()}`).expect(404);
    });

    test('private collection of another user → 403', async () => {
      const other = await makeUser();
      const col = await Collection.create({ user: other._id, name: 'TheirPriv', isPublic: false });
      const a = app1(user._id, 'get', '/collections/:collectionId', collectionController.getCollectionById);
      await request(a).get(`/collections/${col._id}`).expect(403);
    });

    test('any user can access a public collection', async () => {
      const other = await makeUser();
      const col = await Collection.create({ user: other._id, name: 'TheirPub', isPublic: true, visibility: 'Public' });
      const a = app1(user._id, 'get', '/collections/:collectionId', collectionController.getCollectionById);
      await request(a).get(`/collections/${col._id}`).expect(200);
    });
  });

  // ── updateCollection ───────────────────────────────────────────────────────
  describe('updateCollection', () => {
    test('owner can update name and isPublic', async () => {
      const col = await Collection.create({ user: user._id, name: 'Old', isPublic: true });
      const a = app1(user._id, 'put', '/collections/:collectionId', collectionController.updateCollection);
      const res = await request(a)
        .put(`/collections/${col._id}`)
        .send({ name: 'New', isPublic: false })
        .expect(200);
      expect(res.body.name).toBe('New');
    });

    test('non-owner → 404 (IDOR hardening: never leaks existence)', async () => {
      const other = await makeUser();
      const col = await Collection.create({ user: other._id, name: 'NotMine', isPublic: true });
      const a = app1(user._id, 'put', '/collections/:collectionId', collectionController.updateCollection);
      await request(a).put(`/collections/${col._id}`).send({ name: 'Hack' }).expect(404);
    });
  });

  // ── deleteCollection ───────────────────────────────────────────────────────
  describe('deleteCollection', () => {
    test('owner can delete their collection', async () => {
      const col = await Collection.create({ user: user._id, name: 'Del', isPublic: true });
      const a = app1(user._id, 'delete', '/collections/:collectionId', collectionController.deleteCollection);
      await request(a).delete(`/collections/${col._id}`).expect(200);
      expect(await Collection.findById(col._id)).toBeNull();
    });

    test('non-owner → 404 (IDOR hardening)', async () => {
      const other = await makeUser();
      const col = await Collection.create({ user: other._id, name: 'NotMine', isPublic: true });
      const a = app1(user._id, 'delete', '/collections/:collectionId', collectionController.deleteCollection);
      await request(a).delete(`/collections/${col._id}`).expect(404);
    });
  });

  // ── addCoinToCollection ────────────────────────────────────────────────────
  describe('addCoinToCollection', () => {
    test('adds a coin to the owner\'s collection', async () => {
      const col = await Collection.create({ user: user._id, name: 'Holder', isPublic: true });
      const coin = await Coin.create({ ...coinFixtures.validCoin, _id: 'collection_add_coin' });
      const a = app1(user._id, 'post', '/collections/:collectionId/coins', collectionController.addCoinToCollection);
      const res = await request(a)
        .post(`/collections/${col._id}/coins`)
        .send({ coin: String(coin._id) })   // controller reads req.body.coin
        .expect(200);
      const coinIds = res.body.coins.map(c => String(c.coin?._id || c.coin || c._id));
      expect(coinIds).toContain(String(coin._id));
    });
  });

  // ── removeCoinFromCollection ───────────────────────────────────────────────
  describe('removeCoinFromCollection', () => {
    test('removes a coin that was in the collection', async () => {
      const coin = await Coin.create({ ...coinFixtures.validCoinRIC8, _id: 'collection_remove_coin' });
      const col = await Collection.create({
        user: user._id, name: 'WithCoin', isPublic: true,
        coins: [{ coin: coin._id }],
      });
      const a = app1(user._id, 'delete', '/collections/:collectionId/coins/:coinId', collectionController.removeCoinFromCollection);
      const res = await request(a).delete(`/collections/${col._id}/coins/${coin._id}`).expect(200);
      expect(res.body.coins).toHaveLength(0);
    });
  });

  // ── updateCoinInCollection ─────────────────────────────────────────────────
  describe('updateCoinInCollection', () => {
    test('owner can update a coin entry in their collection', async () => {
      const coin = await Coin.create({ ...coinFixtures.validCoinRIC8, _id: 'collection_update_coin' });
      const col = await Collection.create({
        user: user._id,
        name: 'Editable',
        isPublic: true,
        coins: [{ coin: coin._id, notes: 'Before' }],
      });
      const entryId = col.coins[0]._id;
      const a = app1(user._id, 'put', '/collections/:collectionId/coins/:coinId', collectionController.updateCoinInCollection);

      const res = await request(a)
        .put(`/collections/${col._id}/coins/${entryId}`)
        .send({ notes: 'After' })
        .expect(200);

      const entry = res.body.coins.find(c => String(c._id) === String(entryId));
      expect(entry.notes).toBe('After');
    });

    test('non-owner cannot update a public collection coin entry', async () => {
      const other = await makeUser();
      const coin = await Coin.create({ ...coinFixtures.validCoin, _id: 'collection_update_not_mine_coin' });
      const col = await Collection.create({
        user: other._id,
        name: 'NotMine',
        isPublic: true,
        visibility: 'Public',
        coins: [{ coin: coin._id, notes: 'Original' }],
      });
      const entryId = col.coins[0]._id;
      const a = app1(user._id, 'put', '/collections/:collectionId/coins/:coinId', collectionController.updateCoinInCollection);

      await request(a)
        .put(`/collections/${col._id}/coins/${entryId}`)
        .send({ notes: 'Hacked' })
        .expect(404);

      const unchanged = await Collection.findById(col._id).lean();
      expect(unchanged.coins[0].notes).toBe('Original');
    });
  });
});
