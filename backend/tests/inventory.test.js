const request = require('supertest');
const app = require('../server');
const Product = require('../src/models/product');
const inventoryService = require('../src/services/inventoryService');

describe('Inventory Management', () => {
  let authToken;
  let artisan;
  let product;

  beforeEach(async () => {
    artisan = await global.testUtils.createTestArtisan();
    authToken = global.testUtils.generateToken(artisan.user);
    product = await global.testUtils.createTestProduct({ 
      artisan: artisan._id,
      productType: 'made_to_order',
      totalCapacity: 10,
      remainingCapacity: 8,
      capacityPeriod: 'daily'
    });
  });

  describe('Capacity Period Restoration', () => {
    it('should restore capacity for daily period', async () => {
      // Set lastCapacityRestore to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await Product.findByIdAndUpdate(product._id, {
        lastCapacityRestore: yesterday,
        remainingCapacity: 2
      });

      const needsRestore = inventoryService.checkCapacityPeriodRestoration(
        await Product.findById(product._id),
        new Date()
      );

      expect(needsRestore).toBe(true);
    });

    it('should restore capacity for weekly period', async () => {
      // Set lastCapacityRestore to 8 days ago
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      await Product.findByIdAndUpdate(product._id, {
        capacityPeriod: 'weekly',
        lastCapacityRestore: eightDaysAgo,
        remainingCapacity: 3
      });

      const needsRestore = inventoryService.checkCapacityPeriodRestoration(
        await Product.findById(product._id),
        new Date()
      );

      expect(needsRestore).toBe(true);
    });

    it('should restore capacity for monthly period', async () => {
      // Set lastCapacityRestore to last month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      await Product.findByIdAndUpdate(product._id, {
        capacityPeriod: 'monthly',
        lastCapacityRestore: lastMonth,
        remainingCapacity: 1
      });

      const needsRestore = inventoryService.checkCapacityPeriodRestoration(
        await Product.findById(product._id),
        new Date()
      );

      expect(needsRestore).toBe(true);
    });

    it('should not restore capacity if period has not passed', async () => {
      // Set lastCapacityRestore to today
      const today = new Date();
      
      await Product.findByIdAndUpdate(product._id, {
        lastCapacityRestore: today,
        remainingCapacity: 5
      });

      const needsRestore = inventoryService.checkCapacityPeriodRestoration(
        await Product.findById(product._id),
        new Date()
      );

      expect(needsRestore).toBe(false);
    });
  });

  describe('POST /api/products/inventory/restore', () => {
    it('should restore inventory for products that need it', async () => {
      // Create products that need restoration
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Product.findByIdAndUpdate(product._id, {
        lastCapacityRestore: yesterday,
        remainingCapacity: 2
      });

      const response = await request(app)
        .post('/api/products/inventory/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('updates');
      expect(Array.isArray(response.body.updates)).toBe(true);
    });

    it('should not restore inventory without authentication', async () => {
      const response = await request(app)
        .post('/api/products/inventory/restore')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Inventory Updates', () => {
    it('should update product inventory', async () => {
      const updateData = {
        stock: 15,
        totalCapacity: 20,
        remainingCapacity: 18
      };

      const response = await request(app)
        .put(`/api/products/${product._id}/inventory`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify inventory was updated
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(updateData.stock);
      expect(updatedProduct.totalCapacity).toBe(updateData.totalCapacity);
      expect(updatedProduct.remainingCapacity).toBe(updateData.remainingCapacity);
    });

    it('should validate inventory data', async () => {
      const invalidData = {
        stock: -5, // Invalid negative stock
        totalCapacity: -10 // Invalid negative capacity
      };

      const response = await request(app)
        .put(`/api/products/${product._id}/inventory`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });
});
