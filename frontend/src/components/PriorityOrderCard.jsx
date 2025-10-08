import React from 'react';
import { getPriorityStatuses, URGENCY_COLORS, getTimeAgo } from '../utils/orderPriority';

const PriorityOrderCard = ({ order, onClick, onQuickAction, userRole }) => {
  const PRIORITY_STATUSES = getPriorityStatuses(userRole);
  const statusConfig = PRIORITY_STATUSES[order.status];
  const urgencyColor = order.urgency || 'normal';
  
  if (!statusConfig) return null;

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
        {statusConfig.actions.map(action => (
          <button
            key={action}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              onQuickAction(order._id, action);
            }}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
              action.includes('Decline') 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {action}
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

