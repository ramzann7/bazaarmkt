import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ShoppingBagIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import OptimizedImage from '../OptimizedImage';

/**
 * MobileOrderCard - Card-based order display optimized for mobile
 * 
 * Features:
 * - Compact, touch-friendly design
 * - Collapsible by default for better density
 * - Clear visual status indicators
 * - Swipeable (when integrated with swipe gestures)
 * - Easy-to-scan layout
 */
const MobileOrderCard = ({ 
  order, 
  onClick,
  onQuickAction, 
  className = '',
  defaultExpanded = false
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Status configuration
  const statusConfig = {
    pending: {
      icon: ClockIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      label: t('orders.statuses.pending')
    },
    confirmed: {
      icon: CheckCircleIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: t('orders.statuses.confirmed')
    },
    preparing: {
      icon: ShoppingBagIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      label: t('orders.statuses.processing')
    },
    ready_for_pickup: {
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: t('mobile.ready')
    },
    out_for_delivery: {
      icon: TruckIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: t('mobile.delivering')
    },
    completed: {
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: t('orders.statuses.completed')
    },
    cancelled: {
      icon: XCircleIcon,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: t('orders.statuses.cancelled')
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
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Compact Header - Always Visible - Collapsible */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Status Icon */}
          <div className={`w-8 h-8 rounded-full ${status.bg} flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
          </div>
          
          {/* Order Info */}
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              #{order.orderNumber || order._id?.slice(-6)}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {t('checkout.itemCount', { count: itemCount })} • {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        
        {/* Status Badge and Expand Icon */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={`${status.bg} ${status.color} text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap`}>
            {status.label}
          </span>
          <ChevronDownIcon 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
          {/* Items List - Compact */}
          <div className="space-y-2 pt-3">
            {order.items && order.items.length > 0 && order.items.map((item, index) => (
              <div key={item._id || index} className="flex items-center gap-2">
                {/* Smaller Product Image */}
                <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                  {item.product?.images?.[0] || item.product?.image ? (
                    <OptimizedImage
                      src={item.product.images?.[0] || item.product.image}
                      alt={item.product?.name || 'Product'}
                      className="w-full h-full object-cover"
                      aspectRatio="1/1"
                      objectFit="cover"
                      fallbackSrc="/images/product-placeholder.png"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">
                      📦
                    </div>
                  )}
                </div>
                
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {item.product?.name || 'Product'}
                  </p>
                  <p className="text-xs text-gray-500">
                    ×{item.quantity} {item.product?.unit || 'pc'}
                  </p>
                </div>
                
                {/* Item Price */}
                <p className="text-xs font-semibold text-gray-900 flex-shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          
          {/* Delivery Method */}
          {order.deliveryMethod && (
            <div className="flex items-center gap-2 text-xs text-gray-600 py-2 px-3 bg-gray-50 rounded-lg">
              {order.deliveryMethod === 'delivery' ? (
                <>
                  <TruckIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{t('checkout.delivery')}</span>
                </>
              ) : (
                <>
                  <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{t('checkout.pickup')}</span>
                </>
              )}
            </div>
          )}
          
          {/* Order Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">{t('common.total')}</span>
            <span className="text-base font-bold text-gray-900">
              {formatPrice(order.totalAmount || order.totalPrice || 0)}
            </span>
          </div>
          
          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick && onClick();
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[40px]"
            >
              {t('orders.viewDetails')}
            </button>
            
            {onQuickAction && (status.label === t('mobile.ready') || status.label === t('orders.statuses.pending')) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAction(order, status.label === t('mobile.ready') ? 'mark_delivered' : 'confirm');
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 active:bg-green-700 transition-colors min-h-[40px]"
              >
                {status.label === t('mobile.ready') ? t('mobile.markDelivered') : t('mobile.confirmOrder')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileOrderCard;

