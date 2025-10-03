/**
 * User Service - Microservices Foundation
 * Handles authentication, user profiles, and user-related operations
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
  constructor() {
    this.serviceName = 'user-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize User Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ User Service already initialized');
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
      console.log('✅ User Service database connected');

      // Test cache connection
      await CacheService.healthCheck();
      console.log('✅ User Service cache connected');

      this.isInitialized = true;
      console.log('✅ User Service initialized successfully');
    } catch (error) {
      console.error('❌ User Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async registerUser(userData) {
    try {
      const { firstName, lastName, email, password, phone, userType = 'customer' } = userData;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        throw new Error('Missing required fields: firstName, lastName, email, password');
      }

      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user object
      const user = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || '',
        userType,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const db = await dbManager.connect();
      const usersCollection = db.collection('users');
      const result = await usersCollection.insertOne(user);

      if (!result.insertedId) {
        throw new Error('Failed to create user');
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;
      userResponse._id = result.insertedId;

      console.log(`✅ User registered: ${email}`);
      return {
        success: true,
        message: 'User registered successfully',
        data: userResponse
      };
    } catch (error) {
      console.error('❌ User registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  async loginUser(email, password) {
    try {
      // Get user from database
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id.toString(),
          email: user.email,
          userType: user.userType
        },
        EnvironmentConfig.getJWTSecret(),
        { expiresIn: '24h' }
      );

      // Cache user data
      const cacheKey = `user:${user._id}`;
      await CacheService.set(cacheKey, user, 3600); // 1 hour

      // Remove password from response
      const { password: _, ...userResponse } = user;

      console.log(`✅ User logged in: ${email}`);
      return {
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token
        }
      };
    } catch (error) {
      console.error('❌ User login failed:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const db = await dbManager.connect();
      const usersCollection = db.collection('users');
      return await usersCollection.findOne({ email: email.toLowerCase() });
    } catch (error) {
      console.error('❌ Get user by email failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      // Check cache first
      const cacheKey = `user:${userId}`;
      let user = await CacheService.get(cacheKey);

      if (!user) {
        // Get from database
        const db = await dbManager.connect();
        const usersCollection = db.collection('users');
        user = await usersCollection.findOne(
          { _id: require('mongodb').ObjectId(userId) },
          { projection: { password: 0 } }
        );

        if (user) {
          // Cache user for 1 hour
          await CacheService.set(cacheKey, user, 3600);
        }
      }

      return user;
    } catch (error) {
      console.error('❌ Get user by ID failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'profileImage'];
      const updateFields = {};

      // Filter allowed fields
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      }

      if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.updatedAt = new Date();

      // Update in database
      const db = await dbManager.connect();
      const usersCollection = db.collection('users');
      const result = await usersCollection.updateOne(
        { _id: require('mongodb').ObjectId(userId) },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }

      // Invalidate cache
      const cacheKey = `user:${userId}`;
      await CacheService.del(cacheKey);

      console.log(`✅ User profile updated: ${userId}`);
      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('❌ Update user profile failed:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, EnvironmentConfig.getJWTSecret());
      
      // Get user from cache or database
      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: user,
        decoded: decoded
      };
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const db = await dbManager.connect();
      
      // Get user orders count
      const ordersCollection = db.collection('orders');
      const ordersCount = await ordersCollection.countDocuments({ userId: require('mongodb').ObjectId(userId) });

      // Get user reviews count
      const reviewsCollection = db.collection('reviews');
      const reviewsCount = await reviewsCollection.countDocuments({ userId: require('mongodb').ObjectId(userId) });

      // Get user favorites count
      const favoritesCollection = db.collection('favorites');
      const favoritesCount = await favoritesCollection.countDocuments({ userId: require('mongodb').ObjectId(userId) });

      return {
        orders: ordersCount,
        reviews: reviewsCount,
        favorites: favoritesCount
      };
    } catch (error) {
      console.error('❌ Get user stats failed:', error);
      throw error;
    }
  }

  /**
   * Health check for User Service
   */
  async healthCheck() {
    try {
      const start = Date.now();
      
      // Test database connection
      const db = await dbManager.connect();
      const usersCollection = db.collection('users');
      await usersCollection.findOne({}, { projection: { _id: 1 } });
      
      // Test cache
      const cacheKey = 'health-check:user-service';
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
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/profile',
        'PUT /api/auth/profile',
        'GET /api/users/stats'
      ]
    };
  }
}

// Export singleton instance
module.exports = new UserService();
