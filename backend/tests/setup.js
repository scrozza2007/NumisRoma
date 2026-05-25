/**
 * Jest Test Setup
 * Configures testing environment for NumisRoma backend
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const mongoBinaryDir = path.join(process.cwd(), '.cache', 'mongodb-binaries');
fs.mkdirSync(mongoBinaryDir, { recursive: true });
process.env.MONGOMS_DOWNLOAD_DIR = mongoBinaryDir;
process.env.MONGOMS_DISTRO = process.env.MONGOMS_DISTRO || 'ubuntu-20.04';

const defaultSystemMongod = '/usr/bin/mongod';
const systemMongod = process.env.MONGOMS_SYSTEM_BINARY || (
  fs.existsSync(defaultSystemMongod) ? defaultSystemMongod : null
);
if (systemMongod) {
  process.env.MONGOMS_SYSTEM_BINARY = systemMongod;
} else {
  delete process.env.MONGOMS_SYSTEM_BINARY;
}

// Avoid "Possible version conflict" when MONGOMS_VERSION does not match the
// system binary (e.g. 7.0.12 requested vs 6.0.x on PATH).
if (!process.env.MONGOMS_VERSION) {
  try {
    if (systemMongod && fs.existsSync(systemMongod)) {
      const out = execFileSync(systemMongod, ['--version'], {
        encoding: 'utf8',
        timeout: 5000
      });
      const match = out.match(/(?:db version|version)[:\s]+v?(\d+\.\d+\.\d+)/i);
      if (match) {
        process.env.MONGOMS_VERSION = match[1];
      }
    }
  } catch {
    // fall through to default
  }
  if (!process.env.MONGOMS_VERSION) {
    process.env.MONGOMS_VERSION = '7.0.12';
  }
}
process.env.NODE_ENV = 'test';

// Never use a real Redis client in Jest: rate-limit stores would try to connect
// and `jest --coverage` can appear to hang on security middleware tests.
delete process.env.REDIS_URL;
delete process.env.REDIS_HOST;

process.env.JWT_SECRET = 'test_jwt_secret_for_testing_purposes_only_1234567890';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_for_testing_purposes_only_1234567890';
process.env.CSRF_SECRET = 'test_csrf_secret_for_testing_purposes_only_1234567890';
process.env.ADMIN_API_KEY = 'test_admin_api_key_for_testing_purposes_only';

// Global test variables
global.mongoServer = null;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  global.mongoServer = await MongoMemoryServer.create();
  const mongoUri = global.mongoServer.getUri();
  
  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  // Close mongoose connection
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (global.mongoServer) {
    await global.mongoServer.stop();
  }
});

// Clear database between tests
beforeEach(async () => {
  // Get all collections
  const collections = await mongoose.connection.db.collections();
  
  // Clear all collections
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);
