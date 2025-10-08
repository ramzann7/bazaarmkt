const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

let mongoServer;
let testDbUri;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  testDbUri = mongoServer.getUri();
  console.log('Test database started:', testDbUri);
});

// Cleanup after each test
afterEach(async () => {
  const client = new MongoClient(testDbUri);
  await client.connect();
  const db = client.db();
  
  // Clear all collections
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
  
  await client.close();
});

// Close database connection after all tests
afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global test utilities - Serverless compatible
global.testUtils = {
  // Get test database URI
  getTestDbUri: () => testDbUri,
  
  // Create test user with native MongoDB
  createTestUser: async (userData = {}) => {
    const client = new MongoClient(testDbUri);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const hashedPassword = await bcrypt.hash(userData.password || 'password123', 12);
    
    const defaultUser = {
      email: userData.email || 'test@bazaarmkt.com',
      password: hashedPassword,
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      userType: userData.userType || 'customer',
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData
    };
    
    const result = await usersCollection.insertOne(defaultUser);
    const user = { ...defaultUser, _id: result.insertedId };
    
    await client.close();
    return user;
  },

  // Create test artisan
  createTestArtisan: async (artisanData = {}) => {
    const client = new MongoClient(testDbUri);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    const user = await global.testUtils.createTestUser({ userType: 'artisan' });
    const defaultArtisan = {
      user: user._id,
      artisanName: artisanData.artisanName || 'Test Artisan',
      businessName: artisanData.businessName || 'Test Business', 
      type: artisanData.type || 'individual',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...artisanData
    };
    
    const result = await artisansCollection.insertOne(defaultArtisan);
    const artisan = { ...defaultArtisan, _id: result.insertedId };
    
    await client.close();
    return artisan;
  },

  // Create test product
  createTestProduct: async (productData = {}) => {
    const client = new MongoClient(testDbUri);
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    const artisan = await global.testUtils.createTestArtisan();
    const defaultProduct = {
      name: productData.name || 'Test Product',
      description: productData.description || 'Test Description',
      price: productData.price || 10.99,
      category: productData.category || 'food_beverages',
      subcategory: productData.subcategory || 'baked_goods',
      availableQuantity: productData.availableQuantity || 10,
      status: 'active',
      artisan: artisan._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...productData
    };
    
    const result = await productsCollection.insertOne(defaultProduct);
    const product = { ...defaultProduct, _id: result.insertedId };
    
    await client.close();
    return product;
  },

  // Generate JWT token
  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  },

  // Set test database URI for tests
  setTestEnvironment: () => {
    process.env.MONGODB_URI = testDbUri;
    process.env.JWT_SECRET = 'test-secret-key';
  }
};
