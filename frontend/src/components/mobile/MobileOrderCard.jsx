import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ShoppingBagIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import OptimizedImage from '../OptimizedImage';

/**
 * MobileOrderCard - Card-based order display optimized for mobile
 * 
 * Features:
 * - Compact, touch-friendly design
 * - Clear visual status indicators
 * - Swipeable (when integrated with swipe gestures)
 * - Easy-to-scan layout
 */
const MobileOrderCard = ({ 
  order, 
  onClick,
  onQuickAction, 
  className = '' 
}) => {
  // Status configuration
  const statusConfig = {
    pending: {
      icon: ClockIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      label: 'Pending'
    },
    confirmed: {
      icon: CheckCircleIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'Confirmed'
    },
    preparing: {
      icon: ShoppingBagIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      label: 'Preparing'
    },
    ready_for_pickup: {
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'Ready'
    },
    out_for_delivery: {
      icon: TruckIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'Delivering'
    },
    completed: {
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'Completed'
    },
    cancelled: {
      icon: XCircleIcon,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'Cancelled'
    }
  };

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Get first product image
  const getFirstProductImage = () => {
    if (order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      if (firstItem.product?.images && firstItem.product.images.length > 0) {
        return firstItem.product.images[0];
      }
      return firstItem.product?.image || null;
    }
    return null;
  };

  const firstImage = getFirstProductImage();
  const itemCount = order.items?.length || 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 active:scale-98 ${className}`}
      onClick={onClick}
    >
      {/* Status Bar */}
      <div className={`${status.bg} ${status.border} border-b px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${status.color}`} />
          <span className={`text-sm font-semibold ${status.color}`}>
            {status.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          #{order.orderNumber || order._id?.slice(-6)}
        </span>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Product Image */}
          {firstImage && (
            <div className="flex-shrink-0">
              <OptimizedImage
                src={firstImage}
                alt="Order item"
                className="w-16 h-16 rounded-lg"
                aspectRatio="1/1"
                objectFit="cover"
                fallbackSrc="/images/product-placeholder.png"
              />
              {itemCount > 1 && (
                <div className="absolute top-0 right-0 bg-[#D77A61] text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center -mr-1 -mt-1">
                  +{itemCount - 1}
                </div>
              )}
            </div>
          )}

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            {/* Items Summary */}
            <h3 className="font-semibold text-gray-900 truncate mb-1">
              {order.items && order.items.length > 0
                ? order.items.length === 1
                  ? order.items[0].product?.name || 'Order Item'
                  : `${itemCount} items`
                : 'Order Items'}
            </h3>

            {/* Date & Time */}
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate(order.createdAt)}</span>
            </div>

            {/* Delivery Info */}
            {order.deliveryMethod && (
              <div className="flex items-center gap-1 text-xs text-gray-600 truncate">
                {order.deliveryMethod === 'delivery' ? (
                  <>
                    <TruckIcon className="w-4 h-4" />
                    <span>Delivery</span>
                  </>
                ) : (
                  <>
                    <MapPinIcon className="w-4 h-4" />
                    <span>Pickup</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Price & Arrow */}
          <div className="flex flex-col items-end justify-between">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(order.totalPrice)}
            </span>
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Quick Actions (Optional) */}
        {onQuickAction && status.label === 'Ready' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction(order, 'mark_delivered');
              }}
              className="w-full bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-lg 
                       hover:bg-green-600 active:bg-green-700 transition-colors min-h-[44px]"
            >
              Mark as Delivered
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOrderCard;

