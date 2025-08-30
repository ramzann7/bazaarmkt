import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BellIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { orderNotificationService } from '../services/orderNotificationService';
import { orderService } from '../services/orderService';
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
      const orders = await orderService.getArtisanOrders();
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (pendingOrders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingBagIcon className="w-5 h-5 mr-2 text-gray-500" />
            Pending Orders
          </h3>
          <span className="text-sm text-gray-500">No pending orders</span>
        </div>
        <p className="text-gray-600 text-sm">
          All orders are up to date! Check back later for new orders.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <BellIcon className="w-5 h-5 text-orange-600" />
              {pendingOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pendingOrders.length > 9 ? '9+' : pendingOrders.length}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-2">
              Pending Orders ({pendingOrders.length})
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowRightIcon 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
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
              className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors last:border-b-0"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1 capitalize">{order.status}</span>
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    #{order._id.slice(-6)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {order.buyer?.firstName} {order.buyer?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.items?.length || 0} items • {formatDate(order.createdAt)}
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
          
          {/* View All Button */}
          <div className="px-4 py-3 bg-gray-50">
            <button
              onClick={handleViewAllOrders}
              className="w-full text-center text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              View All Orders
            </button>
          </div>
        </div>
      )}

      {/* Collapsed View */}
      {!isExpanded && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {pendingOrders.length === 1 
                  ? '1 order pending'
                  : `${pendingOrders.length} orders pending`
                }
              </p>
              <p className="text-xs text-gray-500">
                Click to expand and view details
              </p>
            </div>
            <button
              onClick={handleViewAllOrders}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
