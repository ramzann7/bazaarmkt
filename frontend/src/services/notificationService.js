import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const notificationService = {
  // Send order completion notification (primary method for guests)
  sendOrderCompletionNotification: async (orderData, userInfo) => {
    try {
      console.log('📧 Sending order completion notification:', { orderData, userInfo });
      
      const notificationData = {
        type: 'order_completion',
        userId: userInfo.id || userInfo.userId,
        orderId: orderData._id || orderData.id,
        userEmail: userInfo.email,
        userPhone: userInfo.phone,
        isGuest: userInfo.isGuest || false,
        orderDetails: {
          orderNumber: orderData.orderNumber || orderData._id,
          totalAmount: orderData.totalAmount || orderData.total,
          items: orderData.items || [],
          deliveryAddress: orderData.deliveryAddress,
          estimatedDelivery: orderData.estimatedDelivery || '2-3 business days',
          orderStatus: 'confirmed',
          orderDate: new Date().toLocaleDateString(),
          orderTime: new Date().toLocaleTimeString()
        },
        timestamp: new Date().toISOString()
      };

      // For guests, always send email notification
      if (userInfo.isGuest && userInfo.email) {
        await notificationService.sendOrderCompletionEmail(notificationData);
      }

      // For patrons, send platform notification and email if enabled
      if (!userInfo.isGuest) {
        await notificationService.sendPlatformNotification(notificationData);
        // Check if user has email notifications enabled
        const preferences = await notificationService.getNotificationPreferences(userInfo.id);
        if (preferences.email?.orderUpdates && userInfo.email) {
          await notificationService.sendOrderCompletionEmail(notificationData);
        }
      }

      // Send to backend notification service for logging
      const response = await axios.post(`${API_URL}/notifications/send`, notificationData);
      return response.data;
      
    } catch (error) {
      console.error('Error sending order completion notification:', error);
      // Don't throw error - notifications shouldn't break the order flow
      return { success: false, error: error.message };
    }
  },

  // Send order update notification
  sendOrderUpdateNotification: async (orderData, userInfo, updateType, updateDetails) => {
    try {
      console.log('📧 Sending order update notification:', { orderData, userInfo, updateType, updateDetails });
      
      const notificationData = {
        type: 'order_update',
        userId: userInfo.id || userInfo.userId,
        orderId: orderData._id || orderData.id,
        userEmail: userInfo.email,
        userPhone: userInfo.phone,
        isGuest: userInfo.isGuest || false,
        updateType,
        updateDetails,
        orderDetails: {
          orderNumber: orderData.orderNumber || orderData._id,
          totalAmount: orderData.totalAmount || orderData.total,
          orderStatus: orderData.status || 'updated'
        },
        timestamp: new Date().toISOString()
      };

      // For guests, always send email for important updates
      if (userInfo.isGuest && userInfo.email) {
        await notificationService.sendOrderUpdateEmail(notificationData);
      }

      // For patrons, send platform notification and email if enabled
      if (!userInfo.isGuest) {
        await notificationService.sendPlatformNotification(notificationData);
        const preferences = await notificationService.getNotificationPreferences(userInfo.id);
        if (preferences.email?.orderUpdates && userInfo.email) {
          await notificationService.sendOrderUpdateEmail(notificationData);
        }
      }

      // Send to backend notification service for logging
      const response = await axios.post(`${API_URL}/notifications/send`, notificationData);
      return response.data;
      
    } catch (error) {
      console.error('Error sending order update notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Send order completion email (detailed email for guests)
  sendOrderCompletionEmail: async (notificationData) => {
    try {
      const emailData = {
        to: notificationData.userEmail,
        subject: `🎉 Order Confirmed! #${notificationData.orderDetails.orderNumber}`,
        template: 'order_completion',
        data: {
          userName: notificationData.userName || 'Customer',
          orderNumber: notificationData.orderDetails.orderNumber,
          totalAmount: notificationData.orderDetails.totalAmount,
          items: notificationData.orderDetails.items,
          deliveryAddress: notificationData.orderDetails.deliveryAddress,
          estimatedDelivery: notificationData.orderDetails.estimatedDelivery,
          orderDate: notificationData.orderDetails.orderDate,
          orderTime: notificationData.orderDetails.orderTime,
          isGuest: notificationData.isGuest
        }
      };

      const response = await axios.post(`${API_URL}/notifications/email`, emailData);
      console.log('✅ Order completion email sent successfully');
      return response.data;
    } catch (error) {
      console.error('Error sending order completion email:', error);
      return { success: false, error: error.message };
    }
  },

  // Send order update email
  sendOrderUpdateEmail: async (notificationData) => {
    try {
      const updateMessages = {
        'status_change': 'Your order status has been updated',
        'shipping': 'Your order has been shipped',
        'delivery': 'Your order is out for delivery',
        'delivered': 'Your order has been delivered',
        'cancelled': 'Your order has been cancelled',
        'refunded': 'Your order has been refunded'
      };

      const emailData = {
        to: notificationData.userEmail,
        subject: `📦 Order Update - #${notificationData.orderDetails.orderNumber}`,
        template: 'order_update',
        data: {
          userName: notificationData.userName || 'Customer',
          orderNumber: notificationData.orderDetails.orderNumber,
          updateType: notificationData.updateType,
          updateMessage: updateMessages[notificationData.updateType] || 'Your order has been updated',
          updateDetails: notificationData.updateDetails,
          orderStatus: notificationData.orderDetails.orderStatus,
          timestamp: new Date().toLocaleString()
        }
      };

      const response = await axios.post(`${API_URL}/notifications/email`, emailData);
      console.log('✅ Order update email sent successfully');
      return response.data;
    } catch (error) {
      console.error('Error sending order update email:', error);
      return { success: false, error: error.message };
    }
  },

  // Send platform notification (for patrons)
  sendPlatformNotification: async (notificationData) => {
    try {
      const platformData = {
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.type === 'order_completion' 
          ? `Order #${notificationData.orderDetails.orderNumber} Confirmed!`
          : `Order #${notificationData.orderDetails.orderNumber} Updated`,
        message: notificationData.type === 'order_completion'
          ? `Your order has been confirmed and is being processed. Estimated delivery: ${notificationData.orderDetails.estimatedDelivery}`
          : `Your order has been updated: ${notificationData.updateDetails || 'Status changed'}`,
        orderId: notificationData.orderId,
        timestamp: notificationData.timestamp,
        isRead: false
      };

      const response = await axios.post(`${API_URL}/notifications/platform`, platformData);
      console.log('✅ Platform notification sent successfully');
      return response.data;
    } catch (error) {
      console.error('Error sending platform notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user notification preferences
  getNotificationPreferences: async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/notifications/preferences/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.preferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        email: { orderUpdates: true, marketing: true, promotions: true, security: true },
        push: { orderUpdates: true, promotions: true, newArtisans: true, nearbyOffers: true },
        sms: { orderUpdates: false, promotions: false }
      };
    }
  },

  // Update user notification preferences
  updateNotificationPreferences: async (userId, preferences) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/notifications/preferences/${userId}`, preferences, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  // Get user platform notifications
  getPlatformNotifications: async (userId, limit = 20) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/notifications/platform/${userId}?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting platform notifications:', error);
      return { notifications: [], total: 0 };
    }
  },

  // Mark platform notification as read
  markNotificationAsRead: async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/notifications/platform/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all platform notifications as read
  markAllNotificationsAsRead: async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/notifications/platform/${userId}/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
};
