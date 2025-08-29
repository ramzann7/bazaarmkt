import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCartIcon, 
  CreditCardIcon, 
  MapPinIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { cartService } from '../services/cartService';
import { checkoutService } from '../services/checkoutService';
import { authToken } from '../services/authservice';
import toast from 'react-hot-toast';

export default function Checkout() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    deliveryAddress: null,
    paymentMethod: 'credit_card',
    specialRequests: ''
  });
  const [checkoutSummary, setCheckoutSummary] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    initializeCheckout();
  }, []);

  const initializeCheckout = async () => {
    try {
      setIsLoading(true);
      const userId = authToken.getToken() ? 'user' : null;
      
      // Validate checkout
      const validation = await checkoutService.validateCheckout(userId);
      if (!validation.isValid) {
        toast.error(validation.message || 'Checkout validation failed');
        navigate('/cart');
        return;
      }

      // Get checkout summary
      const summary = checkoutService.getCheckoutSummary(userId);
      setCheckoutSummary(summary);

      // Load saved preferences
      if (userId) {
        const preferences = await checkoutService.getCheckoutPreferences();
        if (preferences) {
          setCheckoutData(prev => ({
            ...prev,
            deliveryAddress: preferences.deliveryAddress,
            paymentMethod: preferences.paymentMethod
          }));
        }
      }
    } catch (error) {
      console.error('Error initializing checkout:', error);
      toast.error('Failed to initialize checkout');
      navigate('/cart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = (address) => {
    setCheckoutData(prev => ({
      ...prev,
      deliveryAddress: address
    }));
    setErrors(prev => ({ ...prev, deliveryAddress: null }));
  };

  const handlePaymentMethodChange = (method) => {
    setCheckoutData(prev => ({
      ...prev,
      paymentMethod: method
    }));
  };

  const handleSpecialRequestsChange = (requests) => {
    setCheckoutData(prev => ({
      ...prev,
      specialRequests: requests
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!checkoutData.deliveryAddress) {
      newErrors.deliveryAddress = 'Please select a delivery address';
    }

    if (!checkoutData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before placing your order');
      return;
    }

    setIsProcessing(true);
    try {
      const userId = authToken.getToken() ? 'user' : null;
      
      // Process checkout
      const result = await checkoutService.processCheckout(checkoutData, userId);
      
      if (result.success) {
        toast.success(result.message);
        
        // Save checkout preferences
        if (userId) {
          await checkoutService.saveCheckoutPreferences({
            deliveryAddress: checkoutData.deliveryAddress,
            paymentMethod: checkoutData.paymentMethod
          });
        }
        
        // Redirect to order confirmation
        navigate('/orders', { 
          state: { 
            orders: result.orders,
            message: 'Orders placed successfully!' 
          } 
        });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!checkoutSummary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No items in cart</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Cart
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Order Summary</p>
            <p className="text-2xl font-bold text-gray-900">
              ${checkoutSummary.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <MapPinIcon className="w-6 h-6 text-orange-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Delivery Address</h2>
              </div>
              
              {errors.deliveryAddress && (
                <p className="text-red-600 text-sm mb-4">{errors.deliveryAddress}</p>
              )}

              <div className="space-y-3">
                {/* Address selection would go here - for now, show a placeholder */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-gray-600">Address selection component would be here</p>
                  <p className="text-sm text-gray-500">This would show saved addresses and allow adding new ones</p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <CreditCardIcon className="w-6 h-6 text-orange-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
              </div>

              {errors.paymentMethod && (
                <p className="text-red-600 text-sm mb-4">{errors.paymentMethod}</p>
              )}

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={checkoutData.paymentMethod === 'credit_card'}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className="mr-3"
                  />
                  <span>Credit Card</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="debit_card"
                    checked={checkoutData.paymentMethod === 'debit_card'}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className="mr-3"
                  />
                  <span>Debit Card</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={checkoutData.paymentMethod === 'paypal'}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className="mr-3"
                  />
                  <span>PayPal</span>
                </label>
              </div>
            </div>

            {/* Special Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Special Requests</h2>
              <textarea
                value={checkoutData.specialRequests}
                onChange={(e) => handleSpecialRequestsChange(e.target.value)}
                placeholder="Any special instructions for delivery or preparation..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                {/* Items by Artisan */}
                {Object.entries(checkoutSummary.groupedByArtisan).map(([artisanId, artisanData]) => (
                  <div key={artisanId} className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {artisanData.artisan?.firstName} {artisanData.artisan?.lastName}
                    </h3>
                    <div className="space-y-2">
                      {artisanData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-medium mt-2">
                      <span>Subtotal</span>
                      <span>${artisanData.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${checkoutSummary.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Order Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <ShoppingCartIcon className="w-4 h-4 mr-2" />
                    {checkoutSummary.totalItems} items
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    {checkoutSummary.artisanCount} artisan{checkoutSummary.artisanCount > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Place Order
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By placing your order, you agree to our terms and conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
