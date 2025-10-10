import React from 'react';
import { getPriorityStatuses, URGENCY_COLORS, getTimeAgo } from '../utils/orderPriority';

const PriorityOrderCard = ({ order, onClick, onQuickAction, userRole, isUpdating = false }) => {
  const PRIORITY_STATUSES = getPriorityStatuses(userRole);
  const statusConfig = PRIORITY_STATUSES[order.status];
  const urgencyColor = order.urgency || 'normal';
  
  // Don't render cards for terminated statuses (cancelled, declined, completed)
  const terminatedStatuses = ['cancelled', 'declined', 'completed'];
  if (!statusConfig || terminatedStatuses.includes(order.status)) {
    return null;
  }

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
      className={`min-w-[300px] max-w-[300px] bg-white rounded-lg p-4 shadow-md hover:shadow-2xl transition-all cursor-pointer border-l-4 flex flex-col ${getBorderClass()}`}
      onClick={() => onClick(order)}
      style={{ maxHeight: '400px' }}
    >
      {/* Urgency Badge */}
      <div className={`text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block ${getUrgencyBadgeClass()}`}>
        {getUrgencyText()}
      </div>
      
      {/* Order Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-gray-800">
          #{order.orderNumber || order._id.toString().slice(-8).toUpperCase()}
        </span>
        <span className="text-2xl">{statusConfig.icon}</span>
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
      
      {/* Quick Actions */}
      <div className="border-t pt-3 mt-3 flex gap-2">
        {statusConfig.actions && statusConfig.actions.length > 0 && statusConfig.actions.map(action => (
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
        ))}
      </div>
      
      {/* Click Indicator */}
      <div className="text-center text-xs text-gray-400 mt-2 italic">
        Click for full details →
      </div>
    </div>
  );
};

export default PriorityOrderCard;

