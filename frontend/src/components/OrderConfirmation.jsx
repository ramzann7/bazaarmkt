import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  XMarkIcon,
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
  CreditCardIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShoppingBagIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../services/orderService';
import { guestService } from '../services/guestService';
import toast from 'react-hot-toast';

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [createAccountForm, setCreateAccountForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (location.state?.orders && location.state?.message) {
      setOrderData({
        orders: location.state.orders,
        message: location.state.message,
        guestInfo: location.state.guestInfo,
        orderSummary: location.state.orderSummary
      });
      setIsLoading(false);
      
      // Clear the state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    } else {
      // If no order data in state, redirect to home
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    
    if (createAccountForm.password !== createAccountForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (createAccountForm.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      // Create account using guest service
      const response = await guestService.createAccount({
        firstName: createAccountForm.firstName,
        lastName: createAccountForm.lastName,
        email: createAccountForm.email,
        password: createAccountForm.password
      });

      toast.success('Account created successfully! You can now log in.');
      setShowCreateAccount(false);
      
      // Redirect to login
      navigate('/login', { 
        state: { 
          message: 'Account created successfully! Please log in to access your orders.',
          email: createAccountForm.email 
        }
      });
    } catch (error) {
      console.error('Error creating account:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create account. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (e) => {
    setCreateAccountForm({
      ...createAccountForm,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  const { orders, message, guestInfo, orderSummary } = orderData;
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 shadow-lg">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Order Confirmed! 🎉
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Thank you for your order! We've received your request and our artisans are getting started.
          </p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Order Summary</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-green-600">{totalOrders}</p>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-6">
            {orders.map((order, index) => (
              <div key={order._id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Order #{order._id.slice(-8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          from {order.artisan?.firstName} {order.artisan?.lastName}
                        </p>
                      </div>
                    </div>
                    
                    {/* Items */}
                    <div className="ml-11 space-y-2">
                      {order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">
                            {item.quantity}x {item.product?.name || 'Product'}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Order Details */}
                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>Placed on {formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{order.deliveryAddress?.city}, {order.deliveryAddress?.state}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Amount */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-900">Total Amount</span>
              <span className="text-3xl font-bold text-green-600">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Guest Information Card */}
        {guestInfo && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Delivery Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">
                      {guestInfo.firstName} {guestInfo.lastName}
                    </p>
                  </div>
                </div>
                
                {guestInfo.email && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{guestInfo.email}</p>
                    </div>
                  </div>
                )}

                {guestInfo.phone && (
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{guestInfo.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="font-medium text-gray-900">
                      {orderData.orders[0]?.deliveryAddress?.street}<br />
                      {orderData.orders[0]?.deliveryAddress?.city}, {orderData.orders[0]?.deliveryAddress?.state} {orderData.orders[0]?.deliveryAddress?.zipCode}
                    </p>
                  </div>
                </div>

                {orderData.orders[0]?.deliveryInstructions && (
                  <div className="flex items-start gap-3">
                    <ShoppingBagIcon className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Delivery Instructions</p>
                      <p className="font-medium text-gray-900">
                        {orderData.orders[0].deliveryInstructions}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* What's Next Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-orange-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">What Happens Next?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-green-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Order Confirmation</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive email confirmations for each order with tracking information.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-blue-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Artisan Preparation</h3>
                  <p className="text-sm text-gray-600">
                    Our artisans will start preparing your orders and update the status in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-purple-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Ready for Pickup/Delivery</h3>
                  <p className="text-sm text-gray-600">
                    You'll be notified when your orders are ready for pickup or delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-orange-600 text-sm font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Enjoy Your Order</h3>
                  <p className="text-sm text-gray-600">
                    Pick up your order or receive delivery and enjoy your local artisan products!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Account Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-purple-200 p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Want to Track Your Orders?
            </h2>
            <p className="text-gray-600">
              Create a free account to track your orders, save your preferences, and get exclusive offers.
            </p>
          </div>

          {!showCreateAccount ? (
            <div className="text-center">
              <button
                onClick={() => setShowCreateAccount(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Create Free Account
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <p className="text-sm text-gray-500 mt-3">
                No credit card required • Takes less than 2 minutes
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} className="max-w-md mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={createAccountForm.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={createAccountForm.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={createAccountForm.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={createAccountForm.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={createAccountForm.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateAccount(false)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <HomeIcon className="w-5 h-5" />
            Continue Shopping
          </Link>
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <CreditCardIcon className="w-5 h-5" />
            Print Receipt
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Questions about your order? Contact us at{' '}
            <a href="mailto:support@foodfinder.com" className="text-green-600 hover:text-green-700 underline">
              support@foodfinder.com
            </a>
          </p>
          <p className="mt-1">
            Order confirmation emails have been sent to {guestInfo?.email || 'your email address'}
          </p>
        </div>
      </div>
    </div>
  );
}
