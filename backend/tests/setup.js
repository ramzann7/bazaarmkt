const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test utilities
global.testUtils = {
  // Create test user
  createTestUser: async (userData = {}) => {
    const User = require('../src/models/user');
    const defaultUser = {
      email: 'test@bazaarmkt.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'artisan',
      ...userData
    };
    return await User.create(defaultUser);
  },

  // Create test artisan
  createTestArtisan: async (artisanData = {}) => {
    const Artisan = require('../src/models/artisan');
    const user = await global.testUtils.createTestUser();
    const defaultArtisan = {
      user: user._id,
      artisanName: 'Test Artisan',
      businessName: 'Test Business',
      type: 'individual',
      ...artisanData
    };
    return await Artisan.create(defaultArtisan);
  },

  // Create test product
  createTestProduct: async (productData = {}) => {
    const Product = require('../src/models/product');
    const artisan = await global.testUtils.createTestArtisan();
    const defaultProduct = {
      name: 'Test Product',
      description: 'Test Description',
      price: 10.99,
      category: 'food_beverages',
      subcategory: 'baked_goods',
      productType: 'ready_to_ship',
      stock: 10,
      artisan: artisan._id,
      ...productData
    };
    return await Product.create(defaultProduct);
  },

  // Generate JWT token
  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  }
};
