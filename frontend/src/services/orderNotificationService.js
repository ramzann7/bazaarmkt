// Order notification service for real-time alerts
import { authToken } from './authservice';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';

class OrderNotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.pendingOrders = new Set();
    this.notificationSound = null;
    this.initializeNotificationSound();
  }

  // Initialize notification sound
  initializeNotificationSound() {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      this.notificationSound = () => {
        try {
          // Create a new oscillator each time to avoid "cannot call start more than once" error
          const newOscillator = audioContext.createOscillator();
          const newGainNode = audioContext.createGain();
          
          newOscillator.connect(newGainNode);
          newGainNode.connect(audioContext.destination);
          
          newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          newOscillator.start(audioContext.currentTime);
          newOscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
          console.warn('Could not play notification sound:', error);
        }
      };
    } catch (error) {
      console.warn('Could not initialize notification sound:', error);
      this.notificationSound = () => {
        // Fallback: use browser notification sound
        if (window.Notification && window.Notification.permission === 'granted') {
          new window.Notification('New Order!', {
            body: 'You have a new order to process',
            icon: '/favicon.ico',
            silent: false
          });
        }
      };
    }
  }

  // Connect to real-time updates
  connect() {
    if (this.isConnected) return;

    const token = authToken.getToken();
    if (!token) {
      console.warn('No auth token available for order notifications');
      return;
    }

    try {
      // For now, use polling since WebSocket setup would require backend changes
      // In a real implementation, you'd use WebSocket or Server-Sent Events
      this.startPolling();
      this.isConnected = true;
      console.log('✅ Order notification service connected');
    } catch (error) {
      console.error('❌ Failed to connect order notification service:', error);
    }
  }

  // Start polling for new orders
  startPolling() {
    // Check if user is authenticated to adjust polling frequency
    const token = authToken.getToken();
    const pollInterval = token ? 120000 : 300000; // 2 min for authenticated, 5 min for guests
    
    // Poll for new orders
    this.pollInterval = setInterval(async () => {
      try {
        await this.checkForNewOrders();
      } catch (error) {
        console.error('❌ Error in order polling:', error);
        // Don't disconnect on individual errors, just log them
      }
    }, pollInterval);

    // Also check immediately
    this.checkForNewOrders().catch(error => {
      console.error('❌ Error in initial order check:', error);
    });
  }

  // Check for new orders and order updates
  async checkForNewOrders(isLoginTriggered = false) {
    try {
      const token = authToken.getToken();
      if (!token) {
        // Only log once per session to avoid spam
        if (!this.hasLoggedNoToken) {
          console.log('🔍 No auth token, skipping order check');
          this.hasLoggedNoToken = true;
        }
        return;
      }
      
      // Reset the flag when we have a token
      this.hasLoggedNoToken = false;

      // Get user profile to determine notification type
      const { getProfile } = await import('./authservice');
      const profile = await getProfile();
      
      // Check both role and userType for compatibility
      const userRole = profile.role || profile.userType;
      
      if (['artisan', 'producer', 'food_maker'].includes(userRole)) {
        // Handle artisan notifications for new orders
        await this.checkForNewArtisanOrders(isLoginTriggered);
      } else if (userRole === 'patron') {
        // Handle patron notifications for order updates
        await this.checkForOrderUpdates(isLoginTriggered);
      }

    } catch (error) {
      console.error('Error checking for new orders:', error);
    }
  }

  // Check for new orders (artisan-specific)
  async checkForNewArtisanOrders(isLoginTriggered = false) {
    try {
      // Get pending orders
      const { orderService } = await import('./orderService');
      const orders = await orderService.getArtisanOrders();
      
      const pendingOrders = orders.filter(order => 
        ['pending', 'confirmed', 'preparing'].includes(order.status)
      );

      // Check for new orders
      const currentPendingIds = new Set(pendingOrders.map(order => order._id));
      const newOrders = pendingOrders.filter(order => 
        !this.pendingOrders.has(order._id)
      );

      // Update our tracking
      this.pendingOrders = currentPendingIds;

      // Determine which orders to notify about
      let ordersToNotify = [];
      
      if (isLoginTriggered && pendingOrders.length > 0) {
        // For login-triggered notifications, show all pending orders
        ordersToNotify = pendingOrders;
      } else if (newOrders.length > 0) {
        // For regular polling, only show new orders
        ordersToNotify = newOrders;
      }

      // Notify about orders
      if (ordersToNotify.length > 0) {
        this.notifyNewOrders(ordersToNotify);
      }

      // Update cache
      cacheService.set(CACHE_KEYS.PENDING_ORDERS, pendingOrders, CACHE_TTL.ORDER_STATUS);

    } catch (error) {
      console.error('Error checking for new artisan orders:', error);
    }
  }

  // Check for order updates (patron-specific)
  async checkForOrderUpdates(isLoginTriggered = false) {
    try {
      // Get user's orders
      const { orderService } = await import('./orderService');
      const orders = await orderService.getPatronOrders();
      
      // Filter for orders that might have status updates (include all statuses for comprehensive tracking)
      const trackableOrders = orders.filter(order => 
        ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'picked_up', 'completed', 'cancelled', 'declined'].includes(order.status)
      );

      // Check for status changes
      const currentOrderStatuses = new Map(trackableOrders.map(order => [order._id, order.status]));
      const previousStatuses = this.previousOrderStatuses || new Map();
      
      const updatedOrders = trackableOrders.filter(order => {
        const previousStatus = previousStatuses.get(order._id);
        return previousStatus && previousStatus !== order.status;
      });

      // Update our tracking
      this.previousOrderStatuses = currentOrderStatuses;

      // Determine which orders to notify about
      let ordersToNotify = [];
      
      if (isLoginTriggered && trackableOrders.length > 0) {
        // For login-triggered notifications, show orders that need action or are recently updated
        const actionRequiredOrders = trackableOrders.filter(order => 
          ['ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'picked_up'].includes(order.status)
        );
        
        if (actionRequiredOrders.length > 0) {
          ordersToNotify = actionRequiredOrders;
        }
      } else if (updatedOrders.length > 0) {
        // For regular polling, show all status updates
        ordersToNotify = updatedOrders;
      }

      // Notify about order updates
      if (ordersToNotify.length > 0) {
        this.notifyOrderUpdates(ordersToNotify);
      }

    } catch (error) {
      console.error('Error checking for order updates:', error);
    }
  }

  // Notify about new orders
  notifyNewOrders(newOrders) {
    // Play notification sound
    if (this.notificationSound) {
      this.notificationSound();
    }

    // Show toast notification
    import('react-hot-toast').then(({ default: toast }) => {
      if (newOrders.length === 1) {
        toast.success(`New order received! Order #${newOrders[0]._id.slice(-6)}`, {
          duration: 5000,
          onClick: () => {
            // Navigate to orders page
            window.location.href = '/orders';
          }
        });
      } else {
        toast.success(`${newOrders.length} new orders received!`, {
          duration: 5000,
          onClick: () => {
            window.location.href = '/orders';
          }
        });
      }
    }).catch(error => {
      console.warn('Could not show toast notification:', error);
    });

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('newOrdersReceived', {
      detail: { orders: newOrders, count: newOrders.length }
    }));

    // Update browser notification badge if supported
    this.updateNotificationBadge();
  }

  // Notify about order updates (for patrons)
  notifyOrderUpdates(updatedOrders) {
    // Play notification sound
    if (this.notificationSound) {
      this.notificationSound();
    }

    // Show toast notification for each updated order
    import('react-hot-toast').then(({ default: toast }) => {
      updatedOrders.forEach(order => {
        const statusMessages = {
          'confirmed': '✅ Order confirmed by artisan!',
          'preparing': '👨‍🍳 Your order is being prepared!',
          'ready_for_pickup': '🎉 Your order is ready for pickup! Click to view details.',
          'ready_for_delivery': '🚚 Your order is ready for delivery!',
          'out_for_delivery': '📦 Your order is out for delivery! Should arrive soon.',
          'delivered': '📬 Your order has been delivered! Please confirm receipt.',
          'picked_up': '✅ Your order has been picked up!',
          'completed': '🎊 Your order has been completed! Thank you for your business.',
          'cancelled': '❌ Your order has been cancelled.',
          'declined': '⚠️ Your order has been declined by the artisan.'
        };

        const actionRequiredMessages = {
          'ready_for_pickup': 'Action Required: Your order is ready for pickup!',
          'ready_for_delivery': 'Action Required: Your order is ready for delivery!',
          'out_for_delivery': 'Action Required: Your order is out for delivery!',
          'delivered': 'Action Required: Please confirm receipt of your delivered order.',
          'picked_up': 'Action Required: Please confirm you picked up your order.'
        };

        const message = statusMessages[order.status] || `Order status updated to: ${order.status}`;
        const actionMessage = actionRequiredMessages[order.status];
        const isPositive = !['cancelled', 'declined'].includes(order.status);
        const requiresAction = ['ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'picked_up'].includes(order.status);
        
        // Use longer duration for action-required notifications
        const duration = requiresAction ? 8000 : 5000;
        
        if (requiresAction) {
          // Special handling for action-required notifications
          const finalMessage = actionMessage ? `${actionMessage} Order #${order._id.slice(-6)}` : `${message} Order #${order._id.slice(-6)}`;
          toast.success(finalMessage, {
            duration: duration,
            style: {
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 'bold'
            },
            onClick: () => {
              // Navigate to orders page
              window.location.href = '/orders';
            }
          });
        } else if (isPositive) {
          const finalMessage = `${message} Order #${order._id.slice(-6)}`;
          toast.success(finalMessage, {
            duration: duration,
            onClick: () => {
              // Navigate to orders page
              window.location.href = '/orders';
            }
          });
        } else {
          const finalMessage = `${message} Order #${order._id.slice(-6)}`;
          toast.error(finalMessage, {
            duration: duration,
            onClick: () => {
              // Navigate to orders page
              window.location.href = '/orders';
            }
          });
        }
      });
    }).catch(error => {
      console.error('Could not show order update toast notification:', error);
    });

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('orderUpdatesReceived', {
      detail: { orders: updatedOrders, count: updatedOrders.length }
    }));
  }

  // Update notification badge - Disabled for artisans as they receive alerts on dashboard
  updateNotificationBadge() {
    // Don't update document title or favicon - artisans receive alerts on their dashboard
    return;
  }

  // Update favicon with badge - Disabled for artisans as they receive alerts on dashboard
  updateFaviconBadge(count) {
    // Remove any existing badge
    const badge = document.getElementById('order-notification-badge');
    if (badge) {
      badge.remove();
    }
    
    // Don't create new badges - artisans receive alerts on their dashboard
    return;
  }

  // Get pending orders count
  getPendingOrdersCount() {
    return this.pendingOrders.size;
  }

  // Get all pending orders
  async getPendingOrders() {
    try {
      const cached = cacheService.get(CACHE_KEYS.PENDING_ORDERS);
      if (cached) {
        return cached;
      }

      const { orderService } = await import('./orderService');
      const orders = await orderService.getArtisanOrders();
      const pendingOrders = orders.filter(order => 
        ['pending', 'confirmed', 'preparing'].includes(order.status)
      );

      cacheService.set(CACHE_KEYS.PENDING_ORDERS, pendingOrders, CACHE_TTL.ORDER_STATUS);
      return pendingOrders;
    } catch (error) {
      console.error('Error getting pending orders:', error);
      return [];
    }
  }

  // Mark order as processed (remove from pending)
  markOrderProcessed(orderId) {
    this.pendingOrders.delete(orderId);
    this.updateNotificationBadge();
  }

  // Disconnect
  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnected = false;
    // Reset the logging flag
    this.hasLoggedNoToken = false;
    console.log('🔌 Order notification service disconnected');
  }

  // Reconnect if disconnected
  reconnect() {
    if (!this.isConnected) {
      console.log('🔄 Reconnecting order notification service...');
      this.connect();
    }
  }

  // Manually trigger notification for immediate order creation
  triggerOrderCreatedNotification(orderData, userRole) {
    console.log('🔔 Manual order creation notification triggered');
    
    // Check if this is a guest user - guests should only get email notifications, not toast
    const isGuest = orderData?.isGuestOrder || orderData?.userInfo?.isGuest || false;
    if (isGuest) {
      console.log('📧 Guest user detected - skipping toast notification (email only)');
      return;
    }
    
    // Play notification sound
    if (this.notificationSound) {
      this.notificationSound();
    }

    // Show toast notification based on user role
    import('react-hot-toast').then(({ default: toast }) => {
      if (userRole === 'artisan') {
        // This shouldn't happen for artisans, but just in case
        toast.success(`New order received! Order #${orderData._id?.slice(-6) || 'New'}`, {
          duration: 5000,
          onClick: () => {
            window.location.href = '/orders';
          }
        });
      } else if (userRole === 'patron') {
        toast.success(`Order placed successfully! Order #${orderData._id?.slice(-6) || 'New'}`, {
          duration: 5000,
          onClick: () => {
            window.location.href = '/orders';
          }
        });
      }
    }).catch(error => {
      console.warn('Could not show toast notification:', error);
    });
  }

  // Manually trigger notification for order status updates
  triggerOrderStatusUpdateNotification(orderData, newStatus, userRole) {
    console.log('🔔 Manual order status update notification triggered');
    
    // Check if this is a guest user - guests should only get email notifications, not toast
    const isGuest = orderData?.isGuestOrder || orderData?.userInfo?.isGuest || false;
    if (isGuest) {
      console.log('📧 Guest user detected - skipping toast notification (email only)');
      return;
    }
    
    // Play notification sound
    if (this.notificationSound) {
      this.notificationSound();
    }

    // Show toast notification based on user role
    import('react-hot-toast').then(({ default: toast }) => {
      if (userRole === 'patron') {
        const statusMessages = {
          'confirmed': 'Order confirmed by artisan!',
          'preparing': 'Your order is being prepared!',
          'ready_for_pickup': 'Your order is ready for pickup!',
          'ready_for_delivery': 'Your order is ready for delivery!',
          'out_for_delivery': 'Your order is out for delivery!',
          'delivered': 'Your order has been delivered!',
          'picked_up': 'Your order has been picked up!',
          'completed': 'Your order has been completed!',
          'cancelled': 'Your order has been cancelled.',
          'declined': 'Your order has been declined by the artisan.'
        };

        const message = statusMessages[newStatus] || `Order status updated to: ${newStatus}`;
        const isPositive = !['cancelled', 'declined'].includes(newStatus);
        
        if (isPositive) {
          toast.success(`${message} Order #${orderData._id?.slice(-6) || 'New'}`, {
            duration: 5000,
            onClick: () => {
              window.location.href = '/orders';
            }
          });
        } else {
          toast.error(`${message} Order #${orderData._id?.slice(-6) || 'New'}`, {
            duration: 5000,
            onClick: () => {
              window.location.href = '/orders';
            }
          });
        }
      } else if (userRole === 'artisan') {
        toast.success(`Order status updated to: ${newStatus}`, {
          duration: 3000,
          onClick: () => {
            window.location.href = '/orders';
          }
        });
      }
    }).catch(error => {
      console.warn('Could not show toast notification:', error);
    });
  }

  // Request notification permissions
  async requestNotificationPermission() {
    if (!window.Notification) {
      console.warn('Notifications not supported');
      return false;
    }

    if (window.Notification.permission === 'granted') {
      return true;
    }

    if (window.Notification.permission === 'denied') {
      return false;
    }

    const permission = await window.Notification.requestPermission();
    return permission === 'granted';
  }
}

// Create singleton instance
export const orderNotificationService = new OrderNotificationService();

// Auto-connect when service is imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      orderNotificationService.connect();
    });
  } else {
    orderNotificationService.connect();
  }
}

export default orderNotificationService;
