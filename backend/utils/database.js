/**
 * Simplified Database Connection Utility for Serverless Environment
 * Optimized for Vercel deployment with minimal overhead
 */

const { MongoClient, ObjectId } = require('mongodb');

// Global cache for serverless function reuse
let cachedClient = null;

/**
 * Get or create a MongoDB connection optimized for serverless
 * @returns {Promise<MongoClient>}
 */
async function connectToDatabase() {
  // Simple check for existing connection without async operations during import
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    // Create new connection with serverless-optimized settings
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 1, // Serverless optimized - single connection
      serverSelectionTimeoutMS: 5000,
      maxIdleTimeMS: 30000,
      bufferMaxEntries: 0,
      bufferCommands: false
    });

    cachedClient = await client.connect();
    return cachedClient;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    cachedClient = null;
    throw error;
  }
}

/**
 * Execute a database operation with automatic connection management
 * @param {Function} operation - Async function that receives client and db
 * @returns {Promise<any>} - Result of the operation
 */
async function withDatabase(operation) {
  try {
    const client = await connectToDatabase();
    const db = client.db();
    return await operation({ client, db });
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  withDatabase,
  ObjectId
};
