import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BellIcon, 
  ShoppingBagIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { getPriorityStatuses, calculatePriorityScore, getUrgencyLevel, groupBy } from '../../utils/orderPriority';
import PriorityOrderCard from '../PriorityOrderCard';
import toast from 'react-hot-toast';

export default function DashboardPriorityQueue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [priorityOrders, setPriorityOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Get priority statuses for artisans
  const PRIORITY_STATUSES = useMemo(() => getPriorityStatuses('artisan'), []);

  useEffect(() => {
    loadPriorityOrders();
    
    // Listen for new order notifications
    const handleNewOrders = (event) => {
      loadPriorityOrders(); // Refresh the list
    };

    window.addEventListener('newOrdersReceived', handleNewOrders);
    
    // Refresh every 2 minutes to coordinate with notification service
    const interval = setInterval(loadPriorityOrders, 120000);
    
    return () => {
      window.removeEventListener('newOrdersReceived', handleNewOrders);
      clearInterval(interval);
    };
  }, []);

  const loadPriorityOrders = async () => {
    try {
      setIsLoading(true);
      
      // Load both sales and purchases for artisans
      const [salesOrders, purchasesOrders] = await Promise.all([
        orderService.getArtisanOrders(false, 'sales'), // Only active orders
        orderService.getArtisanOrders(false, 'purchases') // Only active orders
      ]);

      // Combine all orders
      const allOrders = [...(salesOrders || []), ...(purchasesOrders || [])];
      
      // Filter and process priority orders
      const terminatedStatuses = ['cancelled', 'declined', 'completed'];
      
      const processedOrders = allOrders
        .filter(order => {
          // Immediately filter out terminated statuses
          if (terminatedStatuses.includes(order.status)) {
            return false;
          }
          
          // Filter based on priority statuses
          return PRIORITY_STATUSES[order.status];
        })
        .map(order => {
          // Determine if this is a sales or purchase order
          const isSalesOrder = salesOrders?.some(so => so._id === order._id);
          const orderType = isSalesOrder ? 'sales' : 'purchases';
          
          return {
            ...order,
            orderType,
            priorityScore: calculatePriorityScore(order, 'artisan'),
            urgency: getUrgencyLevel(order, 'artisan'),
            // Boost sales orders priority by adding 1000 points
            adjustedPriorityScore: orderType === 'sales' 
              ? calculatePriorityScore(order, 'artisan') + 1000 
              : calculatePriorityScore(order, 'artisan')
          };
        })
        .sort((a, b) => {
          // Sort by adjusted priority score (sales orders will be first)
          return b.adjustedPriorityScore - a.adjustedPriorityScore;
        });

      setPriorityOrders(processedOrders);
    } catch (error) {
      console.error('Error loading priority orders:', error);
      toast.error(t('priorityQueue.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to update order status optimistically in UI
  const updateOrderStatusOptimistically = (orderId, newStatus) => {
    setPriorityOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => 
        order._id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
          : order
      );
      
      // Filter out orders that are no longer in priority statuses
      return updatedOrders.filter(order => 
        PRIORITY_STATUSES[order.status] && !['cancelled', 'declined', 'completed'].includes(order.status)
      );
    });
  };

  const handleQuickAction = async (orderId, action) => {
    // Prevent double-clicks during update
    if (updatingOrderId === orderId) {
      console.log('⏸️ Update already in progress for order:', orderId);
      return;
    }
    
    // Store original order for potential rollback
    const originalOrder = priorityOrders.find(o => o._id === orderId);
    if (!originalOrder) {
      console.error('❌ Order not found:', orderId);
      return;
    }
    
    try {
      setUpdatingOrderId(orderId);
      
      // Handle patron-specific actions
      if (action === 'Confirm Receipt') {
        const order = priorityOrders.find(o => o._id === orderId);
        if (!confirm(`Confirm that you ${order?.deliveryMethod === 'pickup' ? 'picked up' : 'received'} your order?`)) {
          setUpdatingOrderId(null);
          return;
        }
        
        // Optimistic update: remove from priority queue
        updateOrderStatusOptimistically(orderId, 'completed');
        
        try {
          await orderService.confirmOrderReceipt(orderId);
          // Note: Success notification handled by orderService
        } catch (error) {
          // Rollback on error
          updateOrderStatusOptimistically(orderId, originalOrder.status);
          throw error;
        }
        
        setUpdatingOrderId(null);
        return;
      }
      
      if (action === 'Cancel Order') {
        const reason = prompt('Please provide a reason for cancelling this order (optional):');
        
        // Optimistic update: remove from priority queue
        updateOrderStatusOptimistically(orderId, 'cancelled');
        
        try {
          await orderService.cancelOrder(orderId, reason);
          // Note: Success notification handled by orderService
        } catch (error) {
          // Rollback on error
          updateOrderStatusOptimistically(orderId, originalOrder.status);
          throw error;
        }
        
        setUpdatingOrderId(null);
        return;
      }
      
      // Handle artisan-specific actions
      const statusMap = {
        'Confirm': 'confirmed',
        'Start Preparing': 'preparing',
        'Mark Ready': (() => {
          const order = priorityOrders.find(o => o._id === orderId);
          return order?.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery';
        })(),
        'Mark Out for Delivery': 'out_for_delivery',
        'Mark Picked Up': 'picked_up',
        'Mark Delivered': 'delivered',
        'Decline': 'declined'
      };
      
      const newStatus = statusMap[action];
      if (!newStatus) {
        throw new Error(`Unknown action: ${action}`);
      }
      
      // Optimistic update: update status immediately
      updateOrderStatusOptimistically(orderId, newStatus);
      
      // Confirm decline action
      if (action === 'Decline') {
        const reason = prompt('Please provide a reason for declining this order (optional):');
        
        try {
          await orderService.updateOrderStatus(orderId, { 
            status: newStatus,
            declineReason: reason 
          });
          // Note: Success notification handled by orderService
        } catch (error) {
          // Rollback on error
          updateOrderStatusOptimistically(orderId, originalOrder.status);
          throw error;
        }
      } else {
        try {
          await orderService.updateOrderStatus(orderId, { status: newStatus });
          // Note: Success notification handled by orderService
        } catch (error) {
          // Rollback on error
          updateOrderStatusOptimistically(orderId, originalOrder.status);
          throw error;
        }
      }
      
      setUpdatingOrderId(null);
      
    } catch (error) {
      console.error('❌ Error processing quick action:', error);
      const errorMessage = error.response?.data?.message || error.message || t('priorityQueue.failedToUpdate');
      toast.error(errorMessage);
      setUpdatingOrderId(null);
    }
  };

  const handleOrderClick = (order) => {
    navigate(`/orders?orderId=${order._id}`);
  };

  const handleViewAllOrders = () => {
    navigate('/orders');
  };

  // Group orders by status for display
  const groupedOrders = useMemo(() => {
    return groupBy(priorityOrders, 'status');
  }, [priorityOrders]);

  // Count sales vs purchases
  const orderTypeCounts = useMemo(() => {
    const sales = priorityOrders.filter(o => o.orderType === 'sales').length;
    const purchases = priorityOrders.filter(o => o.orderType === 'purchases').length;
    return { sales, purchases };
  }, [priorityOrders]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-gray-200 rounded-full mr-3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (priorityOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('priorityQueue.allOrdersUpToDate')}</h3>
          <p className="text-gray-600 mb-4">
            {t('priorityQueue.noOrdersRequireAttention')}
          </p>
          <button
            onClick={handleViewAllOrders}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            <ShoppingBagIcon className="w-4 h-4 mr-2" />
            {t('priorityQueue.viewAllOrders')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl overflow-hidden relative shadow-lg">
      {/* Header - Responsive */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-orange-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Icon + Title */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              {priorityOrders.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold animate-pulse">
                  {priorityOrders.length > 9 ? '9+' : priorityOrders.length}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              🚨 Priority Queue
            </h3>
          </div>
          
          {/* Stats - mobile optimized */}
          <div className="flex items-center justify-between sm:justify-start gap-3 text-xs sm:text-sm">
            <span className="font-semibold text-blue-700">
              💼 {orderTypeCounts.sales} Sales
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-semibold text-teal-700">
              🛒 {orderTypeCounts.purchases} Purchases
            </span>
            <button
              onClick={handleViewAllOrders}
              className="ml-auto sm:ml-4 text-xs sm:text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors px-2 sm:px-3 py-1 sm:py-2 rounded-lg hover:bg-white/50"
            >
              View All
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mt-2">
          {priorityOrders.length === 1 
            ? '1 order needs immediate attention'
            : `${priorityOrders.length} orders need immediate attention`
          }
        </p>
      </div>

      {/* Status Tabs with Scroll Indicators */}
      <div className="relative px-3 sm:px-6 py-3 sm:py-4 border-b border-orange-200">
        {/* Gradient indicators for scrollable content */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-orange-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-orange-50 to-transparent z-10 pointer-events-none" />
        
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
          {Object.entries(PRIORITY_STATUSES).map(([status, config]) => {
            const count = groupedOrders[status]?.length || 0;
            if (count === 0) return null;
            
            const getTabClass = () => {
              switch (status) {
                case 'pending':
                  return 'bg-red-100 text-red-800 hover:bg-red-200';
                case 'confirmed':
                  return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                case 'preparing':
                  return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
                case 'ready_for_pickup':
                  return 'bg-green-100 text-green-800 hover:bg-green-200';
                case 'ready_for_delivery':
                  return 'bg-green-100 text-green-800 hover:bg-green-200';
                case 'out_for_delivery':
                  return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
                default:
                  return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
              }
            };
            
            return (
              <div
                key={status}
                className={`snap-start flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm whitespace-nowrap cursor-default transition-all ${getTabClass()}`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded-full text-xs font-bold">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Orders - Always Shown */}
      <div className="p-3 sm:p-6">
        {/* Horizontal Scrollable Cards with Snap */}
        <div 
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100"
          style={{ 
            scrollBehavior: 'smooth'
          }}
        >
          {priorityOrders.map(order => (
            <div key={order._id} className="snap-center flex-shrink-0 w-[85vw] sm:w-80">
              <PriorityOrderCard
                order={order}
                onClick={handleOrderClick}
                onQuickAction={handleQuickAction}
                userRole="artisan"
                isUpdating={updatingOrderId === order._id}
              />
            </div>
          ))}
        </div>
        
        {/* Pagination Dots for Mobile */}
        {priorityOrders.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {priorityOrders.map((_, idx) => (
              <div 
                key={idx} 
                className="w-2 h-2 rounded-full bg-orange-300 transition-all"
                aria-label={`Order ${idx + 1}`}
              />
            ))}
          </div>
        )}
        
        {/* Scroll Hint for Desktop */}
        {priorityOrders.length > 3 && (
          <div className="hidden sm:block text-center text-xs text-gray-500 mt-2">
            ← Scroll to see all {priorityOrders.length} priority order{priorityOrders.length > 1 ? 's' : ''} →
          </div>
        )}
      </div>
    </div>
  );
}
