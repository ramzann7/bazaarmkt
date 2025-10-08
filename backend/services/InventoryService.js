/**
 * Inventory Service
 * Handles inventory restoration and management
 */

const BaseService = require('./BaseService');

class InventoryService extends BaseService {
  constructor(db) {
    super(db);
    this.productsCollection = 'products';
    this.artisansCollection = 'artisans';
    this.usersCollection = 'users';
  }

  /**
   * Restore inventory for a product
   */
  async restoreInventory(productId, userId) {
    if (!this.isValidObjectId(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    // Get product details
    const product = await this.findById(this.productsCollection, productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Check if user is the product owner
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan || product.artisan.toString() !== artisan._id.toString()) {
      throw new Error('Unauthorized: You can only restore your own products');
    }
    
    // Check if product is already active
    if (product.status === 'active') {
      throw new Error('Product is already active');
    }
    
    // Restore product
    const result = await this.getCollection(this.productsCollection).updateOne(
      { _id: this.createObjectId(productId) },
      {
        $set: {
          status: 'active',
          restoredAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('Failed to restore product');
    }
    
    return {
      productId: productId,
      status: 'restored',
      restoredAt: new Date(),
      message: 'Product inventory restored successfully'
    };
  }

  /**
   * Get restoration status for a product
   */
  async getRestorationStatus(productId) {
    if (!this.isValidObjectId(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    const product = await this.findById(this.productsCollection, productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    return {
      productId: productId,
      status: product.status,
      isActive: product.status === 'active',
      restoredAt: product.restoredAt || null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  /**
   * Get inventory summary for artisan
   */
  async getInventorySummary(userId) {
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      throw new Error('Artisan profile not found');
    }
    
    const [activeProducts, inactiveProducts, totalProducts] = await Promise.all([
      this.count(this.productsCollection, { 
        artisan: artisan._id, 
        status: 'active' 
      }),
      this.count(this.productsCollection, { 
        artisan: artisan._id, 
        status: 'inactive' 
      }),
      this.count(this.productsCollection, { 
        artisan: artisan._id 
      })
    ]);
    
    return {
      artisanId: artisan._id,
      totalProducts: totalProducts,
      activeProducts: activeProducts,
      inactiveProducts: inactiveProducts,
      restorationRate: totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0
    };
  }

  /**
   * Bulk restore inventory
   */
  async bulkRestoreInventory(productIds, userId) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('Product IDs array is required');
    }
    
    // Validate all product IDs
    const invalidIds = productIds.filter(id => !this.isValidObjectId(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid product IDs: ${invalidIds.join(', ')}`);
    }
    
    // Get artisan
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      throw new Error('Artisan profile not found');
    }
    
    // Check ownership of all products
    const products = await this.find(this.productsCollection, {
      _id: { $in: productIds.map(id => this.createObjectId(id)) },
      artisan: artisan._id
    });
    
    if (products.length !== productIds.length) {
      throw new Error('Some products not found or not owned by you');
    }
    
    // Filter out already active products
    const inactiveProducts = products.filter(p => p.status !== 'active');
    
    if (inactiveProducts.length === 0) {
      return {
        restored: 0,
        alreadyActive: products.length,
        message: 'All products are already active'
      };
    }
    
    // Restore inactive products
    const result = await this.getCollection(this.productsCollection).updateMany(
      {
        _id: { $in: inactiveProducts.map(p => p._id) },
        artisan: artisan._id,
        status: { $ne: 'active' }
      },
      {
        $set: {
          status: 'active',
          restoredAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    return {
      restored: result.modifiedCount,
      alreadyActive: products.length - inactiveProducts.length,
      total: products.length,
      message: `Successfully restored ${result.modifiedCount} products`
    };
  }

  /**
   * Get restoration history
   */
  async getRestorationHistory(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      throw new Error('Artisan profile not found');
    }
    
    const products = await this.aggregate(this.productsCollection, [
      { $match: { artisan: artisan._id } },
      { $sort: { restoredAt: -1, updatedAt: -1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          status: 1,
          restoredAt: 1,
          createdAt: 1,
          updatedAt: 1,
          category: 1,
          price: 1
        }
      }
    ]);
    
    return {
      products,
      count: products.length
    };
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(userId) {
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      throw new Error('Artisan profile not found');
    }
    
    const [statusBreakdown, categoryBreakdown, recentRestorations] = await Promise.all([
      this.aggregate(this.productsCollection, [
        { $match: { artisan: artisan._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.aggregate(this.productsCollection, [
        { $match: { artisan: artisan._id } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      this.aggregate(this.productsCollection, [
        { $match: { artisan: artisan._id, restoredAt: { $exists: true } } },
        { $sort: { restoredAt: -1 } },
        { $limit: 5 },
        { $project: { name: 1, restoredAt: 1, category: 1 } }
      ])
    ]);
    
    return {
      statusBreakdown: statusBreakdown,
      categoryBreakdown: categoryBreakdown,
      recentRestorations: recentRestorations
    };
  }

  /**
   * Check restoration eligibility
   */
  async checkRestorationEligibility(productId, userId) {
    if (!this.isValidObjectId(productId)) {
      return { eligible: false, reason: 'Invalid product ID format' };
    }
    
    const product = await this.findById(this.productsCollection, productId);
    if (!product) {
      return { eligible: false, reason: 'Product not found' };
    }
    
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan || product.artisan.toString() !== artisan._id.toString()) {
      return { eligible: false, reason: 'Unauthorized: You can only restore your own products' };
    }
    
    if (product.status === 'active') {
      return { eligible: false, reason: 'Product is already active' };
    }
    
    return { eligible: true, reason: 'Product is eligible for restoration' };
  }

  /**
   * Get restoration recommendations
   */
  async getRestorationRecommendations(userId) {
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      throw new Error('Artisan profile not found');
    }
    
    // Get inactive products that might benefit from restoration
    const recommendations = await this.aggregate(this.productsCollection, [
      { $match: { artisan: artisan._id, status: 'inactive' } },
      { $sort: { updatedAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          category: 1,
          price: 1,
          updatedAt: 1,
          daysInactive: {
            $divide: [
              { $subtract: [new Date(), '$updatedAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    ]);
    
    return {
      recommendations: recommendations.map(product => ({
        ...product,
        daysInactive: Math.floor(product.daysInactive)
      })),
      count: recommendations.length
    };
  }
}

module.exports = InventoryService;
