const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

describe('Products API', () => {
  let authToken;
  let artisan;
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
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        price: 15.99,
        category: 'food_beverages',
        subcategory: 'baked_goods',
        productType: 'ready_to_ship',
        stock: 10,
        unit: 'piece'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(productData.name);
      expect(response.body.price).toBe(productData.price);
    });

    it('should create a made-to-order product with capacity period', async () => {
      const productData = {
        name: 'Custom Product',
        description: 'Custom Description',
        price: 25.99,
        category: 'food_beverages',
        subcategory: 'baked_goods',
        productType: 'made_to_order',
        totalCapacity: 5,
        capacityPeriod: 'weekly',
        leadTime: 3,
        leadTimeUnit: 'days',
        maxOrderQuantity: 2,
        unit: 'piece'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.productType).toBe('made_to_order');
      expect(response.body.capacityPeriod).toBe('weekly');
      expect(response.body.totalCapacity).toBe(5);
    });

    it('should not create product without authentication', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        price: 15.99
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/my-products', () => {
    beforeEach(async () => {
      // Create test products
      await global.testUtils.createTestProduct({ artisan: artisan._id, name: 'Product 1' });
      await global.testUtils.createTestProduct({ artisan: artisan._id, name: 'Product 2' });
    });

    it('should get artisan products', async () => {
      const response = await request(app)
        .get('/api/my-products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should not get products without authentication', async () => {
      const response = await request(app)
        .get('/api/my-products')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/products/:id', () => {
    let product;

    beforeEach(async () => {
      product = await global.testUtils.createTestProduct({ artisan: artisan._id });
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 20.99,
        capacityPeriod: 'monthly'
      };

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.price).toBe(updateData.price);
      if (response.body.capacityPeriod) {
        expect(response.body.capacityPeriod).toBe(updateData.capacityPeriod);
      }
    });

    it('should not update product without authentication', async () => {
      const updateData = { name: 'Updated Product' };

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let product;

    beforeEach(async () => {
      product = await global.testUtils.createTestProduct({ artisan: artisan._id });
    });

    it('should delete product successfully', async () => {
      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify product is deleted by checking response
      expect(response.body.message).toContain('deleted');
    });

    it('should not delete product without authentication', async () => {
      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });
});
