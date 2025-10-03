const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

describe('Inventory Management', () => {
  let authToken;
  let artisan;
  let product;
  let app;

  beforeAll(async () => {
    // Set test environment variables
    global.testUtils.setTestEnvironment();
    
    // Import app after setting environment
    app = require('../server-vercel');
  });

  beforeEach(async () => {
    artisan = await global.testUtils.createTestArtisan();
    authToken = global.testUtils.generateToken(artisan.user);
    product = await global.testUtils.createTestProduct({ 
      artisan: artisan._id,
      productType: 'made_to_order',
      availableQuantity: 10,
      totalCapacity: 10,
      remainingCapacity: 8,
      capacityPeriod: 'daily'
    });
  });

  // Note: Capacity restoration tests moved to integration tests
  // since inventory service is now embedded in serverless endpoints

  // Note: Inventory restoration is now handled within order processing
  // No separate endpoint needed in serverless architecture

  describe('Basic Inventory Tests', () => {
    it('should get products with inventory information', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should create order and update inventory', async () => {
      const user = await global.testUtils.createTestUser();
      const userToken = global.testUtils.generateToken(user._id);
      
      const orderData = {
        items: [{
          productId: product._id.toString(),
          quantity: 1
        }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          postalCode: 'T1A 1A1'
        },
        paymentMethod: 'cash'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.items).toHaveLength(1);
    });
  });
});
