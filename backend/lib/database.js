/**
 * Optimized Database Connection Module
 * Provides singleton MongoDB connection with health monitoring and auto-reconnect
 */

const { MongoClient } = require('mongodb');

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.db = null;
    this.connectionPromise = null;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 60000; // 1 minute
    this.stats = {
      totalConnections: 0,
      totalReconnects: 0,
      totalErrors: 0,
      lastConnectedAt: null,
      lastError: null
    };
  }

  /**
   * Get database connection with health check
   */
  async getDB() {
    // Perform health check if needed
    await this.healthCheck();

    // Return existing connection if healthy
    if (this.db && this.client && this.isConnectionHealthy()) {
      return this.db;
    }

    // Reset if connection is unhealthy
    if (this.db && this.client && !this.isConnectionHealthy()) {
      console.log('⚠️  Connection unhealthy, resetting...');
      await this.reset();
    }

    // Return existing connection if available
    if (this.db) {
      return this.db;
    }

    // Wait for existing connection attempt
    if (this.connectionPromise) {
      console.log('⏳ Waiting for existing connection attempt...');
      try {
        await this.connectionPromise;
        return this.db;
      } catch (error) {
        // Connection failed, reset and retry
        await this.reset();
      }
    }

    // Create new connection
    return this.connect();
  }

  /**
   * Check if current connection is healthy
   */
  isConnectionHealthy() {
    try {
      return this.client && 
             this.client.topology && 
             this.client.topology.isConnected && 
             this.client.topology.isConnected();
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform periodic health check
   */
  async healthCheck() {
    const now = Date.now();
    
    // Skip if health check was done recently
    if (this.lastHealthCheck && (now - this.lastHealthCheck) < this.healthCheckInterval) {
      return true;
    }

    // Skip if no connection exists
    if (!this.db || !this.client) {
      return false;
    }

    try {
      // Simple query to check connection (doesn't require admin privileges)
      await this.db.collection('users').findOne({}, { projection: { _id: 1 }, limit: 1 });
      this.lastHealthCheck = now;
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      this.stats.lastError = error.message;
      this.stats.totalErrors++;
      return false;
    }
  }

  /**
   * Establish new database connection
   */
  async connect() {
    // Validate environment
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Check connection attempts
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      const error = new Error(
        `Maximum connection attempts (${this.maxConnectionAttempts}) exceeded`
      );
      this.stats.lastError = error.message;
      throw error;
    }

    this.connectionAttempts++;
    this.isConnecting = true;

    this.connectionPromise = (async () => {
      try {
        console.log(`🔄 Connecting to MongoDB Atlas (attempt ${this.connectionAttempts})...`);
        
        // Create client with optimized settings
        this.client = new MongoClient(mongoUri, {
          maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5,
          minPoolSize: process.env.NODE_ENV === 'production' ? 2 : 1,
          serverSelectionTimeoutMS: 30000,
          connectTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          heartbeatFrequencyMS: 60000, // Check connection health every 60 seconds
          retryWrites: true,
          retryReads: true,
          monitorCommands: false, // Disable for better performance
          compressors: ['zlib'], // Enable compression
          zlibCompressionLevel: 6
        });

        // Connect to MongoDB
        await this.client.connect();
        
        // Get database instance
        this.db = this.client.db('bazarmkt');
        
        // Update stats
        this.stats.totalConnections++;
        if (this.stats.lastConnectedAt) {
          this.stats.totalReconnects++;
        }
        this.stats.lastConnectedAt = new Date();
        this.lastHealthCheck = Date.now();
        
        // Reset connection attempts on success
        this.connectionAttempts = 0;
        this.isConnecting = false;

        console.log('✅ MongoDB connected successfully to database: bazarmkt');
        console.log(`📊 Connection stats: ${this.stats.totalConnections} total, ${this.stats.totalReconnects} reconnects`);
        
        // Set up connection event handlers
        this.setupEventHandlers();
        
        return this.db;
      } catch (error) {
        console.error(`❌ MongoDB connection failed (attempt ${this.connectionAttempts}):`, error.message);
        
        this.stats.totalErrors++;
        this.stats.lastError = error.message;
        this.isConnecting = false;
        
        // Reset for retry
        this.client = null;
        this.db = null;
        this.connectionPromise = null;
        
        throw error;
      }
    })();

    await this.connectionPromise;
    return this.db;
  }

  /**
   * Set up connection event handlers for monitoring
   */
  setupEventHandlers() {
    if (!this.client) return;

    // Connection closed
    this.client.on('close', () => {
      console.log('⚠️  MongoDB connection closed');
    });

    // Connection error
    this.client.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.message);
      this.stats.totalErrors++;
      this.stats.lastError = error.message;
    });

    // Server heartbeat failed
    this.client.on('serverHeartbeatFailed', (event) => {
      console.error('💔 MongoDB heartbeat failed:', event);
    });

    // Topology closed
    this.client.on('topologyClosed', () => {
      console.log('🔌 MongoDB topology closed');
    });
  }

  /**
   * Reset connection state
   */
  async reset() {
    console.log('🔄 Resetting database connection...');
    
    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error) {
      console.error('Error closing client:', error.message);
    }
    
    this.client = null;
    this.db = null;
    this.connectionPromise = null;
    this.isConnecting = false;
    this.lastHealthCheck = null;
  }

  /**
   * Close database connection gracefully
   */
  async close() {
    console.log('🔌 Closing database connection...');
    
    try {
      if (this.client) {
        await this.client.close();
        console.log('✅ Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
    } finally {
      this.client = null;
      this.db = null;
      this.connectionPromise = null;
      this.isConnecting = false;
      this.lastHealthCheck = null;
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnectionHealthy(),
      connectionAttempts: this.connectionAttempts,
      isConnecting: this.isConnecting,
      lastHealthCheck: this.lastHealthCheck ? new Date(this.lastHealthCheck) : null
    };
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const db = await this.getDB();
      // Simple query to test connection (doesn't require admin privileges)
      await db.collection('users').findOne({}, { projection: { _id: 1 }, limit: 1 });
      return {
        success: true,
        message: 'Database connection is healthy',
        stats: this.getStats()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection test failed',
        error: error.message,
        stats: this.getStats()
      };
    }
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Export connection methods
module.exports = {
  getDB: () => dbConnection.getDB(),
  closeDB: () => dbConnection.close(),
  getStats: () => dbConnection.getStats(),
  testConnection: () => dbConnection.testConnection(),
  resetConnection: () => dbConnection.reset()
};

