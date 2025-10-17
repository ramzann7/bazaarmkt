import React from 'react';
import { useTranslation } from 'react-i18next';
import { getPriorityStatuses, URGENCY_COLORS, getTimeAgo } from '../utils/orderPriority';

const PriorityOrderCard = ({ order, onClick, onQuickAction, userRole, isUpdating = false }) => {
  const { t } = useTranslation();
  const orderType = order.orderType || 'order'; // 'sales', 'purchases', or 'order' (patron)
  
  // For artisans, use correct status list based on order type
  // Sales orders (seller) = artisan statuses
  // Purchase orders (buyer) = patron statuses
  const effectiveRole = (userRole === 'artisan' && orderType === 'purchases') ? 'patron' : userRole;
  const PRIORITY_STATUSES = getPriorityStatuses(effectiveRole);
  const statusConfig = PRIORITY_STATUSES[order.status];
  const urgencyColor = order.urgency || 'normal';
  
  // Don't render cards for terminated statuses (cancelled, declined, completed)
  const terminatedStatuses = ['cancelled', 'declined', 'completed'];
  if (!statusConfig || terminatedStatuses.includes(order.status)) {
    return null;
  }

  // Helper to get short status label
  const getShortStatus = () => {
    const shortLabels = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready_for_pickup': 'Ready',
      'ready_for_delivery': 'Ready',
      'out_for_delivery': 'In Transit',
      'delivered': 'Delivered',
      'picked_up': 'Picked Up'
    };
    return shortLabels[order.status] || statusConfig.label;
  };

  const getUrgencyBadgeClass = () => {
    switch (urgencyColor) {
      case 'critical':
        return 'bg-red-100 text-red-800 animate-pulse';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getBorderClass = () => {
    // Sales orders get special blue/purple borders
    if (orderType === 'sales') {
      switch (urgencyColor) {
        case 'critical':
          return 'border-purple-600 ring-2 ring-purple-200';
        case 'high':
          return 'border-blue-600';
        case 'medium':
          return 'border-blue-500';
        default:
          return 'border-blue-400';
      }
    }
    
    // Purchases orders get green/teal borders
    if (orderType === 'purchases') {
      switch (urgencyColor) {
        case 'critical':
          return 'border-teal-600 ring-2 ring-teal-200';
        case 'high':
          return 'border-teal-500';
        case 'medium':
          return 'border-teal-400';
        default:
          return 'border-teal-300';
      }
    }
    
    // Default (patron orders)
    switch (urgencyColor) {
      case 'critical':
        return 'border-red-500 ring-2 ring-red-200';
      case 'high':
        return 'border-orange-500';
      case 'medium':
        return 'border-yellow-500';
      default:
        return 'border-green-500';
    }
  };
  
  const getCardBackgroundClass = () => {
    if (orderType === 'sales') {
      return 'bg-gradient-to-br from-blue-50 to-purple-50';
    }
    if (orderType === 'purchases') {
      return 'bg-gradient-to-br from-teal-50 to-green-50';
    }
    return 'bg-white';
  };
  
  const getOrderTypeBadge = () => {
    if (orderType === 'sales') {
      return (
        <div className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-800 inline-block">
          💼 Selling
        </div>
      );
    }
    if (orderType === 'purchases') {
      return (
        <div className="text-xs font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-800 inline-block">
          🛒 Purchase
        </div>
      );
    }
    return null;
  };

  const getUrgencyText = () => {
    switch (urgencyColor) {
      case 'critical':
        return '🔴 URGENT';
      case 'high':
        return '🟠 ' + getTimeAgo(order.createdAt);
      case 'medium':
        return '🟡 ' + getTimeAgo(order.createdAt);
      default:
        return '🟢 ' + getTimeAgo(order.createdAt);
    }
  };

  return (
    <div 
      className={`min-w-[300px] max-w-[300px] rounded-lg p-4 shadow-md hover:shadow-2xl transition-all cursor-pointer border-l-4 flex flex-col ${getBorderClass()} ${getCardBackgroundClass()}`}
      onClick={() => onClick(order)}
      style={{ maxHeight: '400px' }}
    >
      {/* Order Type & Urgency Badges */}
      <div className="flex gap-2 mb-2">
        {getOrderTypeBadge()}
        <div className={`text-xs font-bold px-2 py-1 rounded-full inline-block ${getUrgencyBadgeClass()}`}>
          {getUrgencyText()}
        </div>
      </div>
      
      {/* Order Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-800">
            #{order.orderNumber || order._id.toString().slice(-8).toUpperCase()}
          </span>
          {/* Short status indicator replacing icon */}
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
            {getShortStatus()}
          </span>
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="space-y-2 flex-1">
        <div className="flex justify-between items-center">
          <div className="text-lg font-bold text-gray-900">
            ${(order.totalAmount || order.total || 0).toFixed(2)}
          </div>
          <div className="text-xs font-medium text-gray-600">
            {order.deliveryMethod === 'pickup' ? '📍 Pickup' : '🚚 Delivery'}
          </div>
        </div>
        
        {/* Items List - For Packaging Planning */}
        <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            📦 Items ({order.items?.length || 0}):
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {(order.items || []).slice(0, 4).map((item, idx) => {
              const productName = item.productName || item.name || 'Unknown Item';
              const displayName = productName.length > 25 
                ? productName.substring(0, 25) + '...' 
                : productName;
              
              return (
                <div 
                  key={idx} 
                  className="flex justify-between items-center text-xs bg-white rounded px-2 py-1"
                  title={productName}
                >
                  <span className="truncate flex-1">
                    {item.quantity}x {displayName}
                  </span>
                </div>
              );
            })}
            {order.items && order.items.length > 4 && (
              <div className="text-xs text-gray-500 italic px-2">
                +{order.items.length - 4} more item{order.items.length - 4 > 1 ? 's' : ''}...
              </div>
            )}
          </div>
        </div>
        
        {/* Special Instructions Preview */}
        {(order.deliveryAddress?.instructions || order.pickupInstructions) && (
          <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 flex items-start gap-1">
            <span>💬</span>
            <span className="truncate">
              {order.deliveryAddress?.instructions || order.pickupInstructions}
            </span>
          </div>
        )}
      </div>
      
      {/* Quick Actions - Filter based on order type */}
      <div className="border-t pt-3 mt-3 flex gap-2">
        {statusConfig.actions && statusConfig.actions.length > 0 && (() => {
          // For purchases (buying), filter actions appropriately
          let allowedActions = statusConfig.actions;
          
          if (orderType === 'purchases') {
            // Buying artisan can:
            // - Cancel when pending
            // - Confirm receipt when delivered/picked_up
            if (order.status === 'pending') {
              allowedActions = statusConfig.actions.filter(action => 
                action.includes('Cancel')
              );
            } else if (order.status === 'delivered' || order.status === 'picked_up') {
              allowedActions = statusConfig.actions.filter(action => 
                action.includes('Confirm Receipt')
              );
            } else {
              // No quick actions for other purchase statuses (just informational)
              allowedActions = [];
            }
          }
          
          // If no allowed actions, show a "View Details" prompt
          if (allowedActions.length === 0) {
            return (
              <div className="text-xs text-gray-500 italic text-center py-2">
                Click card for full details
              </div>
            );
          }
          
          return allowedActions.map(action => (
            <button
              key={action}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                if (!isUpdating) {
                  onQuickAction(order._id, action);
                }
              }}
              disabled={isUpdating}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                isUpdating 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : action.includes('Decline') || action.includes('Cancel')
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : action.includes('Confirm Receipt')
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isUpdating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                action
              )}
            </button>
          ));
        })()}
      </div>
      
      {/* Click Indicator */}
      <div className="text-center text-xs text-gray-400 mt-2 italic">
        Click for full details →
      </div>
    </div>
  );
};

export default PriorityOrderCard;

