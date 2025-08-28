import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  HomeIcon,
  ArrowLeftIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../services/orderService';
import { getProfile } from '../services/authService';
import toast from 'react-hot-toast';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    loadUserAndOrders();
  }, []);

  const loadUserAndOrders = async () => {
    try {
      setIsLoading(true);
      const userData = await getProfile();
      setUser(userData);
      setUserRole(userData.role);

      // Load orders based on user role
          if (userData.role === 'artisan') {
      const ordersData = await orderService.getArtisanOrders();
        setOrders(ordersData);
      } else {
        const ordersData = await orderService.getBuyerOrders();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivering': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'confirmed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'preparing': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'ready': return <CheckCircleIcon className="w-4 h-4" />;
      case 'delivering': return <TruckIcon className="w-4 h-4" />;
      case 'delivered': return <HomeIcon className="w-4 h-4" />;
      case 'cancelled': return <XCircleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await orderService.cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      loadUserAndOrders(); // Reload orders
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, { status: newStatus });
      toast.success('Order status updated successfully');
      loadUserAndOrders(); // Reload orders
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {userRole === 'artisan' ? 'Orders to Fulfill' : 'My Orders'}
                </h1>
                <p className="text-gray-600">
                  {userRole === 'artisan' 
                    ? 'Manage and fulfill incoming orders' 
                    : 'Track your order history and status'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Summary */}
        {orders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Orders Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{orders.length}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'delivered').length}
                </div>
                <div className="text-sm text-gray-600">Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Order #{order._id.slice(-8).toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-6">
                  {/* Customer/Artisan Info */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {userRole === 'artisan' ? 'Patron' : 'Artisan'}
                    </h4>
                    <div className="text-sm text-gray-600">
                      {userRole === 'artisan' 
                        ? `${order.buyer?.firstName} ${order.buyer?.lastName}`
                        : `${order.artisan?.firstName} ${order.artisan?.lastName}`
                      }
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-3">
                            {item.product?.image && (
                              <img 
                                src={item.product.image.startsWith('http') ? item.product.image : item.product.image}
                                alt={item.product.name}
                                className="w-10 h-10 object-cover rounded"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {item.product?.name || 'Product'}
                              </div>
                              <div className="text-gray-500">
                                {item.quantity} x {formatCurrency(item.unitPrice)}
                              </div>
                            </div>
                          </div>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {order.deliveryAddress && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Delivery Address</h4>
                      <div className="text-sm text-gray-600">
                        {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                      </div>
                    </div>
                  )}

                  {/* Special Requests */}
                  {order.specialRequests && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Special Requests</h4>
                      <div className="text-sm text-gray-600">{order.specialRequests}</div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/order/${order._id}`)}
                        className="flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-700"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {userRole === 'patron' && order.status === 'pending' && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded"
                        >
                          Cancel Order
                        </button>
                      )}
                      
                      {userRole === 'artisan' && order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                          className="px-3 py-1 text-sm text-green-600 hover:text-green-700 border border-green-300 hover:border-green-400 rounded"
                        >
                          Confirm Order
                        </button>
                      )}
                      
                      {userRole === 'artisan' && order.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'preparing')}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-400 rounded"
                        >
                          Start Preparing
                        </button>
                      )}
                      
                      {userRole === 'artisan' && order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'ready')}
                          className="px-3 py-1 text-sm text-green-600 hover:text-green-700 border border-green-300 hover:border-green-400 rounded"
                        >
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <ClockIcon className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {userRole === 'artisan' ? 'No orders yet' : 'No orders yet'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {userRole === 'artisan' 
                ? 'When patrons place orders, they will appear here'
                : 'Start shopping to see your orders here'
              }
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              {userRole === 'artisan' ? 'View Products' : 'Start Shopping'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
