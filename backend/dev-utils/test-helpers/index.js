/**
 * Test Helpers for Serverless Architecture Development
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Database helper utilities
 */
class DatabaseHelper {
  constructor(connectionUri) {
    this.connectionUri = connectionUri;
  }

  async connect() {
    this.client = new MongoClient(this.connectionUri);
    await this.client.connect();
    this.db = this.client.db();
    return this.db;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
  }

  async clearCollection(collectionName) {
    const collection = this.db.collection(collectionName);
    await collection.deleteMany({});
  }

  async clearAllCollections() {
    const collections = await this.db.listCollections().toArray();
    for (const collection of collections) {
      await this.clearCollection(collection.name);
    }
  }

  async insertTestData(collectionName, data) {
    const collection = this.db.collection(collectionName);
    if (Array.isArray(data)) {
      const result = await collection.insertMany(data);
      return result.insertedIds;
    } else {
      const result = await collection.insertOne(data);
      return result.insertedId;
    }
  }

  async findOne(collectionName, query) {
    const collection = this.db.collection(collectionName);
    return await collection.findOne(query);
  }

  async countDocuments(collectionName, query = {}) {
    const collection = this.db.collection(collectionName);
    return await collection.countDocuments(query);
  }
}

/**
 * Authentication helper utilities
 */
class AuthHelper {
  static generateToken(userId, expiresIn = '1h') {
    return jwt.sign(
      { userId: userId.toString() },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn }
    );
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generateTestUserData(overrides = {}) {
    return {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      userType: 'customer',
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static generateTestArtisanData(userId, overrides = {}) {
    return {
      user: userId,
      artisanName: 'Test Artisan',
      businessName: 'Test Business',
      type: 'individual',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static generateTestProductData(artisanId, overrides = {}) {
    return {
      name: 'Test Product',
      description: 'Test product description',
      price: 19.99,
      category: 'food_beverages',
      subcategory: 'baked_goods',
      availableQuantity: 10,
      status: 'active',
      artisan: artisanId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
}

/**
 * API testing utilities
 */
class APIHelper {
  constructor(app) {
    this.app = app;
    this.request = require('supertest')(app);
  }

  async authenticatedRequest(method, endpoint, token, data = null) {
    let request = this.request[method.toLowerCase()](endpoint);
    
    if (token) {
      request = request.set('Authorization', `Bearer ${token}`);
    }
    
    if (data) {
      request = request.send(data);
    }
    
    return request;
  }

  async createTestUser(userData = {}) {
    const testData = AuthHelper.generateTestUserData(userData);
    testData.password = await AuthHelper.hashPassword(testData.password);
    
    // You would typically insert this into test database
    // This is a mock implementation
    return {
      _id: new ObjectId(),
      ...testData
    };
  }

  async loginTestUser(email, password) {
    const response = await this.request
      .post('/api/auth/login')
      .send({ email, password });
    
    return response.body;
  }

  async registerTestUser(userData = {}) {
    const testData = AuthHelper.generateTestUserData(userData);
    
    const response = await this.request
      .post('/api/auth/register')
      .send(testData);
    
    return response.body;
  }
}

/**
 * Mock data generators
 */
class MockDataGenerator {
  static users(count = 1) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(AuthHelper.generateTestUserData({
        email: `user${i}@example.com`
      }));
    }
    return count === 1 ? users[0] : users;
  }

  static artisans(userIds, count = 1) {
    const artisans = [];
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    
    for (let i = 0; i < count; i++) {
      const userId = ids[i] || ids[0];
      artisans.push(AuthHelper.generateTestArtisanData(userId, {
        artisanName: `Artisan ${i + 1}`,
        businessName: `Business ${i + 1}`
      }));
    }
    return count === 1 ? artisans[0] : artisans;
  }

  static products(artisanIds, count = 1) {
    const products = [];
    const ids = Array.isArray(artisanIds) ? artisanIds : [artisanIds];
    
    for (let i = 0; i < count; i++) {
      const artisanId = ids[i] || ids[0];
      products.push(AuthHelper.generateTestProductData(artisanId, {
        name: `Product ${i + 1}`,
        price: 10 + (i * 5)
      }));
    }
    return count === 1 ? products[0] : products;
  }

  static orders(userId, productData, count = 1) {
    const orders = [];
    
    for (let i = 0; i < count; i++) {
      orders.push({
        userId: userId,
        items: Array.isArray(productData) ? productData : [productData],
        totalAmount: Array.isArray(productData) 
          ? productData.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          : productData.price * productData.quantity,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return count === 1 ? orders[0] : orders;
  }
}

module.exports = {
  DatabaseHelper,
  AuthHelper,
  APIHelper,
  MockDataGenerator
};
