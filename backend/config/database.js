/**
 * Database Configuration Module
 * Centralized database connection management for serverless environments
 */

// Database connection management
const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let connectionPromise = null;
let connectionAttempts = 0;

const getDB = async () => {
  // Return existing healthy connection immediately
  if (db && client && client.topology && client.topology.isConnected && client.topology.isConnected()) {
    return db;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = connectToDatabase();
  return connectionPromise;
};

const connectToDatabase = async () => {
  try {
    connectionAttempts++;
    console.log(`🔄 Connecting to MongoDB Atlas (attempt ${connectionAttempts})...`);

    if (client) {
      await client.close();
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      compressors: ['zlib']
    });

    await client.connect();
    db = client.db('bazarmkt');
    
    console.log(`✅ MongoDB connected successfully to database: ${db.databaseName}`);
    console.log(`📊 Connection stats: ${connectionAttempts} total, ${connectionAttempts - 1} reconnects`);
    
    connectionPromise = null;
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    connectionPromise = null;
    throw error;
  }
};

const closeDB = async () => {
  try {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB topology closed');
    }
    client = null;
    db = null;
    connectionPromise = null;
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

const getStats = () => {
  return {
    connected: db && client && client.topology && client.topology.isConnected && client.topology.isConnected(),
    connectionAttempts,
    databaseName: db ? db.databaseName : null,
    isConnected: db && client && client.topology && client.topology.isConnected && client.topology.isConnected(),
    lastConnectedAt: db ? new Date().toISOString() : null
  };
};

const testConnection = async () => {
  try {
    const database = await getDB();
    await database.admin().ping();
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const resetConnection = async () => {
  await closeDB();
  return getDB();
};

// Database middleware for Express
const databaseMiddleware = async (req, res, next) => {
  try {
    req.db = await getDB();
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
};

module.exports = {
  getDB,
  closeDB,
  getStats,
  testConnection,
  resetConnection,
  databaseMiddleware
};
