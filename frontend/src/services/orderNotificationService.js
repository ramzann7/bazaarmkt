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

      // Cache user profile to avoid repeated API calls
      if (!this.cachedProfile || isLoginTriggered) {
        const { getProfile } = await import('./authservice');
        console.log('🔍 Loading profile for order notifications...');
        this.cachedProfile = await getProfile();
        console.log('🔍 Profile cached:', this.cachedProfile ? 'Found profile' : 'Profile is null/undefined');
      }
      
      const profile = this.cachedProfile;
      
      // Check if profile exists and has role information
      if (!profile) {
        console.log('🔍 No profile found, skipping order check');
        return;
      }
      
      // Check both role and userType for compatibility
      const userRole = profile.role || profile.userType;
      
      if (!userRole) {
        console.log('🔍 No user role found in profile, skipping order check');
        return;
      }
      
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
        // For login-triggered notifications, show orders that REQUIRE patron action
        const actionRequiredOrders = trackableOrders.filter(order => {
          // Cost absorption requires response
          if (order.costAbsorption?.required) return true;
          
          // Delivered/Picked up orders that haven't been confirmed yet
          if ((order.status === 'delivered' || order.status === 'picked_up') && 
              !order.walletCredit?.patronConfirmedAt) return true;
          
          // Ready for pickup (patron needs to know)
          if (order.status === 'ready_for_pickup') return true;
          
          // Declined or cancelled orders (patron should be aware)
          if (['declined', 'cancelled'].includes(order.status)) return true;
          
          return false;
        });
        
        if (actionRequiredOrders.length > 0) {
          console.log(`🔔 Found ${actionRequiredOrders.length} orders requiring patron attention on login`);
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
  notifyNewOrders(newOrders, orderType = 'sales') {
    // Play notification sound
    if (this.notificationSound) {
      this.notificationSound();
    }

    // Show toast notification with different colors based on order type
    import('react-hot-toast').then(({ default: toast }) => {
      if (newOrders.length === 1) {
        const order = newOrders[0];
        // Determine if this is a purchase order (artisan is buyer) or sales order (artisan is seller)
        const isPurchase = orderType === 'purchases';
        
        const message = isPurchase 
          ? `✨ Your purchase order was placed! Order #${order._id.slice(-6)}`
          : `🎉 New order received! Order #${order._id.slice(-6)}`;
        
        const toastStyle = isPurchase 
          ? {
              background: '#9333ea', // Purple for purchases
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '15px'
            }
          : {
              background: '#3b82f6', // Blue for sales
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '15px'
            };
        
        toast.success(message, {
          duration: 5000,
          style: toastStyle,
          onClick: () => {
            window.location.href = '/orders';
          }
        });
      } else {
        const isPurchase = orderType === 'purchases';
        const message = isPurchase
          ? `✨ ${newOrders.length} purchase orders placed!`
          : `🎉 ${newOrders.length} new orders received!`;
        
        const toastStyle = isPurchase 
          ? {
              background: '#9333ea', // Purple for purchases
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '15px'
            }
          : {
              background: '#3b82f6', // Blue for sales
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '15px'
            };
        
        toast.success(message, {
          duration: 5000,
          style: toastStyle,
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
      detail: { orders: newOrders, count: newOrders.length, orderType }
    }));

    // Update browser notification badge if supported
    this.updateNotificationBadge();
  }

  // Notify about order updates (for patrons)
  notifyOrderUpdates(updatedOrders) {
    // Filter for critical notifications only (action required or negative outcomes)
    const criticalStatuses = ['ready_for_pickup', 'delivered', 'picked_up', 'cancelled', 'declined'];
    const criticalOrders = updatedOrders.filter(order => criticalStatuses.includes(order.status) || order.costAbsorption?.required);
    
    // Play notification sound only for critical updates
    if (criticalOrders.length > 0 && this.notificationSound) {
      this.notificationSound();
    }

    // Show toast notifications ONLY for critical actions that require patron attention
    import('react-hot-toast').then(({ default: toast }) => {
      criticalOrders.forEach(order => {
        const statusMessages = {
          'ready_for_pickup': '🎉 Your order is ready for pickup!',
          'delivered': '📬 Your order has been delivered!',
          'picked_up': '✅ Your order has been picked up!',
          'cancelled': '❌ Your order has been cancelled.',
          'declined': '⚠️ Your order was declined by the artisan.'
        };

        const actionRequiredMessages = {
          'ready_for_pickup': '⚡ ACTION REQUIRED: Pickup your order!',
          'delivered': '⚡ ACTION REQUIRED: Confirm receipt of delivery!',
          'picked_up': '⚡ ACTION REQUIRED: Confirm you picked up the order!'
        };

        // Check for cost absorption notification
        if (order.costAbsorption?.required) {
          toast.error(`⚡ Delivery cost increased by $${order.costAbsorption.amount.toFixed(2)}. Order #${order._id.slice(-6)} needs your response!`, {
            duration: 10000,
            style: {
              background: '#ef4444',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '16px'
            },
            onClick: () => {
              window.location.href = '/orders';
            }
          });
          return;
        }

        const message = statusMessages[order.status];
        const actionMessage = actionRequiredMessages[order.status];
        const requiresAction = ['ready_for_pickup', 'delivered', 'picked_up'].includes(order.status);
        const isNegative = ['cancelled', 'declined'].includes(order.status);
        
        // Use longer duration for action-required notifications
        const duration = requiresAction ? 10000 : 8000;
        
        if (requiresAction) {
          // Critical action-required notifications with prominent styling
          const finalMessage = `${actionMessage} Order #${order._id.slice(-6)}`;
          toast.success(finalMessage, {
            duration: duration,
            style: {
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '16px',
              border: '2px solid #047857'
            },
            icon: '⚡',
            onClick: () => {
              window.location.href = '/orders';
            }
          });
        } else if (isNegative) {
          // Negative outcome notifications
          const finalMessage = `${message} Order #${order._id.slice(-6)}`;
          toast.error(finalMessage, {
            duration: duration,
            style: {
              fontSize: '15px'
            },
            onClick: () => {
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
    // Reset the logging flag and clear cached profile
    this.hasLoggedNoToken = false;
    this.cachedProfile = null;
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
  triggerOrderStatusUpdateNotification(orderData, newStatus, actorRole, targetRole = null) {
    console.log('🔔 Manual order status update notification triggered', {
      orderId: orderData._id?.slice(-6),
      newStatus,
      actorRole,
      targetRole
    });
    
    // Don't notify the person making the change
    if (actorRole === targetRole) {
      console.log('🔇 Skipping self-notification - actor and target are the same role');
      return;
    }
    
    // Check if this is a guest user - guests should only get email notifications, not toast
    const isGuest = orderData?.isGuestOrder || orderData?.userInfo?.isGuest || false;
    if (isGuest) {
      console.log('📧 Guest user detected - skipping toast notification (email only)');
      return;
    }
    
    // Determine the recipient role (who should receive the notification)
    const recipientRole = targetRole || (actorRole === 'artisan' ? 'patron' : 'artisan');
    
    // Play notification sound only if this is a real recipient
    if (this.notificationSound && recipientRole !== actorRole) {
      this.notificationSound();
    }

    // Show toast notification based on recipient role
    import('react-hot-toast').then(({ default: toast }) => {
      const orderId = orderData._id;
      const orderNumber = orderId?.slice(-6) || 'New';
      
      // Helper function to navigate to specific order
      const navigateToOrder = () => {
        // Navigate to orders page with specific order selected
        window.location.href = `/orders?orderId=${orderId}`;
      };
      
      if (recipientRole === 'patron') {
        // For patrons - only pending confirmation is action required
        const requiresAction = newStatus === 'delivered' || newStatus === 'picked_up';
        const needsConfirmation = requiresAction && !orderData.walletCredit?.patronConfirmedAt;
        
        const statusMessages = {
          'confirmed': 'Your order has been confirmed by the artisan',
          'preparing': 'Your order is being prepared',
          'ready_for_pickup': 'Your order is ready for pickup',
          'ready_for_delivery': 'Your order is ready for delivery',  
          'out_for_delivery': 'Your order is out for delivery',
          'delivered': needsConfirmation ? 'Confirm receipt of your delivery!' : 'Your order has been delivered!',
          'picked_up': needsConfirmation ? 'Confirm receipt of your pickup!' : 'Your order has been picked up!',
          'completed': 'Your order has been completed',
          'cancelled': 'Your order has been cancelled',
          'declined': 'Your order has been declined by the artisan'
        };

        const message = statusMessages[newStatus] || `Order status updated to: ${newStatus}`;
        const isPositive = !['cancelled', 'declined'].includes(newStatus);
        const prefix = needsConfirmation ? '⚡ ACTION REQUIRED: ' : '';
        
        if (isPositive) {
          toast.success(`${prefix}${message} Order #${orderNumber}`, {
            duration: needsConfirmation ? 8000 : 5000,
            onClick: navigateToOrder,
            style: needsConfirmation ? {
              background: '#FEF3C7',
              color: '#92400E',
              border: '2px solid #F59E0B',
              fontWeight: 'bold'
            } : undefined
          });
        } else {
          toast.error(`${message} Order #${orderNumber}`, {
            duration: 5000,
            onClick: navigateToOrder
          });
        }
      } else if (recipientRole === 'artisan') {
        // For artisans - only pending orders require action (confirm/decline)
        const requiresAction = newStatus === 'pending';
        
        const artisanStatusMessages = {
          'pending': 'New order needs confirmation!',
          'confirmed': 'Order confirmed',
          'preparing': 'Order is being prepared',
          'ready_for_pickup': 'Order is ready for pickup',
          'ready_for_delivery': 'Order is ready for delivery',
          'out_for_delivery': 'Order is out for delivery',
          'picked_up': 'Order has been picked up',
          'delivered': 'Order has been delivered',
          'completed': 'Order has been completed',
          'cancelled': 'Order was cancelled',
          'declined': 'Order was declined'
        };
        
        const message = artisanStatusMessages[newStatus] || `Order status updated to: ${newStatus}`;
        const prefix = requiresAction ? '⚡ ACTION REQUIRED: ' : '';
        
        toast.success(`${prefix}${message} Order #${orderNumber}`, {
          duration: requiresAction ? 8000 : 4000,
          onClick: navigateToOrder,
          style: requiresAction ? {
            background: '#FEF3C7',
            color: '#92400E',
            border: '2px solid #F59E0B',
            fontWeight: 'bold'
          } : undefined
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
