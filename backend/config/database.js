/**
 * Serverless-Optimized Database Configuration
 * MongoDB connection management for Vercel serverless functions
 * 
 * Best Practices:
 * - Single connection per function instance (maxPoolSize: 1)
 * - Connection reuse across invocations
 * - Lazy connection initialization
 * - Automatic reconnection on failure
 * - Fast timeout settings
 */

const { MongoClient } = require('mongodb');

// Global connection state (persists across warm invocations)
let cachedClient = null;
let cachedDb = null;
let isConnecting = false;

/**
 * Serverless-optimized connection options
 * Based on MongoDB and Vercel best practices
 */
const getConnectionOptions = () => {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  
  if (isServerless) {
    return {
      // Connection Pool Settings
      maxPoolSize: 1,              // ONE connection per serverless instance
      minPoolSize: 0,              // No minimum (saves resources)
      maxIdleTimeMS: 10000,        // Close idle connections after 10s
      waitQueueTimeoutMS: 5000,    // Fail fast if pool is busy
      
      // Timeout Settings
      serverSelectionTimeoutMS: 5000,   // 5s to select server (fast fail)
      connectTimeoutMS: 10000,          // 10s to establish connection
      socketTimeoutMS: 45000,           // 45s for operations (Vercel max: 60s)
      heartbeatFrequencyMS: 10000,      // Check connection every 10s
      
      // Reliability Settings
      retryWrites: true,                // Retry failed writes
      retryReads: true,                 // Retry failed reads
      
      // Performance Settings
      compressors: ['zlib'],            // Compress network traffic
      zlibCompressionLevel: 6           // Balance speed vs compression
    };
  }
  
  // Traditional server settings (local development)
  return {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    retryWrites: true,
    retryReads: true
  };
};

/**
 * Check if connection is healthy
 */
const isConnectionHealthy = () => {
  if (!cachedClient || !cachedDb) {
    return false;
  }
  
  try {
    // Check if topology is connected
    const topology = cachedClient.topology;
    if (!topology) return false;
    
    // Check connection state
    if (topology.isConnected && !topology.isConnected()) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection health check failed:', error.message);
    return false;
  }
};

/**
 * Main function to get database connection
 * Implements connection reuse and lazy initialization
 */
const getDB = async () => {
  // Return cached connection if healthy
  if (isConnectionHealthy()) {
    console.log('♻️ Reusing existing MongoDB connection');
    return cachedDb;
  }
  
  // Wait if connection is already in progress
  if (isConnecting) {
    console.log('⏳ Connection in progress, waiting...');
    let attempts = 0;
    while (isConnecting && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (isConnectionHealthy()) {
      return cachedDb;
    }
  }
  
  // Establish new connection
  return connectToDatabase();
};

/**
 * Establish database connection with retry logic
 */
const connectToDatabase = async () => {
  if (isConnecting) {
    throw new Error('Connection already in progress');
  }
  
  isConnecting = true;
  
  try {
    const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    console.log(`🔄 Connecting to MongoDB (serverless: ${isServerless})...`);
    
    // Validate environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Close existing connection if any
    if (cachedClient) {
      try {
        await cachedClient.close();
      } catch (closeError) {
        console.warn('⚠️ Error closing old connection:', closeError.message);
      }
    }
    
    // Get connection options
    const options = getConnectionOptions();
    console.log(`📊 Connection config: maxPool=${options.maxPoolSize}, minPool=${options.minPoolSize}`);
    
    // Create new client
    cachedClient = new MongoClient(process.env.MONGODB_URI, options);
    
    // Connect with timeout
    const connectPromise = cachedClient.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    // Get database (matches MONGODB_URI database name)
    const dbName = process.env.MONGODB_URI?.split('/').pop()?.split('?')[0] || 'bazaarmkt-prod';
    cachedDb = cachedClient.db(dbName);
    
    // Verify connection with ping
    await cachedDb.admin().ping();
    
    console.log(`✅ MongoDB connected to database: ${cachedDb.databaseName}`);
    
    isConnecting = false;
    return cachedDb;
    
  } catch (error) {
    isConnecting = false;
    cachedClient = null;
    cachedDb = null;
    
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      mongoUriSet: !!process.env.MONGODB_URI,
      environment: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV || 'unknown'
    });
    
    throw error;
  }
};

/**
 * Close database connection
 * Called during graceful shutdown
 */
const closeDB = async () => {
  try {
    if (cachedClient) {
      console.log('🔌 Closing MongoDB connection...');
      await cachedClient.close();
      console.log('✅ MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing connection:', error.message);
  } finally {
    cachedClient = null;
    cachedDb = null;
    isConnecting = false;
  }
};

/**
 * Get connection statistics
 */
const getStats = () => {
  const healthy = isConnectionHealthy();
  
  return {
    isConnected: healthy,
    databaseName: cachedDb ? cachedDb.databaseName : null,
    hasClient: !!cachedClient,
    hasDb: !!cachedDb,
    isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    timestamp: new Date().toISOString()
  };
};

/**
 * Test connection
 */
const testConnection = async () => {
  try {
    const db = await getDB();
    await db.admin().ping();
    return { 
      success: true, 
      message: 'Database connection successful',
      stats: getStats()
    };
  } catch (error) {
    return { 
      success: false, 
      message: error.message,
      error: error.code || error.name
    };
  }
};

/**
 * Force reconnection
 */
const resetConnection = async () => {
  console.log('🔄 Forcing connection reset...');
  await closeDB();
  return getDB();
};

/**
 * Database middleware for Express
 * Attaches database connection to request object
 */
const databaseMiddleware = async (req, res, next) => {
  try {
    req.db = await getDB();
    next();
  } catch (error) {
    console.error('❌ Database middleware error:', error);
    
    // Return detailed error for debugging
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: error.code || 'CONNECTION_ERROR'
    });
  }
};

/**
 * Graceful shutdown handler
 * For traditional servers (not serverless)
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, closing connections...`);
  await closeDB();
  process.exit(0);
};

// Register shutdown handlers for traditional servers
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = {
  getDB,
  closeDB,
  getStats,
  testConnection,
  resetConnection,
  databaseMiddleware
};
