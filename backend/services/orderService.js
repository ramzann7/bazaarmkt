/**
 * Order Service - Microservices Foundation
 * Handles order creation, management, and order-related operations
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class OrderService {
  constructor() {
    this.serviceName = 'order-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Order Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Order Service already initialized');
      return;
    }

    try {
      // Validate environment configuration
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      // Check for production warnings
      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      }

      // Test database connection
      await dbManager.connect();
      console.log('✅ Order Service database connected');

      // Test cache connection
      await CacheService.healthCheck();
      console.log('✅ Order Service cache connected');

      this.isInitialized = true;
      console.log('✅ Order Service initialized successfully');
    } catch (error) {
      console.error('❌ Order Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create new order
   */
  async createOrder(orderData, userId) {
    try {
      const {
        items,
        shippingAddress,
        paymentMethod = 'cash',
        notes = ''
      } = orderData;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }

      // Calculate total amount
      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const { productId, quantity, productName, productPrice, artisanId } = item;
        
        if (!productId || !quantity || !productName || !productPrice) {
          throw new Error('Each item must have productId, quantity, productName, and productPrice');
        }

        const itemTotal = parseFloat(productPrice) * parseInt(quantity);
        totalAmount += itemTotal;

        processedItems.push({
          productId: require('mongodb').ObjectId(productId),
          productName,
          productPrice: parseFloat(productPrice),
          quantity: parseInt(quantity),
          itemTotal,
          artisanId: require('mongodb').ObjectId(artisanId)
        });
      }

      // Create order object
      const order = {
        userId: require('mongodb').ObjectId(userId),
        items: processedItems,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        status: 'pending',
        shippingAddress,
        paymentMethod,
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const db = await dbManager.connect();
      const ordersCollection = db.collection('orders');
      const result = await ordersCollection.insertOne(order);

      if (!result.insertedId) {
        throw new Error('Failed to create order');
      }

      order._id = result.insertedId;

      console.log(`✅ Order created: ${order._id}`);
      return {
        success: true,
        message: 'Order created successfully',
        data: order
      };
    } catch (error) {
      console.error('❌ Create order failed:', error);
      throw error;
    }
  }

  /**
   * Get orders for a user
   */
  async getUserOrders(userId, filters = {}) {
    try {
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = { userId: require('mongodb').ObjectId(userId) };
      if (status) query.status = status;

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate skip
      const skip = (page - 1) * limit;

      // Get orders from database
      const db = await dbManager.connect();
      const ordersCollection = db.collection('orders');
      
      const [orders, totalCount] = await Promise.all([
        ordersCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        ordersCollection.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      console.log(`✅ User orders retrieved: ${orders.length}/${totalCount}`);
      return {
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit
          }
        }
      };
    } catch (error) {
      console.error('❌ Get user orders failed:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId, userId = null) {
    try {
      // Check cache first
      const cacheKey = `order:${orderId}`;
      let order = await CacheService.get(cacheKey);

      if (!order) {
        // Build query
        const query = { _id: require('mongodb').ObjectId(orderId) };
        if (userId) query.userId = require('mongodb').ObjectId(userId);

        // Get from database
        const db = await dbManager.connect();
        const ordersCollection = db.collection('orders');
        order = await ordersCollection.findOne(query);

        if (order) {
          // Cache order for 15 minutes
          await CacheService.set(cacheKey, order, 900);
        }
      }

      if (!order) {
        throw new Error('Order not found');
      }

      console.log(`✅ Order retrieved: ${order._id}`);
      return {
        success: true,
        data: order
      };
    } catch (error) {
      console.error('❌ Get order by ID failed:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, userId = null) {
    try {
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Build query
      const query = { _id: require('mongodb').ObjectId(orderId) };
      if (userId) query.userId = require('mongodb').ObjectId(userId);

      // Update in database
      const db = await dbManager.connect();
      const ordersCollection = db.collection('orders');
      const result = await ordersCollection.updateOne(
        query,
        { 
          $set: { 
            status,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Order not found or not owned by user');
      }

      // Invalidate cache
      const cacheKey = `order:${orderId}`;
      await CacheService.del(cacheKey);

      console.log(`✅ Order status updated: ${orderId} -> ${status}`);
      return {
        success: true,
        message: 'Order status updated successfully'
      };
    } catch (error) {
      console.error('❌ Update order status failed:', error);
      throw error;
    }
  }

  /**
   * Get orders for artisan
   */
  async getArtisanOrders(artisanId, filters = {}) {
    try {
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = { 'items.artisanId': require('mongodb').ObjectId(artisanId) };
      if (status) query.status = status;

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate skip
      const skip = (page - 1) * limit;

      // Get orders from database
      const db = await dbManager.connect();
      const ordersCollection = db.collection('orders');
      
      const [orders, totalCount] = await Promise.all([
        ordersCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        ordersCollection.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      console.log(`✅ Artisan orders retrieved: ${orders.length}/${totalCount}`);
      return {
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit
          }
        }
      };
    } catch (error) {
      console.error('❌ Get artisan orders failed:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(userId = null, artisanId = null) {
    try {
      const db = await dbManager.connect();
      const ordersCollection = db.collection('orders');

      // Build base query
      const baseQuery = {};
      if (userId) baseQuery.userId = require('mongodb').ObjectId(userId);
      if (artisanId) baseQuery['items.artisanId'] = require('mongodb').ObjectId(artisanId);

      // Get statistics
      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue
      ] = await Promise.all([
        ordersCollection.countDocuments(baseQuery),
        ordersCollection.countDocuments({ ...baseQuery, status: 'pending' }),
        ordersCollection.countDocuments({ ...baseQuery, status: 'confirmed' }),
        ordersCollection.countDocuments({ ...baseQuery, status: 'delivered' }),
        ordersCollection.countDocuments({ ...baseQuery, status: 'cancelled' }),
        ordersCollection.aggregate([
          { $match: { ...baseQuery, status: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).toArray()
      ]);

      const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

      console.log(`✅ Order statistics retrieved`);
      return {
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          confirmedOrders,
          deliveredOrders,
          cancelledOrders,
          totalRevenue: parseFloat(revenue.toFixed(2))
        }
      };
    } catch (error) {
      console.error('❌ Get order statistics failed:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, userId) {
    try {
      // Check if order exists and belongs to user
      const orderResult = await this.getOrderById(orderId, userId);
      if (!orderResult.success) {
        throw new Error('Order not found or not owned by user');
      }

      const order = orderResult.data;
      
      // Check if order can be cancelled
      if (order.status === 'cancelled') {
        throw new Error('Order is already cancelled');
      }
      
      if (order.status === 'delivered') {
        throw new Error('Cannot cancel delivered order');
      }

      // Update order status to cancelled
      const result = await this.updateOrderStatus(orderId, 'cancelled', userId);
      
      console.log(`✅ Order cancelled: ${orderId}`);
      return result;
    } catch (error) {
      console.error('❌ Cancel order failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Order Service
   */
  async healthCheck() {
    try {
      const start = Date.now();
      
      // Test database connection
      const db = await dbManager.connect();
      const ordersCollection = db.collection('orders');
      await ordersCollection.findOne({}, { projection: { _id: 1 } });
      
      // Test cache
      const cacheKey = 'health-check:order-service';
      await CacheService.set(cacheKey, { test: true }, 60);
      const cached = await CacheService.get(cacheKey);
      await CacheService.del(cacheKey);
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: responseTime,
        metadata: {
          database: 'connected',
          cache: cached ? 'working' : 'failed',
          responseTime: `${responseTime}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        metadata: { timestamp: new Date().toISOString() }
      };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.serviceName,
      version: this.version,
      initialized: this.isInitialized,
      endpoints: [
        'POST /api/orders',
        'GET /api/orders',
        'GET /api/orders/:id',
        'PUT /api/orders/:id/status',
        'GET /api/orders/artisan/:artisanId',
        'GET /api/orders/stats',
        'DELETE /api/orders/:id/cancel'
      ]
    };
  }
}

// Export singleton instance
module.exports = new OrderService();
