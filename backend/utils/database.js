/**
 * Shared Database Connection Utility for Serverless Environment
 * 
 * This utility provides a connection pool that persists across serverless function
 * invocations, dramatically reducing connection overhead and improving performance.
 */

const { MongoClient, ObjectId } = require('mongodb');

// Global variables to cache connections across function invocations
let cachedClient = null;
let cachedDb = null;

/**
 * Get or create a MongoDB connection
 * Reuses existing connections to avoid overhead
 * 
 * @returns {Promise<{client: MongoClient, db: Db}>}
 */
async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    try {
      // Verify connection is still alive
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      console.warn('⚠️ Cached connection failed, creating new connection:', error.message);
      // Clear cache if connection is dead
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    console.log('🔗 Creating new MongoDB connection...');
    
    // Create new connection with optimized settings for serverless
    const client = new MongoClient(process.env.MONGODB_URI, {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 1,  // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Timeout settings optimized for serverless
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // Socket timeout
      connectTimeoutMS: 10000, // Connection timeout
      
      // Heartbeat settings
      heartbeatFrequencyMS: 10000, // How often to check server health
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Buffer settings
      bufferMaxEntries: 0, // Disable mongoose buffering for immediate errors
    });

    await client.connect();
    const db = client.db(); // Use default database from connection string
    
    // Cache the connection for reuse
    cachedClient = client;
    cachedDb = db;
    
    console.log('✅ MongoDB connection established and cached');
    
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

/**
 * Execute a database operation with automatic connection management
 * Handles connection, execution, and error management
 * 
 * @param {Function} operation - Async function that receives {client, db}
 * @returns {Promise<any>} - Result of the operation
 */
async function withDatabase(operation) {
  try {
    const { client, db } = await connectToDatabase();
    return await operation({ client, db });
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

/**
 * Gracefully close database connections
 * Should be called during application shutdown
 */
async function closeDatabase() {
  if (cachedClient) {
    try {
      await cachedClient.close();
      console.log('🔒 Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    } finally {
      cachedClient = null;
      cachedDb = null;
    }
  }
}

/**
 * Check database connection health
 * Useful for health checks and monitoring
 * 
 * @returns {Promise<boolean>}
 */
async function isDatabaseHealthy() {
  try {
    const { client } = await connectToDatabase();
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics for monitoring
 * 
 * @returns {Promise<Object>}
 */
async function getDatabaseStats() {
  try {
    const { db } = await connectToDatabase();
    const stats = await db.stats();
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      storageSize: stats.storageSize
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return null;
  }
}

module.exports = {
  connectToDatabase,
  withDatabase,
  closeDatabase,
  isDatabaseHealthy,
  getDatabaseStats,
  ObjectId // Re-export for convenience
};
