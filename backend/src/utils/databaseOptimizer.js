import mongoose from 'mongoose';
import enhancedLogger from './logger.js';
import { config } from '../config/environment.js';

// Database optimization utilities
export class DatabaseOptimizer {
  constructor() {
    this.connection = mongoose.connection;
  }

  // Create optimal indexes for collections
  async createIndexes() {
    try {
      enhancedLogger.info('Starting database optimization...');

      // User collection indexes
      await this.optimizeUserCollection();
      
      // Product collection indexes
      await this.optimizeProductCollection();
      
      // Order collection indexes
      await this.optimizeOrderCollection();
      
      // Review collection indexes
      await this.optimizeReviewCollection();
      
      // Artisan collection indexes
      await this.optimizeArtisanCollection();
      
      // Search optimization indexes
      await this.optimizeSearchIndexes();

      enhancedLogger.info('Database optimization completed successfully');
    } catch (error) {
      enhancedLogger.error('Database optimization failed', { error: error.message });
      throw error;
    }
  }

  // Optimize user collection
  async optimizeUserCollection() {
    const userCollection = this.connection.collection('users');
    
    const indexes = [
      // Email index (unique for non-guest users)
      { key: { email: 1 }, unique: false, sparse: true },
      
      // Role-based queries
      { key: { role: 1 } },
      
      // Guest user queries
      { key: { isGuest: 1 } },
      
      // Location-based queries
      { key: { 'address.city': 1, 'address.state': 1 } },
      
      // Authentication queries
      { key: { email: 1, password: 1 } },
      
      // Profile queries
      { key: { userName: 1 } },
      
      // Phone queries
      { key: { phone: 1 } },
      
      // Created date queries
      { key: { createdAt: -1 } },
      
      // Updated date queries
      { key: { updatedAt: -1 } }
    ];

    for (const index of indexes) {
      try {
        await userCollection.createIndex(index.key, {
          unique: index.unique || false,
          sparse: index.sparse || false,
          background: true
        });
        enhancedLogger.debug(`Created user index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        if (error.code !== 85) { // Index already exists
          enhancedLogger.warn(`Failed to create user index: ${JSON.stringify(index.key)}`, { error: error.message });
        }
      }
    }
  }

  // Optimize product collection
  async optimizeProductCollection() {
    const productCollection = this.connection.collection('products');
    
    const indexes = [
      // Category and subcategory queries
      { key: { category: 1, subcategory: 1 } },
      
      // Price range queries
      { key: { price: 1 } },
      
      // Status and availability
      { key: { status: 1, isActive: 1 } },
      
      // Featured products
      { key: { isFeatured: 1, isActive: 1 } },
      
      // Dietary restrictions
      { key: { isOrganic: 1, isGlutenFree: 1, isVegan: 1, isHalal: 1 } },
      
      // Product type and scheduling
      { key: { productType: 1, scheduleType: 1 } },
      
      // Lead time queries
      { key: { leadTimeHours: 1 } },
      
      // Expiry date queries
      { key: { expiryDate: 1 } },
      
      // Tags for search
      { key: { tags: 1 } },
      
      // Artisan queries
      { key: { artisan: 1 } },
      
      // Created and updated dates
      { key: { createdAt: -1 } },
      { key: { updatedAt: -1 } },
      
      // Sold count for popularity
      { key: { soldCount: -1 } },
      
      // Text search index
      { key: { name: 'text', description: 'text', tags: 'text' } }
    ];

    for (const index of indexes) {
      try {
        if (index.key.name === 'text') {
          await productCollection.createIndex(index.key, {
            background: true,
            weights: {
              name: 10,
              description: 5,
              tags: 3
            }
          });
        } else {
          await productCollection.createIndex(index.key, {
            background: true
          });
        }
        enhancedLogger.debug(`Created product index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        if (error.code !== 85) {
          enhancedLogger.warn(`Failed to create product index: ${JSON.stringify(index.key)}`, { error: error.message });
        }
      }
    }
  }

  // Optimize order collection
  async optimizeOrderCollection() {
    const orderCollection = this.connection.collection('orders');
    
    const indexes = [
      // User queries
      { key: { userId: 1 } },
      
      // Guest user queries
      { key: { guestId: 1 } },
      
      // Status queries
      { key: { status: 1 } },
      
      // Date range queries
      { key: { createdAt: -1 } },
      { key: { updatedAt: -1 } },
      { key: { estimatedDelivery: 1 } },
      
      // Delivery method queries
      { key: { deliveryMethod: 1 } },
      
      // Payment method queries
      { key: { paymentMethod: 1 } },
      
      // Artisan queries
      { key: { artisanId: 1 } },
      
      // Order number queries
      { key: { orderNumber: 1 }, unique: true },
      
      // Amount range queries
      { key: { totalAmount: 1 } },
      
      // Location-based queries
      { key: { 'deliveryAddress.city': 1, 'deliveryAddress.state': 1 } },
      
      // Compound indexes for common queries
      { key: { userId: 1, status: 1, createdAt: -1 } },
      { key: { artisanId: 1, status: 1, createdAt: -1 } },
      { key: { status: 1, estimatedDelivery: 1 } }
    ];

    for (const index of indexes) {
      try {
        await orderCollection.createIndex(index.key, {
          unique: index.unique || false,
          background: true
        });
        enhancedLogger.debug(`Created order index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        if (error.code !== 85) {
          enhancedLogger.warn(`Failed to create order index: ${JSON.stringify(index.key)}`, { error: error.message });
        }
      }
    }
  }

  // Optimize review collection
  async optimizeReviewCollection() {
    const reviewCollection = this.connection.collection('reviews');
    
    const indexes = [
      // Product queries
      { key: { productId: 1 } },
      
      // User queries
      { key: { userId: 1 } },
      
      // Rating queries
      { key: { rating: 1 } },
      
      // Date queries
      { key: { createdAt: -1 } },
      { key: { updatedAt: -1 } },
      
      // Compound indexes
      { key: { productId: 1, rating: 1 } },
      { key: { productId: 1, createdAt: -1 } },
      { key: { userId: 1, createdAt: -1 } }
    ];

    for (const index of indexes) {
      try {
        await reviewCollection.createIndex(index.key, { background: true });
        enhancedLogger.debug(`Created review index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        if (error.code !== 85) {
          enhancedLogger.warn(`Failed to create review index: ${JSON.stringify(index.key)}`, { error: error.message });
        }
      }
    }
  }

  // Optimize artisan collection
  async optimizeArtisanCollection() {
    const artisanCollection = this.connection.collection('artisans');
    
    const indexes = [
      // Type queries
      { key: { type: 1 } },
      
      // Status queries
      { key: { status: 1, isActive: 1 } },
      
      // Location queries
      { key: { 'address.city': 1, 'address.state': 1 } },
      
      // Coordinates for geospatial queries
      { key: { coordinates: '2dsphere' } },
      
      // Rating queries
      { key: { rating: -1 } },
      
      // Review count queries
      { key: { reviewCount: -1 } },
      
      // Featured artisans
      { key: { isFeatured: 1, isActive: 1 } },
      
      // Delivery options
      { key: { 'deliveryOptions.delivery': 1, 'deliveryOptions.pickup': 1 } },
      
      // Created and updated dates
      { key: { createdAt: -1 } },
      { key: { updatedAt: -1 } },
      
      // Text search
      { key: { artisanName: 'text', description: 'text', tags: 'text' } }
    ];

    for (const index of indexes) {
      try {
        if (index.key.coordinates === '2dsphere') {
          await artisanCollection.createIndex({ coordinates: '2dsphere' }, { background: true });
        } else if (index.key.artisanName === 'text') {
          await artisanCollection.createIndex({ artisanName: 'text', description: 'text', tags: 'text' }, {
            background: true,
            weights: {
              artisanName: 10,
              description: 5,
              tags: 3
            }
          });
        } else {
          await artisanCollection.createIndex(index.key, { background: true });
        }
        enhancedLogger.debug(`Created artisan index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        if (error.code !== 85) {
          enhancedLogger.warn(`Failed to create artisan index: ${JSON.stringify(index.key)}`, { error: error.message });
        }
      }
    }
  }

  // Optimize search indexes
  async optimizeSearchIndexes() {
    // Create compound indexes for common search patterns
    const collections = ['products', 'artisans'];
    
    for (const collectionName of collections) {
      const collection = this.connection.collection(collectionName);
      
      try {
        // Compound index for category + price + location searches
        await collection.createIndex({
          category: 1,
          subcategory: 1,
          price: 1,
          status: 1,
          isActive: 1
        }, { background: true });
        
        enhancedLogger.debug(`Created compound search index for ${collectionName}`);
      } catch (error) {
        if (error.code !== 85) {
          enhancedLogger.warn(`Failed to create compound search index for ${collectionName}`, { error: error.message });
        }
      }
    }
  }

  // Analyze index usage and performance
  async analyzeIndexUsage() {
    try {
      const collections = ['users', 'products', 'orders', 'reviews', 'artisans'];
      const analysis = {};

      for (const collectionName of collections) {
        const collection = this.connection.collection(collectionName);
        
        // Get index statistics
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();

        // Get collection statistics
        const collStats = await collection.stats();
        
        analysis[collectionName] = {
          indexes: indexStats,
          documentCount: collStats.count,
          size: collStats.size,
          avgObjSize: collStats.avgObjSize,
          storageSize: collStats.storageSize,
          indexSize: collStats.totalIndexSize
        };
      }

      enhancedLogger.info('Index usage analysis completed', { analysis });
      return analysis;
    } catch (error) {
      enhancedLogger.error('Failed to analyze index usage', { error: error.message });
      throw error;
    }
  }

  // Remove unused indexes
  async removeUnusedIndexes() {
    try {
      const collections = ['users', 'products', 'orders', 'reviews', 'artisans'];
      let removedCount = 0;

      for (const collectionName of collections) {
        const collection = this.connection.collection(collectionName);
        
        // Get index statistics
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();

        // Find unused indexes (no operations in last 24 hours)
        const unusedIndexes = indexStats.filter(index => 
          index.accesses.ops === 0 && 
          index.accesses.since > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        // Remove unused indexes (except _id and text indexes)
        for (const index of unusedIndexes) {
          if (index.name !== '_id_' && !index.name.includes('text')) {
            try {
              await collection.dropIndex(index.name);
              enhancedLogger.info(`Removed unused index: ${index.name} from ${collectionName}`);
              removedCount++;
            } catch (error) {
              enhancedLogger.warn(`Failed to remove index: ${index.name}`, { error: error.message });
            }
          }
        }
      }

      enhancedLogger.info(`Index cleanup completed. Removed ${removedCount} unused indexes.`);
      return removedCount;
    } catch (error) {
      enhancedLogger.error('Failed to remove unused indexes', { error: error.message });
      throw error;
    }
  }

  // Get database performance metrics
  async getPerformanceMetrics() {
    try {
      const db = this.connection.db;
      
      // Get database stats
      const dbStats = await db.stats();
      
      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        try {
          const stats = await db.collection(collection.name).stats();
          collectionStats[collection.name] = {
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            indexSize: stats.totalIndexSize,
            indexes: stats.nindexes
          };
        } catch (error) {
          enhancedLogger.warn(`Failed to get stats for collection: ${collection.name}`, { error: error.message });
        }
      }

      const metrics = {
        database: dbStats,
        collections: collectionStats,
        timestamp: new Date().toISOString()
      };

      enhancedLogger.info('Performance metrics collected', { metrics });
      return metrics;
    } catch (error) {
      enhancedLogger.error('Failed to collect performance metrics', { error: error.message });
      throw error;
    }
  }
}

// Export the optimizer class
export default DatabaseOptimizer;
