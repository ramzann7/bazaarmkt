import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrashIcon, 
  PlusIcon, 
  MinusIcon,
  ShoppingBagIcon,
  TruckIcon,
  CreditCardIcon,
  MapPinIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { cartService } from '../services/cartService';
import { orderService } from '../services/orderService';
import { authToken, getProfile } from '../services/authService';
import { guestService } from '../services/guestService';
import toast from 'react-hot-toast';

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [cartByArtisan, setCartByArtisan] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, delivery, payment, confirmation
  const [userProfile, setUserProfile] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  useEffect(() => {
    checkAuth();
    
    // Listen for cart updates
    const handleCartUpdate = (event) => {
      console.log('Cart component cart update event:', {
        eventUserId: event.detail.userId,
        currentUserId: currentUserId,
        shouldUpdate: (!currentUserId && event.detail.userId === null) || 
                     (currentUserId && event.detail.userId === currentUserId)
      });
      
      // For guest users (no currentUserId), always update when userId is null
      // For authenticated users, update when userId matches
      if ((!currentUserId && event.detail.userId === null) || 
          (currentUserId && event.detail.userId === currentUserId)) {
        loadCart();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [currentUserId]);

  const loadUserProfile = async () => {
    try {
      const profile = await getProfile();
      setUserProfile(profile);
      
      // Set default address and payment method
      const defaultAddress = profile.addresses?.find(addr => addr.isDefault) || profile.addresses?.[0];
      const defaultPayment = profile.paymentMethods?.find(pay => pay.isDefault) || profile.paymentMethods?.[0];
      
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
        setDeliveryForm({
          street: defaultAddress.street,
          city: defaultAddress.city,
          state: defaultAddress.state,
          zipCode: defaultAddress.zipCode,
          country: defaultAddress.country
        });
      }
      
      if (defaultPayment) {
        setSelectedPaymentMethod(defaultPayment);
        setPaymentForm({
          cardNumber: `**** **** **** ${defaultPayment.last4}`,
          expiryMonth: defaultPayment.expiryMonth.toString().padStart(2, '0'),
          expiryYear: defaultPayment.expiryYear.toString(),
          cvv: '',
          cardholderName: defaultPayment.cardholderName
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCart = () => {
    // Load cart for both authenticated users and guest users
    const cartItems = cartService.getCart(currentUserId);
    const groupedCart = cartService.getCartByArtisan(currentUserId);
    
    console.log('Cart component loadCart:', {
      currentUserId,
      cartItems,
      groupedCart,
      cartItemsLength: cartItems.length
    });
    
    setCart(cartItems);
    setCartByArtisan(groupedCart);
  };

  const checkAuth = async () => {
    const token = authToken.getToken();
    if (token) {
      try {
        const profile = await getProfile();
        setCurrentUserId(profile._id);
        setIsAuthenticated(true);
        setIsGuest(guestService.isGuestUser());
        loadCart();
        loadUserProfile();
      } catch (error) {
        console.error('Error loading user profile:', error);
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setIsGuest(false);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setIsGuest(false);
      // Load guest cart when not authenticated
      loadCart();
    }
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      cartService.removeFromCart(itemId, currentUserId);
    } else {
      cartService.updateQuantity(itemId, newQuantity, currentUserId);
    }
  };

  const removeItem = (itemId) => {
    cartService.removeFromCart(itemId, currentUserId);
    toast.success('Item removed from cart');
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!isAuthenticated) {
      // Redirect to dedicated guest checkout
      navigate('/guest-checkout');
      return;
    }

    const validation = cartService.validateCart(currentUserId);
    if (!validation.isValid) {
      toast.error('Cart validation failed: ' + validation.errors.join(', '));
      return;
    }

    setCheckoutStep('delivery');
  };

  const handleContinueToPayment = () => {
    // Validate delivery address
    if (!deliveryForm.street || !deliveryForm.city || !deliveryForm.state || !deliveryForm.zipCode) {
      toast.error('Please fill in all required delivery address fields');
      return;
    }
    
    // Set the selected address from the form
    setSelectedAddress({
      street: deliveryForm.street,
      city: deliveryForm.city,
      state: deliveryForm.state,
      zipCode: deliveryForm.zipCode,
      country: deliveryForm.country || 'Canada'
    });
    
    setCheckoutStep('payment');
  };

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    
    try {
      // Validate address
      if (!selectedAddress) {
        toast.error('Please select a delivery address');
        return;
      }
      
      // For guest users, validate payment form fields
      if (isGuest) {
        if (!paymentForm.cardNumber || !paymentForm.expiryMonth || !paymentForm.expiryYear || !paymentForm.cvv || !paymentForm.cardholderName) {
          toast.error('Please fill in all payment information fields');
          return;
        }
      } else {
        // For authenticated users, validate selected payment method
        if (!selectedPaymentMethod) {
          toast.error('Please select a payment method');
          return;
        }
      }

      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        })),
        deliveryAddress: {
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.zipCode,
          country: selectedAddress.country
        },
        deliveryInstructions: "",
        isGuestOrder: isGuest, // Add flag for guest orders
        ...(isGuest ? {
          // Guest payment information
          paymentMethod: 'credit_card',
          paymentInfo: {
            cardNumber: paymentForm.cardNumber,
            expiryMonth: paymentForm.expiryMonth,
            expiryYear: paymentForm.expiryYear,
            cvv: paymentForm.cvv,
            cardholderName: paymentForm.cardholderName
          }
        } : {
          // Authenticated user payment information
          paymentMethod: selectedPaymentMethod.type,
          paymentMethodId: selectedPaymentMethod._id
        })
      };

      // Call order API
      const result = await orderService.createOrder(orderData);
      
      // Clear cart after successful order
      cartService.clearCart(currentUserId);
      
      setCheckoutStep('confirmation');
      toast.success(`Order placed successfully! ${result.orders.length} order${result.orders.length > 1 ? 's' : ''} created.`);
      
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  if (checkoutStep === 'confirmation') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            {isGuest 
              ? "Thank you for your order! We'll send you updates via email. Create an account to track your orders and save your information for future purchases."
              : "Thank you for your order. We'll send you updates on your order status."
            }
          </p>
          <div className="space-y-3">
            {!isGuest && (
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
              >
                View My Orders
              </button>
            )}
            {isGuest && (
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Create Account to Track Orders
              </button>
            )}
            <button
              onClick={() => {
                setCheckoutStep('cart');
                navigate('/');
              }}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutStep === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-3">
                  {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
                    <div key={artisanId} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {artisanData.artisan?.firstName} {artisanData.artisan?.lastName}
                      </h4>
                      <div className="space-y-2">
                        {artisanData.items.map(item => (
                          <div key={item._id} className="flex justify-between text-sm">
                            <span>{item.name} x {item.quantity}</span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Subtotal:</span>
                          <span>{formatPrice(artisanData.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(getTotalAmount())}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                
                {/* Saved Payment Methods - Only show for authenticated users */}
                {!isGuest && userProfile?.paymentMethods && userProfile.paymentMethods.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Saved Payment Methods</h4>
                    <div className="space-y-2">
                      {userProfile.paymentMethods.map((payment) => (
                        <div
                          key={payment._id}
                          onClick={() => {
                            setSelectedPaymentMethod(payment);
                            setPaymentForm({
                              cardNumber: `**** **** **** ${payment.last4}`,
                              expiryMonth: payment.expiryMonth.toString().padStart(2, '0'),
                              expiryYear: payment.expiryYear.toString(),
                              cvv: '',
                              cardholderName: payment.cardholderName
                            });
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPaymentMethod?._id === payment._id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {payment.type === 'credit_card' ? 'Credit Card' : 'Debit Card'} 
                                {payment.isDefault && <span className="text-xs text-orange-600"> (Default)</span>}
                              </div>
                              <div className="text-sm text-gray-600">
                                **** **** **** {payment.last4} • Expires {payment.expiryMonth}/{payment.expiryYear}
                              </div>
                              <div className="text-sm text-gray-600">
                                {payment.cardholderName}
                              </div>
                            </div>
                            {selectedPaymentMethod?._id === payment._id && (
                              <CheckIcon className="w-5 h-5 text-orange-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guest User Notice */}
                {isGuest && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-orange-600 text-xs">ℹ</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-orange-800">Guest Checkout</h4>
                        <p className="text-sm text-orange-700">Please enter your payment information below. Your payment details will be securely processed.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Payment Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={paymentForm.cardNumber}
                      onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value})}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={`${paymentForm.expiryMonth}/${paymentForm.expiryYear}`}
                        onChange={(e) => {
                          const [month, year] = e.target.value.split('/');
                          setPaymentForm({
                            ...paymentForm, 
                            expiryMonth: month || '', 
                            expiryYear: year || ''
                          });
                        }}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={paymentForm.cvv}
                        onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value})}
                        placeholder="123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={paymentForm.cardholderName}
                      onChange={(e) => setPaymentForm({...paymentForm, cardholderName: e.target.value})}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCardIcon className="w-5 h-5 mr-2" />
                        Place Order - {formatPrice(getTotalAmount())}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setCheckoutStep('delivery')}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back to Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutStep === 'delivery') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-3">
                  {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
                    <div key={artisanId} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {artisanData.artisan?.firstName} {artisanData.artisan?.lastName}
                      </h4>
                      <div className="space-y-2">
                        {artisanData.items.map(item => (
                          <div key={item._id} className="flex justify-between text-sm">
                            <span>{item.name} x {item.quantity}</span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Subtotal:</span>
                          <span>{formatPrice(artisanData.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(getTotalAmount())}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Form */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
                
                {/* Saved Addresses - Only show for authenticated users */}
                {!isGuest && userProfile?.addresses && userProfile.addresses.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Saved Addresses</h4>
                    <div className="space-y-2">
                      {userProfile.addresses.map((address, index) => (
                        <div
                          key={address._id}
                          onClick={() => {
                            setSelectedAddress(address);
                            setDeliveryForm({
                              street: address.street,
                              city: address.city,
                              state: address.state,
                              zipCode: address.zipCode,
                              country: address.country
                            });
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddress?._id === address._id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-800">
                                {address.label} {address.isDefault && <span className="text-xs text-emerald-600">(Default)</span>}
                              </div>
                              <div className="text-sm text-slate-600">
                                {address.street}, {address.city}, {address.state} {address.zipCode}
                              </div>
                            </div>
                            {selectedAddress?._id === address._id && (
                              <CheckIcon className="w-5 h-5 text-emerald-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guest User Notice */}
                {isGuest && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-orange-600 text-xs">ℹ</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-orange-800">Guest Checkout</h4>
                        <p className="text-sm text-orange-700">Please enter your delivery address below. You can create an account after checkout to save your information for future orders.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Address Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.street}
                      onChange={(e) => setDeliveryForm({...deliveryForm, street: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.city}
                        onChange={(e) => setDeliveryForm({...deliveryForm, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Province
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.state}
                        onChange={(e) => setDeliveryForm({...deliveryForm, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.zipCode}
                        onChange={(e) => setDeliveryForm({...deliveryForm, zipCode: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.country}
                        onChange={(e) => setDeliveryForm({...deliveryForm, country: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Instructions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Any special delivery instructions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleContinueToPayment}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
                  >
                    <TruckIcon className="w-5 h-5 mr-2" />
                    Continue to Payment
                  </button>
                  
                  <button
                    onClick={() => setCheckoutStep('cart')}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main cart view
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBagIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">
            Start shopping to add items to your cart
          </p>

          <button
            onClick={() => navigate('/')}
            className="bg-orange-500 text-white py-2 px-6 rounded-lg hover:bg-orange-600 transition-colors mr-2"
          >
            Start Shopping
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <span className="text-gray-600">{getTotalItems()} items</span>
          </div>

          <div className="space-y-6">
            {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
              <div key={artisanId} className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-orange-600 font-semibold">
                      {artisanData.artisan?.firstName?.[0]}{artisanData.artisan?.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                                          <h3 className="font-semibold text-gray-900">
                        {artisanData.artisan?.artisanName || `${artisanData.artisan?.firstName} ${artisanData.artisan?.lastName}`}
                      </h3>
                      <p className="text-sm text-gray-600">Artisan</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {artisanData.items.map(item => (
                    <div key={item._id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image.startsWith('http') ? item.image : item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center" style={{ display: item.image ? 'none' : 'flex' }}>
                          <span className="text-2xl">📦</span>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-sm text-gray-500">per {item.unit}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatPrice(item.price)} each
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item._id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>{formatPrice(artisanData.subtotal)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="border-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-orange-600">
                {formatPrice(getTotalAmount())}
              </span>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-3">
                <div className="text-center text-sm text-gray-600 mb-4">
                  <p>Sign in to save your cart and track orders</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>Creating Guest Account...</span>
                    ) : (
                      <>
                        <ShoppingBagIcon className="w-5 h-5 mr-2" />
                        Continue as Guest
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={handleCheckout}
                  className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
                >
                  <ShoppingBagIcon className="w-5 h-5 mr-2" />
                  {isGuest ? 'Continue as Guest' : 'Proceed to Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
