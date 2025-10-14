import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
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
  HomeIcon,
  CalendarIcon,
  TruckIcon,
  BellIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../services/orderService';
import { guestService } from '../services/guestService';
import { geocodingService } from '../services/geocodingService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
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
        orderSummary: location.state.orderSummary,
        selectedPickupTimes: location.state.selectedPickupTimes,
        isPickupOrder: location.state.isPickupOrder
      });
      setIsLoading(false);
      
      // Clear the state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    } else {
      // If no order data in state, redirect to home
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  // Calculate delivery distance when order data is loaded
  useEffect(() => {
    if (orderData && orderData.orders?.length > 0 && 
        (orderData.orders[0]?.deliveryMethod === 'personalDelivery' || orderData.orders[0]?.deliveryMethod === 'delivery')) {
      calculateDeliveryDistance();
    }
  }, [orderData]);

  const calculateDeliveryDistance = async () => {
    if (!orderData?.orders?.[0]) {
      return;
    }

    const order = orderData.orders[0];
    const deliveryAddress = order.deliveryAddress;
    const artisan = order.artisan;

    if (!deliveryAddress || !artisan?.pickupAddress) {
      return;
    }

    setIsCalculatingDistance(true);
    try {
      // Format addresses for geocoding
      const deliveryAddressString = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}`;
      const artisanAddressString = `${artisan.pickupAddress.street}, ${artisan.pickupAddress.city}, ${artisan.pickupAddress.state} ${artisan.pickupAddress.zipCode}`;

      // Get coordinates for both addresses
      const [deliveryCoords, artisanCoords] = await Promise.all([
        geocodingService.geocodeAddress(deliveryAddressString),
        geocodingService.geocodeAddress(artisanAddressString)
      ]);

      if (deliveryCoords && artisanCoords) {
        const distance = geocodingService.calculateDistanceBetween(deliveryCoords, artisanCoords);
        if (distance !== null) {
          setDeliveryDistance(distance);
        }
      }
    } catch (error) {
      console.error('Error calculating delivery distance:', error);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date not available';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Time not available';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Time not available';
    }
  };

  // Use imported getImageUrl from imageUtils.js

  const formatPickupTime = (pickupTimeWindow) => {
    if (!pickupTimeWindow) return null;
    
    
    try {
      let date, timeStr;
      
      // Handle the time slot structure from pickupTimeService
      if (pickupTimeWindow.date && pickupTimeWindow.timeSlot) {
        // This is the structure from pickupTimeService
        date = new Date(pickupTimeWindow.date);
        timeStr = pickupTimeWindow.timeSlot.label || pickupTimeWindow.fullLabel || 'Time not specified';
      } else if (pickupTimeWindow.selectedDate) {
        // This is the structure from backend order data
        date = new Date(pickupTimeWindow.selectedDate);
        timeStr = pickupTimeWindow.timeSlotLabel || 'Time not specified';
      } else if (pickupTimeWindow.dateLabel && pickupTimeWindow.fullLabel) {
        // Alternative structure
        date = new Date(pickupTimeWindow.date);
        timeStr = pickupTimeWindow.fullLabel;
      } else {
        // Try to find any date field
        const dateValue = pickupTimeWindow.selectedDate || 
                         pickupTimeWindow.date || 
                         pickupTimeWindow.pickupDate;
        
        if (!dateValue) {
          return null;
        }
        
        date = new Date(dateValue);
        timeStr = pickupTimeWindow.timeSlotLabel || 
                 pickupTimeWindow.timeSlot?.label ||
                 pickupTimeWindow.fullLabel ||
                 'Time not specified';
      }
      
      if (isNaN(date.getTime())) {
        return null;
      }
      
      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      
      return {
        date: dateStr,
        time: timeStr,
        full: `${dateStr} at ${timeStr}`
      };
    } catch (error) {
      console.error('Error formatting pickup time:', error);
      return null;
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600 text-lg">Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  const { orders, message, guestInfo, orderSummary, isPickupOrder } = orderData;
  
  // Ensure orders is an array and has valid data
  if (!Array.isArray(orders) || orders.length === 0) {
    console.error('Invalid orders data:', orders);
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-amber-600 mb-4 font-display">Order Data Error</h1>
            <p className="text-stone-600 mb-6">Unable to display order confirmation. Please contact support.</p>
            <Link to="/" className="btn-primary px-6 py-3">Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }
  
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => {
    const amount = order.totalAmount || order.total || 0;
    return sum + amount;
  }, 0);

  return (
    <>
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print-break-before {
            page-break-before: always;
          }
          
          .print-break-after {
            page-break-after: always;
          }
          
          .print-break-inside-avoid {
            page-break-inside: avoid;
          }
          
          .print-no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-background print:bg-white print:min-h-0">
        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block print:border-b print:border-gray-300 print:pb-4 print:mb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-800 mb-2 font-display">Order Confirmation</h1>
            <p className="text-sm text-stone-600">Order Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 print:max-w-none print:px-0 print:py-0">
        {/* Success Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8 print:mb-4 print:border-b print:border-gray-300 print:pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-4 sm:mb-6 shadow-lg print:hidden">
            <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-800 mb-2 sm:mb-3 font-display print:text-2xl print:mb-2 px-4">
            Order Confirmed! 🎉
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto print:text-base print:max-w-none px-4">
            Thank you for your order! We've received your request and our artisans are getting started.
          </p>
        </div>

        {/* Order Summary Card - Mobile Optimized */}
        <div className="card p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 print:rounded-none print:shadow-none print:border print:border-gray-300 print:p-4 print:mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0 print:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-800 font-display print:text-xl">Order Summary</h2>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-stone-600 print:text-xs">Total Orders</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600 print:text-2xl">{totalOrders}</p>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-6 print:space-y-4">
            {orders.map((order, index) => {
              // Use the orderNumber from the order data if available, otherwise generate one
              const orderId = order._id || order.id || order.orderId || `order-${index + 1}`;
              const orderNumber = order.orderNumber || (typeof orderId === 'string' && orderId.length >= 8 
                ? orderId.slice(-8).toUpperCase() 
                : `ORDER${String(index + 1).padStart(3, '0')}`);
              
              
              return (
                <div key={orderId} className="bg-stone-50 rounded-xl p-6 border border-stone-200 print:bg-white print:rounded-none print:border print:border-gray-300 print:p-4 print:break-inside-avoid">
                  {/* Simplified Order Header */}
                  <div className="card p-4 mb-4 print:bg-gray-50 print:rounded-none print:border print:border-gray-300 print:p-3 print:mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center print:hidden">
                          <span className="text-white text-lg font-bold">A</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-800 text-lg print:text-base font-display">
                            {order.artisan?.artisanName || order.artisan?.firstName || 'Artisan'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {order.artisan?.type && (
                              <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full print:bg-gray-200 print:text-gray-800 print:rounded-none">
                                {order.artisan.type.charAt(0).toUpperCase() + order.artisan.type.slice(1)} Artisan
                              </span>
                            )}
                            {order.artisan?.rating && (
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500 print:text-gray-600">⭐</span>
                                <span className="text-xs text-stone-600">
                                  {(order.artisan.metrics?.rating || 0).toFixed(1)}/5
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-stone-800 print:text-xl">
                          ${(order.totalAmount || order.total || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-stone-500 print:text-xs">
                          {Array.isArray(order.items) ? order.items.length : 0} item{(Array.isArray(order.items) ? order.items.length : 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>


                  <div className="flex items-start justify-between mb-4 print:mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4 print:mb-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center print:hidden">
                          <span className="text-amber-600 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-800 print:text-sm font-display">
                            Order #{orderNumber}
                          </h3>
                        </div>
                      </div>
                    
                    {/* Items */}
                    <div className="ml-11 space-y-3 print:ml-0 print:space-y-2">
                      {Array.isArray(order.items) ? order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="card p-3 print:bg-gray-50 print:rounded-none print:border print:border-gray-300 print:p-2 print:break-inside-avoid">
                          <div className="flex gap-3 mb-2 print:gap-2 print:mb-1">
                            {/* Product Image */}
                            {(item.product?.image || item.image) && (
                              <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 print:hidden">
                                <img 
                                  src={getImageUrl(item.product?.image || item.image, { width: 64, height: 64, quality: 80 })} 
                                  alt={item.product?.name || item.name || 'Product'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400 text-xs" style={{display: 'none'}}>
                                  No Image
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-stone-800 text-sm print:text-xs">
                                    {item.productName || item.product?.name || item.name || 'Product'}
                                  </h4>
                                  {(item.product?.description || item.description) && (
                                    <p className="text-xs text-stone-600 mt-1 line-clamp-2 print:text-xs">
                                      {item.product?.description || item.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right ml-4 print:ml-2">
                                  <p className="font-bold text-stone-800 print:text-sm">
                                    ${((parseFloat(item.unitPrice) || parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-stone-500 print:text-xs">
                                    {item.quantity}x ${(parseFloat(item.unitPrice) || parseFloat(item.price) || 0).toFixed(2)} each
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Product Type Badge and Timing Information */}
                          {item.product?.productType && (
                            <div className="space-y-2 mt-2 print:mt-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full print:rounded-none print:px-1 print:py-0.5 ${
                                  item.product.productType === 'ready_to_ship' 
                                    ? 'bg-emerald-100 text-emerald-800 print:bg-gray-200 print:text-gray-800'
                                    : item.product.productType === 'made_to_order'
                                    ? 'bg-amber-100 text-amber-800 print:bg-gray-200 print:text-gray-800'
                                    : 'bg-purple-100 text-purple-800 print:bg-gray-200 print:text-gray-800'
                                }`}>
                                  {item.product.productType === 'ready_to_ship' ? 'Ready to Ship' :
                                   item.product.productType === 'made_to_order' ? 'Made to Order' :
                                   'Scheduled Order'}
                                </span>
                              </div>
                              
                              {/* Product-Specific Timing Information */}
                              {item.product.productType === 'ready_to_ship' && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 print:bg-gray-50 print:border-gray-300 print:rounded-none print:p-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 print:hidden">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-semibold text-emerald-800 mb-1">Ready to Ship</h5>
                                      <p className="text-xs text-emerald-700">
                                        This item is ready and will be shipped immediately.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {item.product.productType === 'made_to_order' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 print:bg-gray-50 print:border-gray-300 print:rounded-none print:p-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 print:hidden">
                                      <span className="text-white text-xs">⚒</span>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-semibold text-amber-800 mb-1">Made to Order</h5>
                                      <p className="text-xs text-amber-700">
                                        This item is being custom-made for you. Production typically takes 3-7 business days. You'll receive updates on progress.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {item.product.productType === 'scheduled_order' && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 print:bg-gray-50 print:border-gray-300 print:rounded-none print:p-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 print:hidden">
                                      <span className="text-white text-xs">📅</span>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-semibold text-purple-800 mb-1">Scheduled Order</h5>
                                      <p className="text-xs text-purple-700">
                                        This item is scheduled for production. You'll be notified of the exact timeline and when it's ready.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="text-sm text-stone-500 bg-stone-50 rounded-lg p-3">No items found</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm print:ml-0 print:grid-cols-2 print:gap-2 print:text-xs">
                  <div className="flex items-center gap-2 text-stone-600">
                    <ClockIcon className="w-4 h-4 print:hidden" />
                    <span>Placed on {formatDate(order.createdAt || new Date())}</span>
                  </div>
                  {/* Only show delivery address for delivery orders */}
                  {order.deliveryMethod === 'delivery' && (
                  <div className="flex items-center gap-2 text-stone-600">
                      <MapPinIcon className="w-4 h-4 print:hidden" />
                    <span>{order.deliveryAddress?.city || 'Unknown'}, {order.deliveryAddress?.state || 'Unknown'}</span>
                  </div>
                  )}
                  
                </div>
              </div>
            )})}
          </div>

          {/* Order Breakdown */}
          <div className="border-t border-stone-200 pt-6 mt-6 print:pt-4 print:mt-4 print:border-gray-300">
            <div className="space-y-3 print:space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="text-lg text-stone-700 print:text-base">Subtotal</span>
                <span className="text-lg font-semibold text-stone-800 print:text-base">
                  ${orders.reduce((sum, order) => sum + (order.subtotal || order.totalAmount || 0), 0).toFixed(2)}
                </span>
              </div>
              
              {/* Delivery Fee - Show for any delivery method */}
              {orders.some(order => 
                (order.deliveryMethod === 'personalDelivery' || order.deliveryMethod === 'professionalDelivery')
              ) && (() => {
                // Calculate delivery fee: If not provided, calculate from totalAmount - subtotal
                const calculatedDeliveryFee = orders.reduce((sum, order) => {
                  console.log('💰 Calculating delivery fee for order:', {
                    orderId: order._id,
                    deliveryMethod: order.deliveryMethod,
                    deliveryFee: order.deliveryFee,
                    totalAmount: order.totalAmount,
                    subtotal: order.subtotal,
                    itemsTotal: order.items?.reduce((s, item) => s + ((item.price || item.unitPrice || 0) * item.quantity), 0)
                  });
                  
                  if (order.deliveryFee !== undefined && order.deliveryFee !== null) {
                    console.log('✅ Using order.deliveryFee:', order.deliveryFee);
                    return sum + order.deliveryFee;
                  }
                  // Calculate from total - subtotal
                  const orderSubtotal = order.subtotal || order.items?.reduce((s, item) => s + ((item.price || item.unitPrice || 0) * item.quantity), 0) || 0;
                  const orderTotal = order.totalAmount || 0;
                  const calculatedFee = Math.max(0, orderTotal - orderSubtotal);
                  console.log('🔢 Calculated delivery fee:', {
                    orderTotal,
                    orderSubtotal,
                    calculatedFee
                  });
                  return sum + calculatedFee;
                }, 0);
                
                console.log('📊 Final delivery fee display:', calculatedDeliveryFee);
                
                return (
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-stone-700 print:text-base">
                      Delivery Fee
                      {orders[0]?.deliveryMethod === 'personalDelivery' && ' (Personal)'}
                      {orders[0]?.deliveryMethod === 'professionalDelivery' && ' (Professional)'}
                    </span>
                    <span className="text-lg font-semibold text-stone-800 print:text-base">
                      ${calculatedDeliveryFee.toFixed(2)}
                    </span>
                  </div>
                );
              })()}
              
              {/* Total Amount */}
              <div className="flex justify-between items-center pt-3 border-t border-stone-200 print:border-gray-300">
                <span className="text-xl font-semibold text-stone-800 print:text-lg font-display">Total Amount</span>
                <span className="text-3xl font-bold text-amber-600 print:text-2xl print:text-gray-900">${(totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Information Card - Mobile Optimized */}
        {(orders[0]?.deliveryMethod === 'personalDelivery' || orders[0]?.deliveryMethod === 'delivery' || orders[0]?.deliveryMethod === 'professionalDelivery') && (
          <div className="card p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 print:rounded-none print:shadow-none print:border print:border-gray-300 print:p-4 print:mb-4 print:break-inside-avoid">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 print:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center print:hidden">
                <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-800 print:text-lg font-display">Delivery Information</h2>
            </div>

            <div className="space-y-4 print:space-y-2">
              {/* Delivery Type Badge */}
              <div className="flex items-center gap-2 mb-4">
                <div className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
                  {orders[0]?.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : 
                   orders[0]?.deliveryMethod === 'professionalDelivery' ? 'Professional Delivery' : 
                   'Standard Delivery'}
                </div>
                {orders[0]?.deliveryMethod === 'personalDelivery' && (
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full">
                    Artisan Delivers
                  </div>
                )}
                {orders[0]?.deliveryMethod === 'professionalDelivery' && (
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Professional Courier
                  </div>
                )}
              </div>

              {/* Delivery Timing Information */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none print:p-3">
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-amber-600 mt-0.5 print:hidden" />
                  <div>
                    <h4 className="font-medium text-amber-800 print:text-gray-800 mb-2">Delivery Information</h4>
                    {orders[0]?.deliveryMethod === 'personalDelivery' && (() => {
                      const artisan = orders[0]?.artisan;
                      const hasDeliveryInfo = artisan?.deliveryInstructions || artisan?.deliveryTimeSlots?.length > 0;
                      
                      return (
                        <div className="space-y-1 text-sm text-amber-700 print:text-gray-600">
                          <p>• <strong>Personal Delivery:</strong> Delivered directly by the artisan</p>
                          {artisan?.deliveryInstructions && (
                            <p>• <strong>Instructions:</strong> {artisan.deliveryInstructions}</p>
                          )}
                          {artisan?.deliveryTimeSlots?.length > 0 && (
                            <p>• <strong>Available Times:</strong> {artisan.deliveryTimeSlots.join(', ')}</p>
                          )}
                          {!hasDeliveryInfo && (
                            <p>• <strong>Contact:</strong> You'll receive a call/text before delivery</p>
                          )}
                        </div>
                      );
                    })()}
                    {orders[0]?.deliveryMethod === 'professionalDelivery' && (
                      <div className="space-y-1 text-sm text-amber-700 print:text-gray-600">
                        <p>• <strong>Professional Delivery:</strong> Delivered by certified courier (Uber Direct)</p>
                        <p>• <strong>Tracking:</strong> You'll receive tracking information via email once the order is ready</p>
                        {orders[0]?.deliveryPricing?.chargedAmount && (
                          <>
                            <p>• <strong>Delivery Fee:</strong> ${parseFloat(orders[0].deliveryPricing.chargedAmount).toFixed(2)} (includes 20% buffer for surge protection)</p>
                            {orders[0].deliveryPricing.estimatedFee && (
                              <p className="text-xs text-amber-600">
                                Estimated: ${parseFloat(orders[0].deliveryPricing.estimatedFee).toFixed(2)} + ${parseFloat(orders[0].deliveryPricing.buffer || 0).toFixed(2)} buffer. Any unused amount will be refunded.
                              </p>
                            )}
                          </>
                        )}
                        <p>• <strong>Delivery Time:</strong> Typically 20-40 minutes after order is ready</p>
                      </div>
                    )}
                    {orders[0]?.deliveryMethod === 'delivery' && (
                      <div className="space-y-1 text-sm text-amber-700 print:text-gray-600">
                        <p>• <strong>Standard Delivery:</strong> Delivered via standard shipping</p>
                        <p>• <strong>Tracking:</strong> You'll receive tracking information via email</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPinIcon className="w-5 h-5 text-stone-400 mt-1 print:hidden" />
                <div>
                  <p className="text-sm text-stone-600 print:text-xs">Delivery Address</p>
                  <p className="font-medium text-stone-800 print:text-sm">
                    {orders[0]?.deliveryAddress?.street || 'Address not available'}<br />
                    {orders[0]?.deliveryAddress?.city || 'City'}, {orders[0]?.deliveryAddress?.state || 'State'} {orders[0]?.deliveryAddress?.zipCode || ''}
                  </p>
                  {/* Delivery Distance */}
                  {deliveryDistance !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <TruckIcon className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-amber-600 font-medium">
                        Delivery distance: {deliveryDistance.toFixed(1)} km
                      </span>
                    </div>
                  )}
                  {isCalculatingDistance && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                      <span className="text-sm text-stone-500">Calculating distance...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estimated Delivery Time */}
              {orders[0]?.estimatedDeliveryTime && (
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-stone-400 mt-1 print:hidden" />
                  <div>
                    <p className="text-sm text-stone-600 print:text-xs">Estimated Delivery Time</p>
                    <p className="font-medium text-stone-800 print:text-sm">
                      {formatDate(orders[0].estimatedDeliveryTime)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Set by {orders[0].artisan?.artisanName || orders[0].artisan?.businessName}
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Status */}
              {orders[0]?.status && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center mt-1 print:hidden">
                    {orders[0].status === 'delivered' ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    ) : orders[0].status === 'out_for_delivery' ? (
                      <TruckIcon className="w-5 h-5 text-amber-500" />
                    ) : (
                      <ClockIcon className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 print:text-xs">Delivery Status</p>
                    <p className="font-medium text-stone-800 print:text-sm capitalize">
                      {orders[0].status.replace(/_/g, ' ')}
                    </p>
                    {orders[0].actualDeliveryTime && (
                      <p className="text-xs text-stone-500 mt-1">
                        Delivered on {formatDate(orders[0].actualDeliveryTime)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {orders[0]?.deliveryInstructions && (
                <div className="flex items-start gap-3">
                  <ShoppingBagIcon className="w-5 h-5 text-stone-400 mt-1" />
                  <div>
                    <p className="text-sm text-stone-600">Delivery Instructions</p>
                    <p className="font-medium text-stone-800">
                      {orders[0]?.deliveryInstructions || 'No special instructions'}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Guest Information Card */}
        {guestInfo && guestInfo.firstName && guestInfo.lastName && (
          <div className="card p-8 mb-8 print:rounded-none print:shadow-none print:border print:border-gray-300 print:p-4 print:mb-4 print:break-inside-avoid">
            <div className="flex items-center gap-3 mb-6 print:mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center print:hidden">
                <UserIcon className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 print:text-lg font-display">Guest Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              <div className="space-y-4 print:space-y-2">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-stone-400 print:hidden" />
                  <div>
                    <p className="text-sm text-stone-600 print:text-xs">Name</p>
                    <p className="font-medium text-stone-800 print:text-sm">
                      {guestInfo.firstName} {guestInfo.lastName}
                    </p>
                  </div>
                </div>
                
                {guestInfo.email && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-stone-400 print:hidden" />
                    <div>
                      <p className="text-sm text-stone-600 print:text-xs">Email</p>
                      <p className="font-medium text-stone-800 print:text-sm">{guestInfo.email}</p>
                    </div>
                  </div>
                )}

                {guestInfo.phone && (
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-stone-400 print:hidden" />
                    <div>
                      <p className="text-sm text-stone-600 print:text-xs">Phone</p>
                      <p className="font-medium text-stone-800 print:text-sm">{guestInfo.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pickup Information Card - Always show for pickup orders */}
        {isPickupOrder && (() => {
          // Find pickup order and get pickup data
          const pickupOrder = orders.find(order => order.deliveryMethod === 'pickup');
          if (!pickupOrder) return null;

          const pickupTimeWindow = pickupOrder.pickupTimeWindow || 
            (orderData.selectedPickupTimes && orderData.selectedPickupTimes[pickupOrder.artisan?._id]);
          const pickupTime = pickupTimeWindow ? formatPickupTime(pickupTimeWindow) : null;

          return (
            <div className="card p-8 mb-8 print:rounded-none print:shadow-none print:border print:border-gray-300 print:p-4 print:mb-4 print:break-inside-avoid">
              <div className="flex items-center gap-3 mb-6 print:mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center print:hidden">
                  <MapPinIcon className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-800 print:text-lg font-display">Pickup Information</h2>
              </div>

              <div className="space-y-6 print:space-y-4">
                {/* Pickup Location */}
                {pickupOrder.artisan?.pickupAddress && (
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 print:bg-gray-50 print:rounded-none print:border print:border-gray-300 print:p-3">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-emerald-600 mt-1 print:hidden" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-emerald-800 mb-2">📍 Pickup Location</h4>
                        
                        {/* Pickup Location Description */}
                        {pickupOrder.artisan?.fulfillment?.methods?.pickup?.location && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-emerald-800 mb-1">Location Details</p>
                            <p className="text-sm text-emerald-700">
                              {typeof pickupOrder.artisan.fulfillment.methods.pickup.location === 'string' 
                                ? pickupOrder.artisan.fulfillment.methods.pickup.location
                                : `${pickupOrder.artisan.fulfillment.methods.pickup.location.street}, ${pickupOrder.artisan.fulfillment.methods.pickup.location.city}`}
                            </p>
                          </div>
                        )}
                        
                        {/* Pickup Address */}
                        <div className="mb-3">
                          <p className="text-sm font-medium text-emerald-800 mb-1">🏠 Pickup Address</p>
                          <p className="text-sm text-emerald-700 mt-1">
                            {pickupOrder.artisan.pickupAddress.street}<br />
                            {pickupOrder.artisan.pickupAddress.city}, {pickupOrder.artisan.pickupAddress.state} {pickupOrder.artisan.pickupAddress.zipCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pickup Time Information */}
                {pickupTime && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 print:bg-gray-50 print:rounded-none print:border print:border-gray-300 print:p-3">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="w-5 h-5 text-amber-600 mt-1 print:hidden" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-800 mb-2">📅 Scheduled Pickup Time</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-amber-700">
                            <CalendarIcon className="w-4 h-4 print:hidden" />
                            <span className="font-medium">Date: {pickupTime.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-amber-700">
                            <ClockIcon className="w-4 h-4 print:hidden" />
                            <span className="font-medium">Time: {pickupTime.time}</span>
                          </div>
                          <p className="text-xs text-amber-600 mt-2">
                            Please arrive within this time window for pickup
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Pickup Instructions */}
                {pickupOrder.artisan?.pickupInstructions && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 print:bg-gray-50 print:rounded-none print:border print:border-gray-300 print:p-3">
                    <div className="flex items-start gap-3">
                      <BellIcon className="w-5 h-5 text-orange-600 mt-1 print:hidden" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-orange-800 mb-2">📋 Important Pickup Instructions</h4>
                        <p className="text-sm text-orange-700 leading-relaxed">
                          {pickupOrder.artisan.pickupInstructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* General Pickup Information */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 print:bg-gray-50 print:rounded-none print:border print:border-gray-300 print:p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 print:hidden">
                      <span className="text-white text-xs">ℹ</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">ℹ️ Important Information</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>• <strong>Contact:</strong> You'll receive a notification when your order is ready for pickup</p>
                        <p>• <strong>Identification:</strong> Please bring a valid ID and order confirmation</p>
                        <p>• <strong>Payment:</strong> Order is already paid - no additional payment required</p>
                        <p>• <strong>Questions:</strong> Contact the artisan directly if you have any pickup questions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* What's Next Timeline Card */}
        <div className="card p-8 mb-8 print:hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
            <h2 className="text-2xl font-bold text-stone-800 font-display">What Happens Next?</h2>
              <p className="text-stone-600">Your order journey timeline</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 via-amber-400 via-purple-400 to-amber-400"></div>
            
            {/* Timeline Items */}
            <div className="space-y-8">
              {/* Step 1: Order Confirmation */}
              <div className="relative flex items-start gap-6">
                <div className="relative z-10 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircleIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-emerald-800">Order Confirmed</h3>
                    <span className="px-3 py-1 bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">Completed</span>
                  </div>
                  <p className="text-emerald-700 mb-3">
                    Your order has been successfully placed and confirmed. You'll receive email confirmations for each order with tracking information.
                  </p>
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <BellIcon className="w-4 h-4" />
                    <span>Email confirmations sent</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Artisan Preparation */}
              <div className="relative flex items-start gap-6">
                <div className="relative z-10 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <ClockIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 bg-amber-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-amber-800">Artisan Preparation</h3>
                    <span className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-semibold rounded-full">In Progress</span>
                  </div>
                  <p className="text-amber-700 mb-3">
                    Our skilled artisans are now preparing your orders with care and attention to detail. You'll receive real-time updates on the preparation status.
                  </p>
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <SparklesIcon className="w-4 h-4" />
                    <span>Handcrafted with love</span>
                </div>
              </div>
            </div>

              {/* Step 3: Ready for Pickup/Delivery */}
              <div className="relative flex items-start gap-6">
                <div className="relative z-10 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  {isPickupOrder ? <MapPinIcon className="w-7 h-7 text-white" /> : <TruckIcon className="w-7 h-7 text-white" />}
                </div>
                <div className="flex-1 bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-purple-800">
                      {isPickupOrder ? 'Ready for Pickup' : 'Ready for Delivery'}
                  </h3>
                    <span className="px-3 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded-full">Upcoming</span>
                  </div>
                  <p className="text-purple-700 mb-3">
                    {isPickupOrder 
                      ? 'You\'ll be notified when your order is ready for pickup at the artisan location. Please arrive within your scheduled time window.'
                      : 'You\'ll be notified when your orders are ready for pickup or delivery. Track your order status in real-time.'
                    }
                  </p>
                  {isPickupOrder && (() => {
                    const pickupOrder = orders.find(order => order.deliveryMethod === 'pickup' && order.pickupTimeWindow);
                    if (pickupOrder) {
                      const pickupTime = formatPickupTime(pickupOrder.pickupTimeWindow);
                      return pickupTime ? (
                        <div className="flex items-center gap-2 text-purple-600 text-sm bg-purple-100 rounded-lg p-2">
                          <CalendarIcon className="w-4 h-4" />
                          <span className="font-medium">Scheduled: {pickupTime.full}</span>
                        </div>
                      ) : null;
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Step 4: Enjoy Your Order */}
              <div className="relative flex items-start gap-6">
                <div className="relative z-10 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <SparklesIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 bg-amber-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-amber-800">Enjoy Your Order</h3>
                    <span className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-semibold rounded-full">Final Step</span>
                  </div>
                  <p className="text-amber-700 mb-3">
                    {isPickupOrder 
                      ? 'Visit the artisan location to collect your order and enjoy your fresh, locally crafted products!'
                      : 'Pick up your order or receive delivery and enjoy your fresh, locally crafted products!'
                    }
                  </p>
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <SparklesIcon className="w-4 h-4" />
                    <span>Fresh & delicious awaits!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Account Section - Only show for guest users */}
        {!isAuthenticated && guestInfo && (
          <div className="card p-8 mb-8 print:hidden">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-stone-800 mb-2 font-display">
                Want to Track Your Orders?
              </h2>
              <p className="text-stone-600">
                Create a free account to track your orders, save your preferences, and get exclusive offers.
              </p>
            </div>

          {!showCreateAccount ? (
            <div className="text-center">
              <button
                onClick={() => setShowCreateAccount(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Create Free Account
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <p className="text-sm text-stone-500 mt-3">
                No credit card required • Takes less than 2 minutes
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} className="max-w-md mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={createAccountForm.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={createAccountForm.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={createAccountForm.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={createAccountForm.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={createAccountForm.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateAccount(false)}
                  className="px-6 py-3 bg-stone-500 text-white rounded-lg hover:bg-stone-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
        )}

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center print:hidden px-4 sm:px-0">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
          >
            <HomeIcon className="w-5 h-5" />
            <span>Continue Shopping</span>
          </Link>
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-stone-600 text-white rounded-xl hover:bg-stone-700 transition-colors font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
          >
            <CreditCardIcon className="w-5 h-5" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-sm text-stone-500 print:mt-4 print:text-xs print:border-t print:border-gray-300 print:pt-4">
          <p>
            Questions about your order? Contact us at{' '}
            <a href="mailto:support@foodfinder.com" className="text-amber-600 hover:text-amber-700 underline print:text-gray-900">
              support@foodfinder.com
            </a>
          </p>
          <p className="mt-1">
            Order confirmation emails have been sent to {guestInfo?.email || 'your email address'}
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
