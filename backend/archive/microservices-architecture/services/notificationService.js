/**
 * Notification Service - Microservices Foundation
 * Handles notifications, alerts, and messaging
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class NotificationService {
  constructor() {
    this.serviceName = 'notification-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Notification Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Notification Service already initialized');
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
      console.log('✅ Notification Service database connected');

      // Test cache connection
      await CacheService.healthCheck();
      console.log('✅ Notification Service cache connected');

      this.isInitialized = true;
      console.log('✅ Notification Service initialized successfully');
    } catch (error) {
      console.error('❌ Notification Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create notification
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data = {},
        priority = 'normal'
      } = notificationData;

      // Validate required fields
      if (!userId || !type || !title || !message) {
        throw new Error('Missing required fields: userId, type, title, message');
      }

      const validTypes = ['order_status', 'new_order', 'new_review', 'stock_alert', 'system', 'promotion'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
      }

      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
      }

      // Create notification object
      const notification = {
        userId: require('mongodb').ObjectId(userId),
        type,
        title,
        message,
        data,
        priority,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const result = await notificationsCollection.insertOne(notification);

      if (!result.insertedId) {
        throw new Error('Failed to create notification');
      }

      notification._id = result.insertedId;

      console.log(`✅ Notification created: ${notification._id}`);
      return {
        success: true,
        message: 'Notification created successfully',
        data: notification
      };
    } catch (error) {
      console.error('❌ Create notification failed:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, filters = {}) {
    try {
      const {
        type,
        isRead,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = { userId: require('mongodb').ObjectId(userId) };
      if (type) query.type = type;
      if (isRead !== undefined) query.isRead = isRead;
      if (priority) query.priority = priority;

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate skip
      const skip = (page - 1) * limit;

      // Get notifications from database
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      
      const [notifications, totalCount] = await Promise.all([
        notificationsCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        notificationsCollection.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      console.log(`✅ User notifications retrieved: ${notifications.length}/${totalCount}`);
      return {
        success: true,
        data: {
          notifications,
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
      console.error('❌ Get user notifications failed:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      // Update notification
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const result = await notificationsCollection.updateOne(
        { 
          _id: require('mongodb').ObjectId(notificationId),
          userId: require('mongodb').ObjectId(userId)
        },
        { 
          $set: { 
            isRead: true,
            readAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Notification not found or not owned by user');
      }

      console.log(`✅ Notification marked as read: ${notificationId}`);
      return {
        success: true,
        message: 'Notification marked as read'
      };
    } catch (error) {
      console.error('❌ Mark notification as read failed:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const result = await notificationsCollection.updateMany(
        { 
          userId: require('mongodb').ObjectId(userId),
          isRead: false
        },
        { 
          $set: { 
            isRead: true,
            readAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Marked ${result.modifiedCount} notifications as read for user: ${userId}`);
      return {
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('❌ Mark all notifications as read failed:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const result = await notificationsCollection.deleteOne({
        _id: require('mongodb').ObjectId(notificationId),
        userId: require('mongodb').ObjectId(userId)
      });

      if (result.deletedCount === 0) {
        throw new Error('Notification not found or not owned by user');
      }

      console.log(`✅ Notification deleted: ${notificationId}`);
      return {
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      console.error('❌ Delete notification failed:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId) {
    try {
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const baseQuery = { userId: require('mongodb').ObjectId(userId) };

      // Get statistics
      const [
        totalNotifications,
        unreadNotifications,
        readNotifications,
        notificationsByType,
        notificationsByPriority
      ] = await Promise.all([
        notificationsCollection.countDocuments(baseQuery),
        notificationsCollection.countDocuments({ ...baseQuery, isRead: false }),
        notificationsCollection.countDocuments({ ...baseQuery, isRead: true }),
        notificationsCollection.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray(),
        notificationsCollection.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]).toArray()
      ]);

      console.log(`✅ Notification statistics retrieved for user: ${userId}`);
      return {
        success: true,
        data: {
          totalNotifications,
          unreadNotifications,
          readNotifications,
          notificationsByType: notificationsByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          notificationsByPriority: notificationsByPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      console.error('❌ Get notification statistics failed:', error);
      throw error;
    }
  }

  /**
   * Send system notification to multiple users
   */
  async sendSystemNotification(userIds, notificationData) {
    try {
      const {
        type,
        title,
        message,
        data = {},
        priority = 'normal'
      } = notificationData;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('User IDs must be a non-empty array');
      }

      // Create notifications for all users
      const notifications = userIds.map(userId => ({
        userId: require('mongodb').ObjectId(userId),
        type,
        title,
        message,
        data,
        priority,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Insert all notifications
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const result = await notificationsCollection.insertMany(notifications);

      console.log(`✅ System notification sent to ${result.insertedCount} users`);
      return {
        success: true,
        message: `System notification sent to ${result.insertedCount} users`,
        insertedCount: result.insertedCount
      };
    } catch (error) {
      console.error('❌ Send system notification failed:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      const count = await notificationsCollection.countDocuments({
        userId: require('mongodb').ObjectId(userId),
        isRead: false
      });

      console.log(`✅ Unread count retrieved: ${count} for user: ${userId}`);
      return {
        success: true,
        data: { unreadCount: count }
      };
    } catch (error) {
      console.error('❌ Get unread count failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Notification Service
   */
  async healthCheck() {
    try {
      const start = Date.now();
      
      // Test database connection
      const db = await dbManager.connect();
      const notificationsCollection = db.collection('notifications');
      await notificationsCollection.findOne({}, { projection: { _id: 1 } });
      
      // Test cache
      const cacheKey = 'health-check:notification-service';
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
        'POST /api/notifications',
        'GET /api/notifications',
        'PUT /api/notifications/:id/read',
        'PUT /api/notifications/read-all',
        'DELETE /api/notifications/:id',
        'GET /api/notifications/stats',
        'POST /api/notifications/system',
        'GET /api/notifications/unread-count'
      ]
    };
  }
}

// Export singleton instance
module.exports = new NotificationService();
