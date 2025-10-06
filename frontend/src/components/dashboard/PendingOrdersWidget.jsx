import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BellIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { orderNotificationService } from '../../services/orderNotificationService';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

export default function PendingOrdersWidget() {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadPendingOrders();
    
    // Listen for new order notifications
    const handleNewOrders = (event) => {
      const { orders } = event.detail;
      loadPendingOrders(); // Refresh the list
    };

    window.addEventListener('newOrdersReceived', handleNewOrders);
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingOrders, 30000);
    
    return () => {
      window.removeEventListener('newOrdersReceived', handleNewOrders);
      clearInterval(interval);
    };
  }, []);

  const loadPendingOrders = async () => {
    try {
      setIsLoading(true);
      const orders = await orderService.getArtisanOrders(false); // Get active orders only
      const pending = orders.filter(order => 
        ['pending', 'confirmed', 'preparing'].includes(order.status)
      );
      setPendingOrders(pending);
    } catch (error) {
      console.error('Error loading pending orders:', error);
      toast.error('Failed to load pending orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'confirmed': 'bg-blue-100 text-blue-800 border-blue-200',
      'preparing': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'confirmed':
        return <BellIcon className="w-4 h-4" />;
      case 'preparing':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const handleOrderClick = (order) => {
    navigate('/orders', { state: { selectedOrderId: order._id } });
  };

  const handleViewAllOrders = () => {
    navigate('/orders');
  };

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

  if (pendingOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBagIcon className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">All Orders Up to Date!</h3>
          <p className="text-gray-600 mb-4">
            You have no pending orders at the moment. Great job staying on top of things!
          </p>
          <button
            onClick={handleViewAllOrders}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            <ShoppingBagIcon className="w-4 h-4 mr-2" />
            View All Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <BellIcon className="w-6 h-6 text-orange-600" />
              {pendingOrders.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                  {pendingOrders.length > 9 ? '9+' : pendingOrders.length}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 ml-3">
              Pending Orders ({pendingOrders.length})
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-white/50"
          >
            <ArrowRightIcon 
              className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
            />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {pendingOrders.length === 1 
            ? 'You have 1 order that needs attention'
            : `You have ${pendingOrders.length} orders that need attention`
          }
        </p>
      </div>

      {/* Orders List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {pendingOrders.map((order) => (
            <div
              key={order._id}
              onClick={() => handleOrderClick(order)}
              className="px-6 py-4 border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors last:border-b-0 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1 capitalize font-semibold">{order.status}</span>
                  </span>
                  <span className="text-sm text-gray-500 font-mono">
                    #{order._id.slice(-6)}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.patron?.firstName || order.guestInfo?.firstName} {order.patron?.lastName || order.guestInfo?.lastName}
                    {order.guestInfo && <span className="text-xs text-gray-500 ml-1">(Guest)</span>}
                  </p>
                  <div className="mt-1">
                    <p className="text-xs text-gray-500">
                      {order.items?.length || 0} items • {formatDate(order.createdAt)}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-1">
                        {order.items.slice(0, 2).map((item, index) => (
                          <p key={index} className="text-xs text-gray-600 truncate">
                            • {item.product?.name || item.name || 'Product'} (Qty: {item.quantity})
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-gray-500 italic">
                            +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </div>
          ))}
          
          {/* View All Button */}
          <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50">
            <button
              onClick={handleViewAllOrders}
              className="w-full text-center py-3 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              View All Orders
            </button>
          </div>
        </div>
      )}

      {/* Collapsed View */}
      {!isExpanded && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {pendingOrders.length === 1 
                  ? '1 order pending'
                  : `${pendingOrders.length} orders pending`
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click to expand and view details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleViewAllOrders}
                className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                View All
              </button>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
