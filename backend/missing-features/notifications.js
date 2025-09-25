/**
 * Notifications System - Serverless Implementation
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// Create a notification
const createNotification = async (userId, type, title, message, data = {}) => {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const notificationsCollection = db.collection('notifications');

    const notification = {
      userId: new ObjectId(userId),
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await notificationsCollection.insertOne(notification);
    return result.insertedId;
  } finally {
    await client.close();
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const notificationsCollection = db.collection('notifications');

    // Build query
    const query = { userId: new ObjectId(decoded.userId) };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await notificationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Get unread count
    const unreadCount = await notificationsCollection.countDocuments({
      userId: new ObjectId(decoded.userId),
      isRead: false
    });

    await client.close();

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        hasMore: notifications.length === limit
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { notificationId } = req.params;

    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const notificationsCollection = db.collection('notifications');

    const result = await notificationsCollection.updateOne(
      {
        _id: new ObjectId(notificationId),
        userId: new ObjectId(decoded.userId)
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
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const notificationsCollection = db.collection('notifications');

    const result = await notificationsCollection.updateMany(
      {
        userId: new ObjectId(decoded.userId),
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

    await client.close();

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { notificationId } = req.params;

    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const notificationsCollection = db.collection('notifications');

    const result = await notificationsCollection.deleteOne({
      _id: new ObjectId(notificationId),
      userId: new ObjectId(decoded.userId)
    });

    if (result.deletedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Notification helper functions for different events
const notifyOrderStatusChange = async (userId, orderId, status, orderDetails) => {
  const statusMessages = {
    confirmed: 'Your order has been confirmed by the artisan',
    preparing: 'Your order is being prepared',
    ready: 'Your order is ready for pickup/delivery',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled'
  };

  await createNotification(
    userId,
    'order_status',
    'Order Update',
    statusMessages[status] || `Your order status has been updated to ${status}`,
    { orderId, status, orderDetails }
  );
};

const notifyNewOrder = async (artisanUserId, orderId, customerInfo) => {
  await createNotification(
    artisanUserId,
    'new_order',
    'New Order Received',
    `You have received a new order from ${customerInfo.firstName} ${customerInfo.lastName}`,
    { orderId, customerInfo }
  );
};

const notifyNewReview = async (artisanUserId, reviewId, rating, productName) => {
  await createNotification(
    artisanUserId,
    'new_review',
    'New Review',
    `You received a ${rating}-star review for ${productName}`,
    { reviewId, rating, productName }
  );
};

const notifyProductOutOfStock = async (artisanUserId, productId, productName) => {
  await createNotification(
    artisanUserId,
    'stock_alert',
    'Product Out of Stock',
    `${productName} is now out of stock`,
    { productId, productName }
  );
};

// Send notification (placeholder for email/push notifications)
const sendNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, title, and message are required'
      });
    }

    const notificationId = await createNotification(userId, type, title, message, data);

    // TODO: Implement email/push notification sending here
    // For now, just store in database

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: { notificationId }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
  // Helper functions
  notifyOrderStatusChange,
  notifyNewOrder,
  notifyNewReview,
  notifyProductOutOfStock
};
