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
  CheckIcon,
  PlusCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cartService } from '../services/cartService';
import { orderService } from '../services/orderService';
import { authToken, getProfile } from '../services/authService';
import { guestService } from '../services/guestService';
import { paymentService } from '../services/paymentService';
import { deliveryService } from '../services/deliveryService';
import toast from 'react-hot-toast';

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [cartByArtisan, setCartByArtisan] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
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
  const [deliveryOptions, setDeliveryOptions] = useState({});
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState({});
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

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
    
    // Listen for profile updates to refresh cart data
    const handleProfileUpdate = () => {
      console.log('🔄 Profile update detected, refreshing cart data...');
      if (isAuthenticated && !isGuest) {
        loadUserProfile();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [currentUserId, isAuthenticated, isGuest]);

  const loadUserProfile = async () => {
    try {
      console.log('🔄 Loading user profile for cart...');
      const profile = await getProfile();
      setUserProfile(profile);
      console.log('✅ User profile loaded:', profile);
      
      // Load payment methods from profile
      setIsLoadingPaymentMethods(true);
      try {
        // Use payment methods from profile directly
        const methods = profile.paymentMethods || [];
        setPaymentMethods(methods);
        console.log('💳 Payment methods loaded:', methods);
        
        // Set default payment method
        const defaultPayment = methods.find(pay => pay.isDefault) || methods[0];
        if (defaultPayment) {
          setSelectedPaymentMethod(defaultPayment);
          setPaymentForm({
            cardNumber: `**** **** **** ${defaultPayment.last4}`,
            expiryMonth: defaultPayment.expiryMonth.toString().padStart(2, '0'),
            expiryYear: defaultPayment.expiryYear.toString(),
            cvv: '',
            cardholderName: defaultPayment.cardholderName
          });
          console.log('💳 Default payment method set:', defaultPayment);
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
        setPaymentMethods([]);
      } finally {
        setIsLoadingPaymentMethods(false);
      }
      
      // Set default address from profile
      const defaultAddress = profile.addresses?.find(addr => addr.isDefault) || profile.addresses?.[0];
      
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
        setDeliveryForm({
          street: defaultAddress.street,
          city: defaultAddress.city,
          state: defaultAddress.state,
          zipCode: defaultAddress.zipCode,
          country: defaultAddress.country
        });
        console.log('📍 Default address set from profile:', defaultAddress);
      } else {
        console.log('⚠️ No addresses found in profile');
      }
      
      // Load delivery options for each artisan
      loadDeliveryOptions();
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  const loadCart = () => {
    // Load cart for both authenticated users and guest users
    console.log('Cart component loadCart - currentUserId:', currentUserId);
    console.log('Cart component loadCart - isAuthenticated:', isAuthenticated);
    console.log('Cart component loadCart - isGuest:', isGuest);
    
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
        // Get userId from token
        const token = authToken.getToken();
        let userIdFromToken = null;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userIdFromToken = payload.userId;
          } catch (error) {
            console.error('Error parsing token for userId:', error);
          }
        }
        console.log('Cart component - profile._id:', profile._id, 'userIdFromToken:', userIdFromToken);
        
        setCurrentUserId(userIdFromToken || profile._id);
        setUserRole(profile.role);
        setIsAuthenticated(true);
        setIsGuest(guestService.isGuestUser());
        
        // Check if user is an artisan (artisans cannot access cart)
        if (profile.role === 'artisan') {
          toast.error('Artisans cannot access the cart. You are a seller, not a buyer.');
          navigate('/');
          return;
        }
        
        loadCart();
        loadUserProfile();
      } catch (error) {
        console.error('Error loading user profile:', error);
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setUserRole(null);
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

  const loadDeliveryOptions = () => {
    const cartByArtisan = cartService.getCartByArtisan(currentUserId);
    const options = {};
    const selectedMethods = {};
    
    Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
      const deliveryOptions = deliveryService.getDeliveryOptions(artisanData.artisan);
      options[artisanId] = deliveryOptions;
      
      // Set default delivery method (pickup if available, otherwise delivery)
      if (deliveryOptions.pickup.available) {
        selectedMethods[artisanId] = 'pickup';
      } else if (deliveryOptions.delivery.available) {
        selectedMethods[artisanId] = 'delivery';
      }
    });
    
    setDeliveryOptions(options);
    setSelectedDeliveryMethods(selectedMethods);
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

  const handleContinueToPayment = async () => {
    // Validate delivery address
    if (!deliveryForm.street || !deliveryForm.city || !deliveryForm.state || !deliveryForm.zipCode) {
      toast.error('Please fill in all required delivery address fields');
      return;
    }
    
    // For authenticated users, refresh profile data to ensure we have the latest
    if (isAuthenticated && !isGuest) {
      try {
        console.log('🔄 Refreshing profile data before payment step...');
        await loadUserProfile();
      } catch (error) {
        console.error('❌ Error refreshing profile data:', error);
        // Continue with current data if refresh fails
      }
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
      
      // For authenticated users, validate against profile data
      if (isAuthenticated && !isGuest) {
        const checkoutValidation = await cartService.validateCheckoutData(
          currentUserId, 
          selectedAddress, 
          selectedPaymentMethod
        );
        
        if (!checkoutValidation.isValid) {
          toast.error('Checkout validation failed: ' + checkoutValidation.errors.join(', '));
          setIsLoading(false);
          return;
        }
      } else {
        // For guest users, validate payment form fields
        if (!paymentForm.cardNumber || !paymentForm.expiryMonth || !paymentForm.expiryYear || !paymentForm.cvv || !paymentForm.cardholderName) {
          toast.error('Please fill in all payment information fields');
          setIsLoading(false);
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
                        {artisanData.artisan?.artisanName || 'Unknown Artisan'}
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
                {!isGuest && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Payment Methods</h4>
                      <button
                        onClick={() => setShowAddPaymentMethod(!showAddPaymentMethod)}
                        className="flex items-center text-sm text-orange-600 hover:text-orange-700"
                      >
                        <PlusCircleIcon className="w-4 h-4 mr-1" />
                        Add New Card
                      </button>
                    </div>
                    
                    {isLoadingPaymentMethods ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Loading payment methods...</p>
                      </div>
                    ) : paymentMethods.length > 0 ? (
                      <div className="space-y-2">
                        {paymentMethods.map((payment) => (
                          <div
                            key={payment._id}
                            onClick={async () => {
                              setSelectedPaymentMethod(payment);
                              setPaymentForm({
                                cardNumber: `**** **** **** ${payment.last4}`,
                                expiryMonth: payment.expiryMonth.toString().padStart(2, '0'),
                                expiryYear: payment.expiryYear.toString(),
                                cvv: '',
                                cardholderName: payment.cardholderName
                              });
                              
                              // For authenticated users, ensure we have the latest profile data
                              if (isAuthenticated && !isGuest) {
                                try {
                                  console.log('🔄 Refreshing profile data after payment method selection...');
                                  await loadUserProfile();
                                } catch (error) {
                                  console.error('❌ Error refreshing profile data:', error);
                                }
                              }
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
                    ) : (
                      <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                        <CreditCardIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No saved payment methods</p>
                        <p className="text-xs text-gray-500">Add a payment method to speed up checkout</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Add New Payment Method Form */}
                {!isGuest && showAddPaymentMethod && (
                  <div className="mb-6 p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-orange-800">Add New Payment Method</h4>
                      <button
                        onClick={() => setShowAddPaymentMethod(false)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-orange-700 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-orange-700 mb-1">
                            Expiry
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-orange-700 mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-orange-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            placeholder="Cardholder Name"
                            className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-orange-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-orange-700 transition-colors">
                          Save Card
                        </button>
                        <button 
                          onClick={() => setShowAddPaymentMethod(false)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
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
                        {artisanData.artisan?.artisanName || 'Unknown Artisan'}
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-orange-600 font-semibold">
                        {artisanData.artisan?.artisanName?.[0] || 'A'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {artisanData.artisan?.artisanName || 'Unknown Artisan'}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {artisanData.artisan?.type || 'Artisan'} • {deliveryOptions[artisanId]?.pickup?.available ? 'Pickup Available' : ''} {deliveryOptions[artisanId]?.delivery?.available ? '• Delivery Available' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {/* Delivery Options */}
                  {deliveryOptions[artisanId] && (
                    <div className="flex space-x-2">
                      {deliveryOptions[artisanId].pickup.available && (
                        <button
                          onClick={() => setSelectedDeliveryMethods({
                            ...selectedDeliveryMethods,
                            [artisanId]: 'pickup'
                          })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedDeliveryMethods[artisanId] === 'pickup'
                              ? 'bg-orange-100 text-orange-700 border border-orange-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🏪 Pickup
                        </button>
                      )}
                      {deliveryOptions[artisanId].delivery.available && (
                        <button
                          onClick={() => setSelectedDeliveryMethods({
                            ...selectedDeliveryMethods,
                            [artisanId]: 'delivery'
                          })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedDeliveryMethods[artisanId] === 'delivery'
                              ? 'bg-orange-100 text-orange-700 border border-orange-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🚚 Delivery
                          {deliveryOptions[artisanId].delivery.fee > 0 && (
                            <span className="ml-1">(+${deliveryOptions[artisanId].delivery.fee})</span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
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
