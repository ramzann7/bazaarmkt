/**
 * Database Manager - Optimized connection pooling and management
 * Handles MongoDB connections with pooling, caching, and optimization
 */

const { MongoClient } = require('mongodb');

class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.connectionPool = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Establish database connection with optimized settings
   */
  async connect() {
    if (this.isConnected && this.client) {
      return this.db;
    }

    try {
      const isProduction = process.env.NODE_ENV === 'production';
      
      const options = {
        maxPoolSize: isProduction ? 20 : 10,
        minPoolSize: isProduction ? 5 : 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        // Enable connection pooling
        maxIdleTimeMS: 30000,
        // Compression for better performance
        compressors: ['zlib'],
        // Read preferences for better performance
        readPreference: 'secondaryPreferred'
      };

      this.client = new MongoClient(process.env.MONGODB_URI, options);
      await this.client.connect();
      this.db = this.client.db();
      this.isConnected = true;
      this.retryCount = 0;

      console.log('✅ Database connected successfully');
      return this.db;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        console.log(`🔄 Retrying database connection (${this.retryCount}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));
        return this.connect();
      }
      
      throw error;
    }
  }

  /**
   * Get a collection with optimized access
   */
  async getCollection(name) {
    const db = await this.connect();
    return db.collection(name);
  }

  /**
   * Execute a database operation with error handling
   */
  async executeOperation(operation, collectionName) {
    try {
      const collection = await this.getCollection(collectionName);
      return await operation(collection);
    } catch (error) {
      console.error(`❌ Database operation failed on ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const db = this.db;
      await db.admin().ping();
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.isConnected = false;
        console.log('✅ Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const db = await this.connect();
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager();
