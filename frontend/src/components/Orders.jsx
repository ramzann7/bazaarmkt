import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ShoppingBagIcon, 
  XMarkIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../services/orderService';
import { getProfile } from '../services/authservice';
import toast from 'react-hot-toast';
import OrderTimeline from './OrderTimeline';
import { geocodingService } from '../services/geocodingService';
import PriorityOrderQueue from './PriorityOrderQueue';

// Helper function to check if user is artisan (compatible with both role and userType)
const isArtisan = (userRole) => {
  return userRole === 'artisan';
};

export default function Orders() {
  const location = useLocation();
  const [allOrders, setAllOrders] = useState([]); // Cache all orders
  const [orders, setOrders] = useState([]); // Filtered orders for display
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [filter, setFilter] = useState('active'); // Default to active orders (priority queue shows all active orders with pending prioritized)
  const [userRole, setUserRole] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [ordersLoaded, setOrdersLoaded] = useState(false); // Track if orders have been loaded
  const [updatingOrderId, setUpdatingOrderId] = useState(null); // Track which order is being updated

  useEffect(() => {
    loadUserAndOrders();
    // Set up real-time updates every 2 minutes (less frequent)
    const interval = setInterval(loadUserAndOrders, 120000);
    return () => clearInterval(interval);
  }, []);

  // Apply filter when filter or userRole changes (no API call needed)
  useEffect(() => {
    if (ordersLoaded && userRole) {
      applyFilter();
    }
  }, [filter, ordersLoaded, userRole]);

  // Handle order confirmation from checkout
  useEffect(() => {
    if (location.state?.orders && location.state?.message) {
      setConfirmationData({
        orders: location.state.orders,
        message: location.state.message
      });
      setShowConfirmation(true);
      // Clear the state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    }
    
    // Handle selected order from profile navigation
    if (location.state?.selectedOrderId) {
      const selectedOrder = orders.find(order => order._id === location.state.selectedOrderId);
      if (selectedOrder) {
        setSelectedOrder(selectedOrder);
        setShowOrderDetails(true);
      }
      // Clear the state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, orders]);

  const loadUserAndOrders = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading user and orders...', forceRefresh ? '(FORCE REFRESH)' : '', ordersLoaded ? '(FROM CACHE)' : '(INITIAL LOAD)');
      const userProfile = await getProfile();
      const actualUserRole = userProfile.role || userProfile.userType; // Check both role and userType for compatibility
      setUserRole(actualUserRole);
      
      // Only load orders from API if not already loaded or force refresh
      if (!ordersLoaded || forceRefresh) {
        console.log('📋 Loading all orders from API...');
        let ordersData;
        if (actualUserRole === 'artisan') {
          ordersData = await orderService.getArtisanOrders(true); // Always load all orders
        } else {
          ordersData = await orderService.getPatronOrders(true); // Always load all orders
        }
        
        console.log('📦 All orders loaded from API:', {
          count: ordersData.length,
          statuses: ordersData.map(o => ({ id: o._id?.toString().slice(-8), status: o.status }))
        });
        
        setAllOrders(ordersData);
        setOrdersLoaded(true);
      }
      
      // Apply current filter to cached orders
      applyFilter();
      
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    if (!ordersLoaded || !userRole) {
      console.log('🔍 Skipping filter - ordersLoaded:', ordersLoaded, 'userRole:', userRole);
      return;
    }
    
    console.log('🔍 Applying filter:', filter, 'userRole:', userRole, 'to', allOrders.length, 'orders');
    
    let filteredOrders = [...allOrders];
    
    // Apply status-based filtering (check both role and userType for compatibility)
    const actualUserRole = userRole || 'patron'; // Default to patron if not set
    if (actualUserRole === 'artisan') {
      switch (filter) {
        case 'needs_action':
          filteredOrders = allOrders.filter(order => 
            ['pending'].includes(order.status)
          );
          break;
        case 'in_progress':
          filteredOrders = allOrders.filter(order => 
            ['confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery'].includes(order.status)
          );
          break;
        case 'active':
          // Show all active orders (not cancelled, completed, or declined) - priority sorting will handle prioritization
          filteredOrders = allOrders.filter(order => 
            !['cancelled', 'completed', 'declined'].includes(order.status)
          );
          break;
        case 'all':
          // Show all orders (no additional filtering)
          break;
        default:
          // Default: Show all active orders (not cancelled, completed, or declined) - priority sorting will handle prioritization
          filteredOrders = allOrders.filter(order => 
            !['cancelled', 'completed', 'declined'].includes(order.status)
          );
      }
    } else {
      // Patron filtering
      switch (filter) {
        case 'active':
          filteredOrders = allOrders.filter(order => 
            ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'picked_up'].includes(order.status)
          );
          break;
        case 'delivered':
          filteredOrders = allOrders.filter(order => 
            ['delivered', 'picked_up', 'completed'].includes(order.status)
          );
          break;
        case 'all':
          // Show all orders (no additional filtering)
          break;
        default:
          // Default to active orders for patrons
          filteredOrders = allOrders.filter(order => 
            ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'picked_up'].includes(order.status)
          );
      }
    }
    
    console.log('📦 Filtered orders result:', {
      filter: filter,
      userRole: userRole,
      totalOrders: allOrders.length,
      filteredCount: filteredOrders.length,
      statuses: filteredOrders.map(o => ({ id: o._id?.toString().slice(-8), status: o.status }))
    });
    
    setOrders(filteredOrders);
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };



  const handleQuickAction = async (orderId, action) => {
    try {
      setUpdatingOrderId(orderId); // Set the order as being updated
      // Handle patron-specific actions
      if (action === 'Confirm Receipt') {
        const order = orders.find(o => o._id === orderId);
        if (!confirm(`Confirm that you ${order?.deliveryMethod === 'pickup' ? 'picked up' : 'received'} your order?`)) {
          return;
        }
        const result = await orderService.confirmOrderReceipt(orderId);
        toast.success(`✅ Order confirmed! Artisan has been credited $${(result.data.creditedAmount || 0).toFixed(2)}`);
        await loadUserAndOrders();
        return;
      }
      
      if (action === 'Cancel Order') {
        const reason = prompt('Please provide a reason for cancelling this order (optional):');
        await orderService.cancelOrder(orderId, reason);
        toast.success('Order cancelled successfully');
        await loadUserAndOrders(true); // Force refresh after status update
        return;
      }
      
      // Handle artisan-specific actions
      const statusMap = {
        'Confirm': 'confirmed',
        'Start Preparing': 'preparing',
        'Mark Ready for Pickup': 'ready_for_pickup',
        'Mark Ready for Delivery': 'ready_for_delivery',
        'Mark Out for Delivery': 'out_for_delivery',
        'Mark Picked Up': 'picked_up',
        'Mark Delivered': 'delivered',
        'Decline': 'declined'
      };
      
      let newStatus = statusMap[action];
      
      // Handle the generic 'Mark Ready' action - determine status based on delivery method
      if (action === 'Mark Ready') {
        const order = orders.find(o => o._id === orderId);
        newStatus = order?.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery';
      }
      
      console.log('🔍 Frontend status mapping:', {
        action: action,
        newStatus: newStatus,
        statusMap: statusMap
      });
      
      // Check if we have a valid status
      if (!newStatus) {
        console.error('❌ No status mapping found for action:', action);
        toast.error(`Unknown action: ${action}`);
        return;
      }
      
      // Handle decline action with reason prompt
      if (action === 'Decline') {
        const reason = prompt('Please provide a reason for declining this order:');
        if (!reason) {
          toast.error('Decline reason is required');
          return;
        }
        await orderService.declineOrder(orderId, reason);
        toast.success('Order declined successfully');
        // Refresh orders list with a small delay to ensure backend has processed the update
        setTimeout(async () => {
          await loadUserAndOrders(true); // Force refresh after status update
          setUpdatingOrderId(null); // Clear updating state
        }, 500); // 500ms delay to ensure backend processing
      } else {
        // Update status for other actions
        await orderService.updateOrderStatus(orderId, { status: newStatus });
        toast.success(`Order updated to ${newStatus}`);
      }
      
      // Refresh orders list with a small delay to ensure backend has processed the update
      setTimeout(async () => {
        await loadUserAndOrders(true); // Force refresh after status update
        setUpdatingOrderId(null); // Clear updating state
      }, 500); // 500ms delay to ensure backend processing
    } catch (error) {
      console.error('❌ Error processing quick action:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update order';
      toast.error(errorMessage);
      setUpdatingOrderId(null); // Clear updating state on error
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status, deliveryMethod = 'pickup') => {
    const statusColors = {
      // Common statuses
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-orange-100 text-orange-800',
      'cancelled': 'bg-red-100 text-red-800',
      'declined': 'bg-red-100 text-red-800',
      
      // Pickup-specific statuses
      'ready_for_pickup': 'bg-green-100 text-green-800',
      'picked_up': 'bg-emerald-100 text-emerald-800',
      
      // Delivery-specific statuses
      'ready_for_delivery': 'bg-green-100 text-green-800',
      'out_for_delivery': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-emerald-100 text-emerald-800',
      
      // Final statuses
      'completed': 'bg-emerald-100 text-emerald-800',
      
      // Legacy statuses (for backward compatibility)
      'ready': 'bg-green-100 text-green-800',
      'delivering': 'bg-purple-100 text-purple-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusDisplayText = (status, deliveryMethod = 'pickup') => {
    const statusTexts = {
      // Common statuses
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'cancelled': 'Cancelled',
      'declined': 'Declined',
      
      // Pickup-specific statuses
      'ready_for_pickup': 'Ready for Pickup',
      'picked_up': 'Picked Up',
      
      // Delivery-specific statuses
      'ready_for_delivery': 'Ready for Delivery',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      
      // Final statuses
      'completed': 'Completed',
      
      // Legacy statuses (for backward compatibility)
      'ready': deliveryMethod === 'pickup' ? 'Ready for Pickup' : 'Ready for Delivery',
      'delivering': 'Out for Delivery'
    };
    return statusTexts[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
  };

  // Calculate order priority for artisans
  const calculateOrderPriority = (order) => {
    let priority = 0;
    const now = new Date();
    const orderAge = now - new Date(order.createdAt);
    const ageInHours = orderAge / (1000 * 60 * 60);
    
    // Base priority by status (higher number = higher priority)
    const statusPriority = {
      'pending': 100,      // Highest priority - needs immediate response
      'confirmed': 90,     // High priority - confirmed but not started
      'preparing': 80,     // Medium-high - in progress
      'ready_for_pickup': 70,    // Medium - ready for pickup
      'ready_for_delivery': 70,  // Medium - ready for delivery
      'out_for_delivery': 60,    // Lower - out for delivery
      'delivered': 10,     // Low - completed
      'picked_up': 10,     // Low - completed
      'completed': 5,      // Very low - fully completed
      'cancelled': 0,      // Lowest - cancelled
      'declined': 0,       // Lowest - declined
      // Legacy statuses
      'ready': 70,         // Medium - ready for next step
      'delivering': 60     // Lower - delivering
    };
    
    priority += statusPriority[order.status] || 0;
    
    // Age factor - older orders get higher priority
    if (ageInHours > 24) {
      priority += 30; // Orders older than 24 hours
    } else if (ageInHours > 12) {
      priority += 20; // Orders older than 12 hours
    } else if (ageInHours > 6) {
      priority += 10; // Orders older than 6 hours
    }
    
    // Product type priority - ready to ship gets higher priority
    const hasReadyToShip = order.items.some(item => item.productType === 'ready_to_ship');
    const hasMadeToOrder = order.items.some(item => item.productType === 'made_to_order');
    const hasScheduled = order.items.some(item => item.productType === 'scheduled_order');
    
    if (hasReadyToShip) {
      priority += 25; // Ready to ship items can be fulfilled immediately
    }
    if (hasMadeToOrder) {
      priority += 15; // Made to order requires preparation time
    }
    if (hasScheduled) {
      priority += 5; // Scheduled orders have specific timing
    }
    
    // Delivery method priority - pickup orders are easier to fulfill
    if (order.deliveryMethod === 'pickup') {
      priority += 10;
    }
    
    // Urgency indicators
    if (order.status === 'pending' && ageInHours > 2) {
      priority += 20; // Pending orders older than 2 hours are urgent
    }
    
    if ((order.status === 'ready_for_pickup' || order.status === 'ready_for_delivery') && ageInHours > 1) {
      priority += 25; // Ready orders older than 1 hour are very urgent (customer waiting)
    }
    
    return priority;
  };

  const getFilteredOrders = () => {
    let filteredOrders = [];
    
    if (filter === 'all') {
      filteredOrders = orders;
    } else if (isArtisan(userRole)) {
      switch (filter) {
        case 'needs_action':
          // Show only pending orders that need artisan action (confirm/decline)
          filteredOrders = orders.filter(order => order.status === 'pending');
          break;
        case 'in_progress':
          // Show all orders that are NOT completed (priority queue)
          filteredOrders = orders.filter(order => !['cancelled', 'declined', 'delivered', 'picked_up', 'completed'].includes(order.status));
          break;
        case 'delivered':
        case 'completed':
          filteredOrders = orders.filter(order => ['delivered', 'picked_up'].includes(order.status));
          break;
        case 'urgent':
        case 'high':
        case 'medium':
        case 'low':
          // Filter by priority level
          filteredOrders = orders.filter(order => {
            const priorityInfo = getPriorityInfo(order);
            return priorityInfo.level === filter;
          });
          break;
        default:
          filteredOrders = orders.filter(order => order.status === filter);
      }
    } else {
      switch (filter) {
        case 'active':
          filteredOrders = orders.filter(order => [
            'pending', 
            'confirmed', 
            'preparing', 
            'ready_for_pickup',
            'ready_for_delivery',
            'out_for_delivery'
          ].includes(order.status));
          break;
        case 'delivered':
          filteredOrders = orders.filter(order => ['delivered', 'picked_up'].includes(order.status));
          break;
        case 'cancelled':
          filteredOrders = orders.filter(order => ['cancelled', 'declined'].includes(order.status));
          break;
        default:
          filteredOrders = orders.filter(order => order.status === filter);
      }
    }
    
    // Sort by priority (highest first) for artisans
    if (isArtisan(userRole)) {
      return filteredOrders.sort((a, b) => {
        const priorityA = calculateOrderPriority(a);
        const priorityB = calculateOrderPriority(b);
        
        // If priorities are equal, sort by creation date (oldest first)
        if (priorityA === priorityB) {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        
        return priorityB - priorityA;
      });
    }
    
    // For patrons, sort by creation date (newest first)
    return filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getOrderStats = () => {
    const total = orders.length;
    
    if (isArtisan(userRole)) {
      // For artisans: focus on orders that need action
      const needsAction = orders.filter(o => o.status === 'pending').length;
      const inProgress = orders.filter(o => !['cancelled', 'declined', 'delivered', 'picked_up'].includes(o.status)).length;
      const completed = orders.filter(o => ['delivered', 'picked_up'].includes(o.status)).length;
      const declined = orders.filter(o => ['declined', 'cancelled'].includes(o.status)).length;
      
      return { total, needsAction, inProgress, completed, declined };
    } else {
      // For patrons: focus on active orders
      const active = orders.filter(o => [
        'pending', 
        'confirmed', 
        'preparing', 
        'ready', 
        'ready_for_pickup',
        'ready_for_delivery',
        'delivering',
        'out_for_delivery'
      ].includes(o.status)).length;
      const delivered = orders.filter(o => ['delivered', 'picked_up'].includes(o.status)).length;
      const cancelled = orders.filter(o => ['cancelled', 'declined'].includes(o.status)).length;
      
      return { total, active, delivered, cancelled };
    }
  };

  const stats = getOrderStats();
  const filteredOrders = getFilteredOrders();
  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get priority level and styling
  const getPriorityInfo = (order) => {
    const priority = calculateOrderPriority(order);
    const now = new Date();
    const orderAge = now - new Date(order.createdAt);
    const ageInHours = orderAge / (1000 * 60 * 60);
    
    if (priority >= 150) {
      return { level: 'urgent', color: 'bg-red-500', text: 'URGENT', icon: '🚨' };
    } else if (priority >= 120) {
      return { level: 'high', color: 'bg-orange-500', text: 'HIGH', icon: '⚡' };
    } else if (priority >= 90) {
      return { level: 'medium', color: 'bg-yellow-500', text: 'MEDIUM', icon: '⏰' };
    } else {
      return { level: 'low', color: 'bg-green-500', text: 'LOW', icon: '✅' };
    }
  };

  // Check if order is urgent based on age and status
  const isUrgent = (order) => {
    const now = new Date();
    const orderAge = now - new Date(order.createdAt);
    const ageInHours = orderAge / (1000 * 60 * 60);
    
    // Pending orders older than 2 hours are urgent
    if (order.status === 'pending' && ageInHours > 2) return true;
    
    // Confirmed orders older than 6 hours are urgent
    if (order.status === 'confirmed' && ageInHours > 6) return true;
    
    // Ready orders older than 1 hour are urgent (customer waiting for pickup/delivery)
    if ((order.status === 'ready_for_pickup' || order.status === 'ready_for_delivery') && ageInHours > 1) return true;
    
    // Any order older than 24 hours is urgent
    if (ageInHours > 24) return true;
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-4 shadow-lg">
            <ShoppingBagIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {isArtisan(userRole) ? 'Order Management' : 'My Orders'}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isArtisan(userRole) 
              ? 'Manage your customer orders and track order fulfillment' 
              : 'Track your order history and delivery status'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {isArtisan(userRole) ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Orders Needing Action</p>
                    <p className="text-3xl font-bold text-red-600">{stats.needsAction}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending & Confirmed orders</p>
                  </div>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-2xl">🚨</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Orders In Progress</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.inProgress}</p>
                    <p className="text-xs text-gray-500 mt-1">Preparing & Ready orders</p>
                  </div>
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-2xl">👨‍🍳</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Orders</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
                    <p className="text-xs text-gray-500 mt-1">Orders in progress</p>
                  </div>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-2xl">📦</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                    <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
                    <p className="text-xs text-gray-500 mt-1">Delivered & Picked up</p>
                  </div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-2xl">✅</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Priority Queue - For Both Artisans and Patrons */}
        <PriorityOrderQueue
          orders={orders}
          onOrderClick={handleOrderClick}
          onQuickAction={handleQuickAction}
          userRole={userRole}
        />

        {/* Enhanced Filters and View Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {isArtisan(userRole) ? (
                // Simplified artisan filters
                [
                  { key: 'active', label: 'Active Orders', icon: '⚡' },
                  { key: 'needs_action', label: 'Needs Action', icon: '🚨' },
                  { key: 'in_progress', label: 'In Progress', icon: '👨‍🍳' },
                  { key: 'all', label: 'All Orders', icon: '📦' }
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      filter === key
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))
              ) : (
                // Patron filters - focus on active orders
                [
                  { key: 'active', label: 'Active', icon: '📦' },
                  { key: 'delivered', label: 'Delivered', icon: '✅' },
                  { key: 'all', label: 'All Orders', icon: '📦' }
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      filter === key
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))
              )}
            </div>
            
            
            <div className="flex items-center gap-4">
              <button
                onClick={loadUserAndOrders}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-orange-100 text-orange-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-orange-100 text-orange-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBagIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No Orders Yet' : 
               filter === 'needs_action' ? 'No Orders Need Action' :
               filter === 'active' ? 'No Active Orders' :
               filter === 'in_progress' ? 'No Orders In Progress' :
               `No ${filter} Orders`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? (isArtisan(userRole) ? 'No customer orders yet.' : 'Start shopping to see your orders here.')
                : isArtisan(userRole) 
                  ? 'Great! All orders are being handled properly.'
                  : 'Try selecting a different filter or start shopping.'
              }
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
            {filteredOrders.map((order, index) => {
              // Get priority information for artisans
              const priorityInfo = isArtisan(userRole) ? getPriorityInfo(order) : null;
              const orderIsUrgent = isArtisan(userRole) ? isUrgent(order) : false;
              
              return (
                <div
                  key={order._id}
                  className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
                    orderIsUrgent 
                      ? 'border-red-300 bg-red-50 shadow-red-100' 
                      : priorityInfo?.level === 'high'
                        ? 'border-orange-300 bg-orange-50 shadow-orange-100'
                        : priorityInfo?.level === 'medium'
                          ? 'border-yellow-300 bg-yellow-50 shadow-yellow-100'
                          : 'border-gray-200'
                  }`}
                  onClick={() => handleOrderClick(order)}
                >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        Order #{order._id ? order._id.slice(-8).toUpperCase() : 'Unknown'}
                      </h3>
                      {isArtisan(userRole) && priorityInfo && (
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 text-xs font-bold ${priorityInfo.color} text-white rounded-full ${
                            priorityInfo.level === 'urgent' ? 'animate-pulse' : ''
                          }`}>
                            {priorityInfo.icon} {priorityInfo.text}
                          </span>
                          {priorityInfo.level === 'urgent' && (
                            <span className="text-xs text-red-600 font-medium">
                              {Math.floor((new Date() - new Date(order.createdAt)) / (1000 * 60 * 60))}h old
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-600">
                      ${(order.totalAmount || 0).toFixed(2)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status, order.deliveryMethod)}`}>
                        {getStatusDisplayText(order.status, order.deliveryMethod)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Timeline */}
                <div className="mb-4">
                  <OrderTimeline 
                    currentStatus={order.status} 
                    deliveryMethod={order.deliveryMethod} 
                    variant="card"
                  />
                </div>

                {/* Order Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">
                      {isArtisan(userRole) ? '👤 Customer:' : '🏪 Artisan:'}
                    </span> 
                    <span>
                      {isArtisan(userRole) 
                        ? (order.patron 
                            ? `${order.patron?.firstName} ${order.patron?.lastName}`
                            : `${order.guestInfo?.firstName} ${order.guestInfo?.lastName} (Guest)`
                          )
                        : (order.artisan?.artisanName || `${order.artisan?.firstName || ''} ${order.artisan?.lastName || ''}`.trim() || 'Unknown Artisan')
                      }
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">📦 Items:</span>
                    <div className="mt-1 space-y-1">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {item.product?.name || item.name || 'Unknown Product'}
                          </span>
                          <span className="text-gray-500 text-xs">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-gray-500 text-xs italic">
                          +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delivery Method Indicator */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">
                      {order.deliveryMethod === 'pickup' ? '📍 Pickup' : 
                       order.deliveryMethod === 'personalDelivery' ? '🚚 Personal Delivery' :
                       order.deliveryMethod === 'professionalDelivery' ? '🚛 Professional Delivery' : '📦 Delivery'}
                    </span>
                  </div>
                  
                  {/* Pickup Address (for pickup orders) */}
                  {order.deliveryMethod === 'pickup' && order.artisan?.pickupAddress && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">📍 Pickup Location:</span> 
                      <span>
                        {order.artisan.pickupAddress.street}, {order.artisan.pickupAddress.city}
                      </span>
                    </div>
                  )}
                  
                  {/* Delivery Address (for delivery orders) */}
                  {order.deliveryMethod !== 'pickup' && order.deliveryAddress && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">📍 Delivery To:</span> 
                      <span>
                        {order.deliveryAddress.street}, {order.deliveryAddress.city}
                      </span>
                    </div>
                  )}
                  
                  {/* Delivery Distance for Artisans */}
                  {order.deliveryMethod !== 'pickup' && order.deliveryDistance && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <span className="font-medium">📏 Distance:</span> 
                      <span>{(order.deliveryDistance || 0).toFixed(1)} km</span>
                    </div>
                  )}
                  
                  {/* Estimated Delivery Time */}
                  {order.deliveryMethod !== 'pickup' && order.estimatedDeliveryTime && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <span className="font-medium">🕒 Est. Delivery:</span> 
                      <span>{new Date(order.estimatedDeliveryTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                  
                  {order.deliveryMethod === 'pickup' && order.pickupTimeWindow && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <span className="font-medium">🕒 Pickup Time:</span> 
                      <span>{order.pickupTimeWindow.timeSlotLabel}</span>
                    </div>
                  )}
                </div>

                {/* Patron Confirmation Needed Badge */}
                {userRole === 'patron' && (order.status === 'delivered' || order.status === 'picked_up') && !order.walletCredit?.patronConfirmedAt && (
                  <div className="mt-4 p-3 bg-primary-50 border-2 border-amber-400 rounded-lg animate-pulse">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">Confirmation Needed</p>
                        <p className="text-xs text-primary-dark">
                          {order.deliveryMethod === 'pickup' ? 'Confirm pickup' : 'Confirm delivery received'}
                        </p>
                      </div>
                      <CheckCircleIcon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                )}

                {/* Action Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click to view details</span>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {order.status === 'preparing' && order.preparationStage && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-800">
                      Preparation Stage: {order.preparationStage ? order.preparationStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
                    </p>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            userRole={userRole}
            onClose={() => setShowOrderDetails(false)}
            onRefresh={loadUserAndOrders}
          />
        )}

        {/* Order Confirmation Modal */}
        {showConfirmation && confirmationData && (
          <OrderConfirmationModal
            confirmationData={confirmationData}
            onClose={() => setShowConfirmation(false)}
          />
        )}
      </div>
    </div>
  );
}

// Order Confirmation Modal Component
function OrderConfirmationModal({ confirmationData, onClose }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Order Confirmed!</h3>
              <p className="text-sm text-gray-600">Your orders have been placed successfully</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Message */}
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">{confirmationData.message}</p>
            <p className="text-sm text-gray-600">
              You will receive email confirmations for each order. Track your orders below.
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-3">
              {confirmationData.orders.map((order, index) => (
                <div key={order._id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        Order #{order._id ? order._id.slice(-8).toUpperCase() : 'Unknown'}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {order.artisan?.firstName} {order.artisan?.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${(order.totalAmount || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{order.items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Placed on {formatDate(order.createdAt)}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You'll receive email confirmations for each order</li>
              <li>• Artisans will start preparing your orders</li>
              <li>• Track your order status in real-time</li>
              <li>• You'll be notified when orders are ready for pickup/delivery</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Continue Shopping
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              View Orders
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Order Details Modal Component
function OrderDetailsModal({ order, userRole, onClose, onRefresh }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // Calculate delivery info when modal opens and order is ready for delivery
  useEffect(() => {
    if (order && (order.status === 'ready_for_delivery' || order.status === 'out_for_delivery') && order.deliveryMethod !== 'pickup') {
      calculateDeliveryInfo();
    }
  }, [order]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status, deliveryMethod = 'pickup') => {
    const statusColors = {
      // Common statuses
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-orange-100 text-orange-800',
      'cancelled': 'bg-red-100 text-red-800',
      'declined': 'bg-red-100 text-red-800',
      
      // Pickup-specific statuses
      'ready_for_pickup': 'bg-green-100 text-green-800',
      'picked_up': 'bg-emerald-100 text-emerald-800',
      
      // Delivery-specific statuses
      'ready_for_delivery': 'bg-green-100 text-green-800',
      'out_for_delivery': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-emerald-100 text-emerald-800',
      
      // Final statuses
      'completed': 'bg-emerald-100 text-emerald-800',
      
      // Legacy statuses (for backward compatibility)
      'ready': 'bg-green-100 text-green-800',
      'delivering': 'bg-purple-100 text-purple-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusDisplayText = (status, deliveryMethod = 'pickup') => {
    const statusTexts = {
      // Common statuses
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'cancelled': 'Cancelled',
      'declined': 'Declined',
      
      // Pickup-specific statuses
      'ready_for_pickup': 'Ready for Pickup',
      'picked_up': 'Picked Up',
      
      // Delivery-specific statuses
      'ready_for_delivery': 'Ready for Delivery',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      
      // Final statuses
      'completed': 'Completed',
      
      // Legacy statuses (for backward compatibility)
      'ready': deliveryMethod === 'pickup' ? 'Ready for Pickup' : 'Ready for Delivery',
      'delivering': 'Out for Delivery'
    };
    return statusTexts[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
  };

  // Estimate delivery time for PERSONAL DELIVERY ONLY (based on car driving speed)
  // Professional delivery times come from the API (Uber Direct)
  const estimateDeliveryTime = (distance, deliveryMethod) => {
    // Only calculate for personal delivery - professional delivery uses API times
    if (deliveryMethod !== 'personalDelivery') {
      return null;
    }
    
    if (!distance || distance <= 0) return null;
    
    // Realistic car driving speeds based on distance (for personal delivery)
    let speedKmh = 0;
    const prepTimeMinutes = 10; // Preparation time
    
    // Select speed based on distance (city/suburban/highway)
    if (distance <= 5) {
      speedKmh = 30; // City driving (traffic, lights, stops)
    } else if (distance <= 15) {
      speedKmh = 40; // Suburban driving (moderate traffic)
    } else {
      speedKmh = 60; // Highway driving (longer distances)
    }
    
    // Calculate travel time
    const travelTimeMinutes = (distance / speedKmh) * 60;
    
    // Add 15% buffer for real-world conditions (traffic, parking, finding address)
    const bufferMinutes = travelTimeMinutes * 0.15;
    
    // Total time
    const totalTimeMinutes = prepTimeMinutes + travelTimeMinutes + bufferMinutes;
    
    // Format time for simple display
    const formatTime = (minutes) => {
      if (minutes < 60) {
        return `${Math.round(minutes)} minutes`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
    };
    
    // Return simple format for user display
    return {
      totalTime: Math.round(totalTimeMinutes),
      formattedTime: formatTime(totalTimeMinutes)
    };
  };

  // Calculate delivery distance and time
  const calculateDeliveryInfo = async () => {
    if (!order.deliveryAddress || order.deliveryMethod === 'pickup') {
      return;
    }
    
    setIsCalculatingDistance(true);
    try {
      
      // Get artisan coordinates - try address first, then pickupAddress as fallback
      let artisanAddress = '';
      if (order.artisan?.address) {
        // Artisan model has: street, city, state, zipCode, lat, lng (no country field)
        artisanAddress = `${order.artisan.address.street || ''}, ${order.artisan.address.city || ''}, ${order.artisan.address.state || ''}, ${order.artisan.address.zipCode || ''}`.trim();
      } else if (order.artisan?.pickupAddress) {
        artisanAddress = `${order.artisan.pickupAddress.street || ''}, ${order.artisan.pickupAddress.city || ''}, ${order.artisan.pickupAddress.state || ''}, ${order.artisan.pickupAddress.zipCode || ''}`.trim();
      }
      
      // Clean up the address string (remove extra commas and spaces)
      artisanAddress = artisanAddress.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '');
      
      if (!artisanAddress || artisanAddress === ',') {
        console.warn('No valid artisan address found for distance calculation');
        console.warn('Available artisan data:', {
          hasAddress: !!order.artisan?.address,
          hasPickupAddress: !!order.artisan?.pickupAddress,
          addressFields: order.artisan?.address ? Object.keys(order.artisan.address) : [],
          pickupAddressFields: order.artisan?.pickupAddress ? Object.keys(order.artisan.pickupAddress) : []
        });
        
        // Try to use coordinates if available
        if (order.artisan?.address?.lat && order.artisan?.address?.lng) {
          console.log('📍 Using artisan coordinates for distance calculation');
          const artisanCoords = {
            latitude: order.artisan.address.lat,
            longitude: order.artisan.address.lng
          };
          
          // Get delivery address coordinates
          const deliveryAddress = `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.country}`;
          const deliveryCoords = await geocodingService.geocodeAddress(deliveryAddress);
          
          if (!deliveryCoords) {
            console.warn('Could not geocode delivery address:', deliveryAddress);
            setIsCalculatingDistance(false);
            return;
          }
          
          // Calculate distance
          const distance = geocodingService.calculateDistanceBetween(artisanCoords, deliveryCoords);
          console.log('📏 Calculated delivery distance using coordinates:', distance, 'km');
          setDeliveryDistance(distance);
          
          // Estimate delivery time
          const timeEstimate = estimateDeliveryTime(distance, order.deliveryMethod);
          console.log('⏱️ Estimated delivery time:', timeEstimate);
          setEstimatedDeliveryTime(timeEstimate);
          setIsCalculatingDistance(false);
          return;
        }
        
        // Temporary fallback for testing - use known artisan address
        console.log('📍 Using fallback artisan address for testing');
        const fallbackArtisanAddress = '123 Main Street, Montreal, Quebec, H1A 1A1';
        const artisanCoords = await geocodingService.geocodeAddress(fallbackArtisanAddress);
        
        if (!artisanCoords) {
          console.warn('Could not geocode fallback artisan address:', fallbackArtisanAddress);
          setIsCalculatingDistance(false);
          return;
        }
        
        // Get delivery address coordinates
        const deliveryAddress = `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.country}`;
        const deliveryCoords = await geocodingService.geocodeAddress(deliveryAddress);
        
        if (!deliveryCoords) {
          console.warn('Could not geocode delivery address:', deliveryAddress);
          setIsCalculatingDistance(false);
          return;
        }
        
        // Calculate distance
        const distance = geocodingService.calculateDistanceBetween(artisanCoords, deliveryCoords);
        console.log('📏 Calculated delivery distance using fallback address:', distance, 'km');
        setDeliveryDistance(distance);
        
        // Estimate delivery time
        const timeEstimate = estimateDeliveryTime(distance, order.deliveryMethod);
        console.log('⏱️ Estimated delivery time:', timeEstimate);
        setEstimatedDeliveryTime(timeEstimate);
        setIsCalculatingDistance(false);
        return;
      }
      
      const artisanCoords = await geocodingService.geocodeAddress(artisanAddress);
      
      if (!artisanCoords) {
        console.warn('Could not geocode artisan address:', artisanAddress);
        setIsCalculatingDistance(false);
        return;
      }
      
      // Get delivery address coordinates
      const deliveryAddress = `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.country}`;
      console.log('📍 Calculating distance to delivery address:', deliveryAddress);
      const deliveryCoords = await geocodingService.geocodeAddress(deliveryAddress);
      
      if (!deliveryCoords) {
        console.warn('Could not geocode delivery address:', deliveryAddress);
        setIsCalculatingDistance(false);
        return;
      }
      
      // Calculate distance
      const distance = geocodingService.calculateDistanceBetween(artisanCoords, deliveryCoords);
      console.log('📏 Calculated delivery distance:', distance, 'km');
      setDeliveryDistance(distance);
      
      // Estimate delivery time
      const timeEstimate = estimateDeliveryTime(distance, order.deliveryMethod);
      console.log('⏱️ Estimated delivery time:', timeEstimate);
      setEstimatedDeliveryTime(timeEstimate);
      
    } catch (error) {
      console.error('Error calculating delivery info:', error);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setIsLoading(true);
    try {
      await orderService.cancelOrder(order._id);
      toast.success('Order cancelled successfully');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setIsLoading(true);
    try {
      console.log('🔍 handleUpdateStatus called:', {
        orderId: order._id,
        newStatus: newStatus,
        order: order
      });
      
      await orderService.updateOrderStatus(order._id, { status: newStatus });
      toast.success(`Order status updated to ${getStatusDisplayText(newStatus, order.deliveryMethod)}`);
      onRefresh();
      onClose();
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update order status';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirm(`Confirm that you ${order.deliveryMethod === 'pickup' ? 'picked up' : 'received'} your order?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await orderService.confirmOrderReceipt(order._id);
      toast.success(`✅ Order confirmed! Artisan has been credited $${(result.data.creditedAmount || 0).toFixed(2)}`);
      onRefresh();
      onClose();
    } catch (error) {
      console.error('❌ Error confirming order receipt:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to confirm order';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining the order');
      return;
    }


    setIsDeclining(true);
    try {
      const result = await orderService.declineOrder(order._id, declineReason.trim());
      console.log('✅ Decline Order Success:', result);
      toast.success('Order declined successfully');
      setShowDeclineModal(false);
      setDeclineReason('');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('❌ Error declining order:', error);
      console.error('❌ Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to decline order';
      toast.error(errorMessage);
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <ShoppingBagIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Order #{order._id.slice(-8).toUpperCase()}
              </h3>
              <p className="text-sm text-gray-600">Order Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Status */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900 text-lg mb-1">Order Status</h4>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Created on {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="text-center">
                  <span className={`px-4 py-2 text-sm font-bold rounded-full ${getStatusColor(order.status, order.deliveryMethod)}`}>
                    {getStatusDisplayText(order.status, order.deliveryMethod)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Status</p>
                </div>
                <div className="text-center">
                  <span className={`px-4 py-2 text-sm font-bold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 'Unknown'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Payment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Decline/Cancellation Reason (if applicable) */}
          {(order.status === 'declined' || order.status === 'cancelled') && order.lastStatusUpdate?.reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                Reason for {order.status === 'declined' ? 'Decline' : 'Cancellation'}
              </h4>
              <p className="text-sm text-red-800 italic">"{order.lastStatusUpdate.reason}"</p>
              {order.lastStatusUpdate?.updatedAt && (
                <p className="text-xs text-red-600 mt-2">
                  Updated on {formatDate(order.lastStatusUpdate.updatedAt)}
                </p>
              )}
            </div>
          )}

          {/* Order Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Order Progress</h4>
            <OrderTimeline 
              currentStatus={order.status} 
              deliveryMethod={order.deliveryMethod} 
              variant="default"
            />
          </div>

          {/* Artisan/Customer Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {isArtisan(userRole) ? 'Customer Information' : 'Artisan Information'}
            </h4>
            <div className="space-y-1">
              {isArtisan(userRole) ? (
                <>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Name:</span> 
                    {order.patron 
                      ? `${order.patron?.firstName} ${order.patron?.lastName}`
                      : `${order.guestInfo?.firstName} ${order.guestInfo?.lastName} (Guest)`
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Email:</span> 
                    {order.patron?.email || order.guestInfo?.email}
                  </p>
                  {(order.patron?.phone || order.guestInfo?.phone) && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> 
                      {order.patron?.phone || order.guestInfo?.phone}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Name:</span> 
                    {order.artisan?.artisanName || `${order.artisan?.firstName} ${order.artisan?.lastName}` || 'Unknown Artisan'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Email:</span> 
                    {order.artisan?.email || 'No email provided'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> 
                    {order.artisan?.phone || 'No phone provided'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Business Type:</span> 
                    {order.artisan?.businessType || 'Artisan'}
                  </p>
                  {order.artisan?.description && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Description:</span> 
                      {order.artisan.description}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Order Items</h4>
            <div className="space-y-3">
              {order.items.map((item, index) => {
                // Debug logging for problematic orders
                if (!item.product?.name && !item.name && !item.productName) {
                  console.warn('🔍 Order item missing product name:', {
                    orderId: order._id,
                    itemIndex: index,
                    item: item,
                    availableFields: Object.keys(item)
                  });
                }
                return (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product?.name || item.name || item.productName || 'Unknown Product'}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">Unit Price: ${(item.unitPrice || item.productPrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${(item.totalPrice || item.itemTotal || ((item.unitPrice || item.productPrice || 0) * (item.quantity || 0))).toFixed(2)}</p>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-800">
                    ${(order.subtotal || order.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                
                {/* Delivery Fee */}
                {order.deliveryFee && order.deliveryFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Delivery Fee
                      {order.deliveryMethod === 'personalDelivery' && ' (Personal Delivery)'}
                      {order.deliveryMethod === 'professionalDelivery' && ' (Professional Delivery)'}
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      ${order.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-semibold text-gray-900">${(order.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Location Information (for pickup orders) */}
          {order.deliveryMethod === 'pickup' && order.artisan?.pickupAddress && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="font-medium text-emerald-900 mb-2 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5" />
                Pickup Location
              </h4>
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-800">{order.artisan.artisanName || 'Artisan Location'}</p>
                <p className="text-sm text-emerald-700">{order.artisan.pickupAddress.street}</p>
                <p className="text-sm text-emerald-700">
                  {order.artisan.pickupAddress.city}, {order.artisan.pickupAddress.state} {order.artisan.pickupAddress.zipCode}
                </p>
                
                {/* Pickup Time Windows */}
                {order.pickupTimeWindows && Object.keys(order.pickupTimeWindows).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <h5 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      Scheduled Pickup Time
                    </h5>
                    {Object.entries(order.pickupTimeWindows).map(([artisanId, timeWindow]) => (
                      <div key={artisanId} className="text-sm text-emerald-700">
                        {timeWindow.date && (
                          <p>
                            <span className="font-medium">Date:</span> {new Date(timeWindow.date).toLocaleDateString()}
                          </p>
                        )}
                        {timeWindow.timeSlot && (
                          <p>
                            <span className="font-medium">Time:</span> {
                              typeof timeWindow.timeSlot === 'string' 
                                ? timeWindow.timeSlot 
                                : timeWindow.timeSlot.label || `${timeWindow.timeSlot.start} - ${timeWindow.timeSlot.end}`
                            }
                          </p>
                        )}
                        {timeWindow.fullLabel && (
                          <p>
                            <span className="font-medium">Scheduled:</span> {timeWindow.fullLabel}
                          </p>
                        )}
                        {timeWindow.startTime && timeWindow.endTime && !timeWindow.timeSlot && (
                          <p>
                            <span className="font-medium">Time:</span> {timeWindow.startTime} - {timeWindow.endTime}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pickup Instructions */}
                {order.deliveryMethodDetails && order.deliveryMethodDetails.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <h5 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      Pickup Instructions
                    </h5>
                    {order.deliveryMethodDetails.map((detail, index) => (
                      detail.method === 'pickup' && detail.instructions && (
                        <p key={index} className="text-sm text-emerald-700 bg-emerald-100 p-2 rounded-lg border border-emerald-200">
                          {detail.instructions}
                        </p>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Address Information (for delivery orders) */}
          {order.deliveryMethod !== 'pickup' && order.deliveryAddress && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Delivery Address
              </h4>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">{order.deliveryAddress.street}</p>
                <p className="text-sm text-gray-600">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                </p>
                <p className="text-sm text-gray-600">{order.deliveryAddress.country}</p>
                
                {/* Delivery Instructions */}
                {order.deliveryInstructions && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-primary" />
                      Delivery Instructions
                    </h5>
                    <p className="text-sm text-gray-700 bg-primary-50 p-3 rounded-lg border border-primary-200">
                      {order.deliveryInstructions}
                    </p>
                  </div>
                )}
                
                {/* Delivery Distance and Time Information */}
                {order.deliveryMethod !== 'pickup' && (order.status === 'ready_for_delivery' || order.status === 'out_for_delivery') && (
                  <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <TruckIcon className="w-4 h-4" />
                      Delivery Information
                    </h5>
                    
                    {/* Distance Information */}
                    <div className="space-y-2">
                      {isCalculatingDistance ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="text-sm text-blue-700">Calculating delivery distance...</span>
                        </div>
                      ) : (
                        <>
                          {deliveryDistance && (
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                Distance: {(deliveryDistance || 0).toFixed(1)} km
                              </span>
                            </div>
                          )}
                          
                          {/* Estimated Delivery Time */}
                          {estimatedDeliveryTime && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                {isArtisan(userRole) ? 'Estimated Travel Time' : 'Estimated Delivery Time'}: {estimatedDeliveryTime.formattedTime}
                              </span>
                            </div>
                          )}
                          
                          {/* Delivery Method Badge */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">Delivery Type:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              order.deliveryMethod === 'personalDelivery' 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : 'Standard Delivery'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Legacy Delivery Distance for Backward Compatibility */}
                {order.deliveryMethod !== 'pickup' && order.deliveryDistance && !deliveryDistance && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">
                        Delivery Distance: {(order.deliveryDistance || 0).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Legacy Estimated Delivery Time for Backward Compatibility */}
                {order.deliveryMethod !== 'pickup' && order.estimatedDeliveryTime && !estimatedDeliveryTime && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        Estimated Delivery: {new Date(order.estimatedDeliveryTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pickup Time Window Information */}
          {order.deliveryMethod === 'pickup' && order.pickupTimeWindow && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" />
                Selected Pickup Time
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-800">Date:</span>
                  <span className="text-sm text-green-700">
                    {new Date(order.pickupTimeWindow.selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-800">Time Slot:</span>
                  <span className="text-sm text-green-700">{order.pickupTimeWindow.timeSlotLabel}</span>
                </div>
                {order.pickupTimeWindow.selectedTimeSlot && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-800">Slot ID:</span>
                    <span className="text-sm text-green-700">{order.pickupTimeWindow.selectedTimeSlot}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Notes */}
          {order.notes?.buyer && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Your Notes</h4>
              <p className="text-sm text-gray-600">{order.notes.buyer}</p>
            </div>
          )}

          {/* Artisan Notes */}
          {order.notes?.artisan && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Artisan Notes</h4>
              <p className="text-sm text-gray-600">{order.notes.artisan}</p>
            </div>
          )}

          {/* Decline Reason */}
          {order.status === 'declined' && order.declineReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">❌ Order Declined</h4>
              <p className="text-sm text-red-700 mb-2">
                <span className="font-medium">Reason:</span> {order.declineReason}
              </p>
              {order.declinedAt && (
                <p className="text-xs text-red-600">
                  Declined on: {formatDate(order.declinedAt)}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4">Order Actions</h4>
            
            {/* Patron Confirmation Alert */}
            {userRole === 'patron' && (order.status === 'delivered' || order.status === 'picked_up' || order.status === 'ready_for_pickup') && !order.walletCredit?.patronConfirmedAt && (
              <div className="mb-4 p-4 bg-primary-50 border-2 border-primary-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-amber-900 mb-1">Confirmation Required</h5>
                    <p className="text-sm text-primary-800 mb-2">
                      {order.deliveryMethod === 'pickup' 
                        ? 'Have you picked up your order? Please confirm once received.'
                        : 'Have you received your delivery? Please confirm once received.'}
                    </p>
                    <p className="text-xs text-primary-dark italic">
                      {order.deliveryMethod === 'pickup' && order.walletCredit?.autoConfirmDeadline
                        ? `Auto-confirms in ${Math.max(0, Math.round((new Date(order.walletCredit.autoConfirmDeadline) - new Date()) / (1000 * 60 * 60)))} hours if not confirmed`
                        : 'Please confirm to help the artisan receive their earnings'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap justify-end gap-3">
              {/* Patron: Confirm Receipt Button */}
              {userRole === 'patron' && (order.status === 'delivered' || order.status === 'picked_up') && !order.walletCredit?.patronConfirmedAt && (
                <button
                  onClick={handleConfirmReceipt}
                  disabled={isLoading}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {isLoading ? '⏳ Confirming...' : `✅ Confirm ${order.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}`}
                </button>
              )}
              
              {/* Patron: Cancel Order Button */}
              {userRole === 'patron' && order.status === 'pending' && (
                <button
                  onClick={handleCancelOrder}
                  disabled={isLoading}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  {isLoading ? '⏳ Cancelling...' : '❌ Cancel Order'}
                </button>
              )}
              
              {isArtisan(userRole) && (
                <>
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus('confirmed')}
                        disabled={isLoading}
                        title={isLoading ? 'Loading...' : 'Click to decline order'}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                      >
                        {isLoading ? '⏳ Confirming...' : '✅ Confirm Order'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeclineModal(true);
                        }}
                        disabled={isLoading}
                        title={isLoading ? 'Loading...' : 'Click to decline order'}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                        style={{ border: '2px solid red' }} // Visual indicator for debugging
                      >
                        ❌ Decline Order
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => handleUpdateStatus('preparing')}
                      disabled={isLoading}
                      title={isLoading ? 'Loading...' : 'Start preparing the order'}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {isLoading ? '⏳ Updating...' : '👨‍🍳 Start Preparing'}
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(order.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery')}
                      disabled={isLoading}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {isLoading ? '⏳ Updating...' : '🎯 Mark Ready'}
                    </button>
                  )}
                  {(order.status === 'ready_for_pickup' || order.status === 'ready_for_delivery') && (
                    <button
                      onClick={() => handleUpdateStatus(order.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery')}
                      disabled={isLoading}
                      className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {isLoading ? '⏳ Updating...' : 
                       order.deliveryMethod === 'pickup' ? '📍 Ready for Pickup' : 
                       '🚚 Start Delivery'}
                    </button>
                  )}
                  {order.status === 'ready_for_pickup' && (
                    <button
                      onClick={() => handleUpdateStatus('picked_up')}
                      disabled={isLoading}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {isLoading ? '⏳ Updating...' : '✅ Mark Picked Up'}
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => handleUpdateStatus('delivered')}
                      disabled={isLoading}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {isLoading ? '⏳ Updating...' : '🎉 Mark Delivered'}
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => handleUpdateStatus('delivered')}
                      disabled={isLoading}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      {isLoading ? '⏳ Updating...' : '🎉 Mark Delivered'}
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Decline Order Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" style={{ border: '5px solid red' }}>
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900">Decline Order</h3>
                  <p className="text-sm text-red-700">Please provide a reason for declining this order</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-100 rounded-full"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for declining *
                </label>
                <textarea
                  id="declineReason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please explain why you cannot fulfill this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeclineOrder}
                  disabled={isDeclining || !declineReason.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {isDeclining ? '⏳ Declining...' : 'Decline Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

