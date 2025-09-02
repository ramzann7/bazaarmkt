import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrashIcon, 
  PlusIcon, 
  MinusIcon, 
  TruckIcon, 
  CreditCardIcon,
  MapPinIcon,
  UserIcon,
  ShoppingBagIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { cartService } from '../services/cartService';
import { deliveryService } from '../services/deliveryService';
import { getProfile } from '../services/authservice';
import { paymentService } from '../services/paymentService';
import { orderService } from '../services/orderService';

const Cart = () => {
  const navigate = useNavigate();
  
  // Core cart state
  const [cart, setCart] = useState([]);
  const [cartByArtisan, setCartByArtisan] = useState({});
  const [checkoutStep, setCheckoutStep] = useState('cart');

  

  
  // User state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // Delivery state
  const [deliveryOptions, setDeliveryOptions] = useState({});
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState({});
  const [deliveryForm, setDeliveryForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    instructions: ''
  });
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  // Loading states
  const [cartLoading, setCartLoading] = useState(false);
  const [deliveryOptionsLoading, setDeliveryOptionsLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [successItems, setSuccessItems] = useState(new Set());
  
  // Payment state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPaymentForm, setNewPaymentForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    isDefault: false
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState({});

  // Helper function to parse JWT token
  const parseToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        return { userId: null, isGuest: true };
      }
      
      return {
        userId: payload.userId,
        isGuest: payload.isGuest === true // Only treat as guest if explicitly marked
      };
    } catch (error) {
      console.error('Error parsing token:', error);
      // Remove invalid token
      localStorage.removeItem('token');
      return { userId: null, isGuest: true };
    }
  };

  // Helper function to format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  // Helper function to check if address is required
  const isAddressRequired = () => {
    return Object.values(selectedDeliveryMethods).some(method => 
      method === 'personalDelivery' || method === 'professionalDelivery'
    );
  };

  // Helper function to get delivery fee for a specific artisan
  const getDeliveryFeeForArtisan = (artisanId) => {
    const selectedMethod = selectedDeliveryMethods[artisanId];
    const artisanDeliveryOptions = deliveryOptions[artisanId];
    
    if (!selectedMethod || !artisanDeliveryOptions) return 0;
    
    if (selectedMethod === 'personalDelivery' && artisanDeliveryOptions.personalDelivery?.available) {
      const artisanData = cartByArtisan[artisanId];
      if (!artisanData) return 0;
      
      const subtotal = artisanData.subtotal;
      const fee = artisanDeliveryOptions.personalDelivery.fee || 0;
      const freeThreshold = artisanDeliveryOptions.personalDelivery.freeThreshold || 0;
      
      // Check if order qualifies for free delivery
      if (subtotal < freeThreshold) {
        return fee;
      }
      return 0; // Free delivery
    } else if (selectedMethod === 'professionalDelivery' && artisanDeliveryOptions.professionalDelivery?.available) {
      // Calculate Uber Direct fee based on distance
      return calculateUberDirectFee(artisanId);
    }
    
    return 0; // Pickup is free
  };

  // Calculate Uber Direct delivery fee (placeholder implementation)
  const calculateUberDirectFee = (artisanId) => {
    // This would integrate with Uber Direct API
    // For now, return a fixed fee
    return 15;
  };

  // Load user's payment methods
  const loadPaymentMethods = async () => {
    if (!currentUserId || isGuest) {
      return;
    }
    
    try {
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
      
      // Set default payment method if available
      const defaultMethod = methods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    } catch (error) {
      console.error('❌ Error loading payment methods:', error);
    }
  };

  // Validate payment form
  const validatePaymentForm = () => {
    const errors = {};
    
    if (!newPaymentForm.cardNumber) {
      errors.cardNumber = 'Card number is required';
    } else if (!paymentService.validateCreditCard(newPaymentForm.cardNumber)) {
      errors.cardNumber = 'Invalid card number';
    }
    
    if (!newPaymentForm.expiryMonth || !newPaymentForm.expiryYear) {
      errors.expiry = 'Expiry date is required';
    } else if (!paymentService.validateExpiryDate(newPaymentForm.expiryMonth, newPaymentForm.expiryYear)) {
      errors.expiry = 'Invalid expiry date';
    }
    
    if (!newPaymentForm.cvv) {
      errors.cvv = 'CVV is required';
    } else {
      const cardBrand = paymentService.getCardBrand(newPaymentForm.cardNumber);
      if (!paymentService.validateCVV(newPaymentForm.cvv, cardBrand)) {
        errors.cvv = 'Invalid CVV';
      }
    }
    
    if (!newPaymentForm.cardholderName) {
      errors.cardholderName = 'Cardholder name is required';
    }
    
    setPaymentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle payment form submission
  const handlePaymentFormSubmit = async () => {
    if (!validatePaymentForm()) return;
    
    try {
      setPaymentLoading(true);
      
      const paymentData = {
        type: 'credit_card',
        cardNumber: newPaymentForm.cardNumber,
        expiryMonth: parseInt(newPaymentForm.expiryMonth),
        expiryYear: parseInt(newPaymentForm.expiryYear),
        cvv: newPaymentForm.cvv,
        cardholderName: newPaymentForm.cardholderName,
        isDefault: newPaymentForm.isDefault,
        brand: paymentService.getCardBrand(newPaymentForm.cardNumber)
      };
      
      await paymentService.addPaymentMethod(paymentData);
      
      // Reload payment methods
      await loadPaymentMethods();
      
      // Reset form
      setNewPaymentForm({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: '',
        isDefault: false
      });
      setShowAddPaymentForm(false);
      setPaymentFormErrors({});
      
      toast.success('Payment method added successfully');
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle payment form changes
  const handlePaymentFormChange = (field, value) => {
    setNewPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (paymentFormErrors[field]) {
      setPaymentFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Get total delivery fees across all artisans
  const getTotalDeliveryFees = () => {
    let totalFees = 0;
    
    Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
      totalFees += getDeliveryFeeForArtisan(artisanId);
    });
    
    return totalFees;
  };

  // Get total amount including delivery fees
  const getTotalAmount = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFees = getTotalDeliveryFees();
    return subtotal + deliveryFees;
  };

  // Check if personal delivery is available for an artisan
  const isPersonalDeliveryAvailable = (artisanId) => {
    const artisanDeliveryOptions = deliveryOptions[artisanId];
    return artisanDeliveryOptions?.personalDelivery?.available || false;
  };

  // Load cart data - completely rebuilt for reliability
  const loadCart = async () => {
    try {
      setCartLoading(true);
  
      console.log('🔍 loadCart called');
      
      // Get current user info
      const token = localStorage.getItem('token');
      let userId = null;
      let guestStatus = true;
      
      if (token) {
        const tokenData = parseToken(token);
        userId = tokenData.userId;
        guestStatus = tokenData.isGuest;
        
        console.log('🔍 Token found:', { userId, guestStatus });
        
        // Only set currentUserId if it's not already set to avoid race conditions
        if (!currentUserId) {
          setCurrentUserId(userId);
        }
        if (!isGuest) {
          setIsGuest(guestStatus);
        }
      } else {
        console.log('🔍 No token found, treating as guest');
      }
      
      console.log('🔍 Final userId for cart loading:', userId);
      
      // Load cart data from localStorage
      const cartData = await cartService.getCart(userId);
      console.log('🔍 Cart data loaded:', cartData);
      
      if (!cartData || cartData.length === 0) {
        console.log('🔍 No cart data found, setting empty cart');
        setCart([]);
        setCartByArtisan({});
        return;
      }
      
      // Load cart by artisan (this fetches fresh artisan data)
      const cartByArtisanData = await cartService.getCartByArtisan(userId);
      console.log('🔍 Cart by artisan loaded:', cartByArtisanData);
      
      // Set cart state
      setCart(cartData);
      setCartByArtisan(cartByArtisanData);
      
    } catch (error) {
      console.error('❌ Error loading cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setCartLoading(false);
    }
  };

  // Load delivery options - completely rebuilt
  const loadDeliveryOptions = async () => {
    if (!cartByArtisan || Object.keys(cartByArtisan).length === 0) {
      return;
    }
    
    try {
      setDeliveryOptionsLoading(true);
      
      const options = {};
      const methods = {};
      
      // Process each artisan's delivery options
      Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
        if (artisanData.artisan?.deliveryOptions) {
          // Use the delivery service to structure options
          const processedOptions = deliveryService.structureDeliveryOptions(artisanData.artisan.deliveryOptions);
          options[artisanId] = processedOptions;
          
          // Set default delivery method
          if (processedOptions.pickup?.available) {
            methods[artisanId] = 'pickup';
          } else if (processedOptions.personalDelivery?.available) {
            methods[artisanId] = 'personalDelivery';
          } else if (processedOptions.professionalDelivery?.available) {
            methods[artisanId] = 'personalDelivery';
          }
        }
      });
      
      setDeliveryOptions(options);
      setSelectedDeliveryMethods(methods);
      
    } catch (error) {
      console.error('❌ Error loading delivery options:', error);
    } finally {
      setDeliveryOptionsLoading(false);
    }
  };

  // Load user profile
  const loadUserProfile = async () => {
    if (!currentUserId || isGuest) {
      return;
    }
    
    try {
      const profile = await getProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  // Check authentication status
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (token) {
      const tokenData = parseToken(token);
      setCurrentUserId(tokenData.userId);
      setIsGuest(tokenData.isGuest);
      
      if (!tokenData.isGuest) {
        try {
          await loadUserProfile();
          await loadPaymentMethods();
        } catch (error) {
          console.error('❌ Error loading profile or payment methods:', error);
        }
      }
    }
    
    await loadCart();
  };

  // Handle cart updates
  const handleCartUpdate = async () => {
    await loadCart();
  };

  // Handle quantity changes with instant UI updates
  const handleQuantityChange = async (productId, newQuantity) => {
    // Prevent multiple simultaneous updates for the same item
    if (updatingItems.has(productId)) return;
    
    try {
      setUpdatingItems(prev => new Set(prev).add(productId));
      
      // Optimistically update the UI immediately
      const updatedCart = cart.map(item => 
        item._id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ).filter(item => item.quantity > 0);
      
      setCart(updatedCart);
      
      // Update cartByArtisan state immediately
      const updatedCartByArtisan = {};
      updatedCart.forEach(item => {
        const artisanId = item.artisan?._id || item.artisanId;
        if (!updatedCartByArtisan[artisanId]) {
          updatedCartByArtisan[artisanId] = {
            artisan: item.artisan,
            items: [],
            subtotal: 0
          };
        }
        updatedCartByArtisan[artisanId].items.push(item);
        updatedCartByArtisan[artisanId].subtotal += item.price * item.quantity;
      });
      setCartByArtisan(updatedCartByArtisan);
      
      // Show immediate feedback
      if (newQuantity <= 0) {
        toast.success('Item removed from cart');
      } else {
        toast.success('Quantity updated');
      }
      
      // Update localStorage in the background
      if (newQuantity <= 0) {
        await cartService.removeFromCart(productId, currentUserId);
      } else {
        await cartService.updateQuantity(productId, newQuantity, currentUserId);
      }
      
      // Dispatch cart update event for navbar
      const totalItems = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { count: totalItems, userId: currentUserId }
      }));
      
      // Show success state briefly
      setSuccessItems(prev => new Set(prev).add(productId));
      setTimeout(() => {
        setSuccessItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
      toast.error('Failed to update quantity');
      
      // Revert on error by reloading cart
      await handleCartUpdate();
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Handle delivery method selection
  const handleDeliveryMethodChange = (artisanId, method) => {
    setSelectedDeliveryMethods(prev => ({
      ...prev,
      [artisanId]: method
    }));
  };

  // Handle delivery form changes
  const handleDeliveryFormChange = (field, value) => {
    setDeliveryForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle address selection
  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    if (address) {
      setDeliveryForm({
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        country: address.country || ''
      });
    }
  };

  // Handle checkout step navigation
  const handleNextStep = () => {
    if (checkoutStep === 'cart') {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return;
      }
      
            // For guest users, allow them to proceed directly to delivery
      if (isGuest) {
        setCheckoutStep('delivery');
        return;
      }
      
      // For unauthenticated users, show login prompt
      if (!currentUserId) {
        toast.error('Please log in to continue with checkout');
        return;
      }
      
      // For authenticated users, go to delivery step
      setCheckoutStep('delivery');
    } else if (checkoutStep === 'delivery') {
      if (isAddressRequired() && !selectedAddress && !deliveryForm.street) {
        toast.error('Please provide delivery address');
        return;
      }
      setCheckoutStep('payment');
    }
  };

  const handlePreviousStep = () => {
    if (checkoutStep === 'delivery') {
      setCheckoutStep('cart');
    } else if (checkoutStep === 'payment') {
      setCheckoutStep('delivery');
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    try {
      // Validate delivery options
      const hasDeliveryMethod = Object.keys(selectedDeliveryMethods).length > 0;
      if (!hasDeliveryMethod) {
        toast.error('Please select delivery methods');
        return;
      }

      if (isAddressRequired() && !selectedAddress && !deliveryForm.street) {
        toast.error('Please provide delivery address');
        return;
      }

      // For guest users, navigate to guest checkout
      if (isGuest) {
        navigate('/guest-checkout');
        return;
      }

      // For authenticated users, proceed with order creation
      await handlePlaceOrder();
    } catch (error) {
      console.error('❌ Error during checkout:', error);
      toast.error('Checkout failed');
    }
  };



  // Handle order placement for both authenticated users and guests
  const handlePlaceOrder = async () => {
    try {
      setIsLoading(true);
      
      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        })),
        deliveryAddress: selectedAddress || deliveryForm,
        deliveryInstructions: deliveryForm.instructions || '',
        paymentMethod: selectedPaymentMethod?.type || 'credit_card',
        paymentMethodId: selectedPaymentMethod?._id
      };

      // Create order
      const result = await orderService.createOrder(orderData);
      
      // Clear cart
      await cartService.clearCart(currentUserId);
      
      // Show success message
      toast.success(`Order placed successfully! ${result.orders.length} order${result.orders.length > 1 ? 's' : ''} created.`);
      
      // Navigate to order confirmation
      navigate('/orders', { 
        state: { 
          message: 'Order placed successfully!',
          orders: result.orders 
        }
      });
      
    } catch (error) {
      console.error('❌ Error placing order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle guest checkout (simplified flow)
  const handleGuestCheckout = async () => {
    try {
      setIsLoading(true);
      
      // Generate unique guest ID for this order
      const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Prepare order data for guest
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        })),
        deliveryAddress: deliveryForm,
        deliveryInstructions: deliveryForm.instructions || '',
        paymentMethod: 'credit_card', // Default for guests
        guestInfo: {
          firstName: deliveryForm.firstName || 'Guest',
          lastName: deliveryForm.lastName || 'User',
          email: deliveryForm.email || '',
          phone: deliveryForm.phone || '',
          guestId: guestId
        }
      };

      // Create order
      const result = await orderService.createOrder(orderData);
      
      // Clear guest cart
      cartService.clearCart(null);
      
      // Show success message
      toast.success(`Order placed successfully! ${result.orders.length} order${result.orders.length > 1 ? 's' : ''} created.`);
      
      // Navigate to order confirmation
      navigate('/orders', { 
        state: { 
          message: 'Order placed successfully!',
          orders: result.orders 
        }
      });
      
    } catch (error) {
      console.error('❌ Error placing guest order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load delivery options when cart data changes
  useEffect(() => {
    if (Object.keys(cartByArtisan).length > 0) {
      loadDeliveryOptions();
      
      // Ensure user profile is loaded when cart changes (for multiple artisan scenarios)
      if (currentUserId && !isGuest && !userProfile) {
        loadUserProfile();
        loadPaymentMethods();
      }
    }
  }, [cartByArtisan, currentUserId, isGuest, userProfile]);

  // Load user profile whenever currentUserId changes (for multiple artisan scenarios)
  useEffect(() => {
    if (currentUserId && !isGuest) {
      loadUserProfile();
      loadPaymentMethods();
    }
  }, [currentUserId, isGuest]);

  // Monitor cart total changes for animation
  const [cartTotal, setCartTotal] = useState(0);
  useEffect(() => {
    const newTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    if (newTotal !== cartTotal) {
      setCartTotal(newTotal);
    }
  }, [cart, cartTotal]);

  // Render loading skeleton
  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-emerald-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-stone-200 rounded-2xl w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-white rounded-2xl shadow-lg"></div>
                ))}
              </div>
              <div className="lg:col-span-1">
                <div className="h-64 bg-white rounded-2xl shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render empty cart
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-emerald-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg animate-bounce">
              <ShoppingBagIcon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-stone-900 mb-4 animate-fade-in">Your Collection Awaits</h1>
            <p className="text-stone-600 text-lg mb-8 animate-fade-in-delay">Start exploring our local artisans and discover their unique creations</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary text-lg px-8 py-4 hover:scale-105 transition-transform duration-200 animate-fade-in-delay-2"
            >
              Discover Artisans
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render main cart view
  if (checkoutStep === 'cart') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-emerald-50 py-8 relative">
        {/* Loading Overlay */}
        {updatingItems.size > 0 && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
              <p className="text-lg font-semibold text-stone-700">Updating Cart...</p>
              <p className="text-sm text-stone-500">Please wait while we update your selection</p>
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl flex items-center justify-center mr-6 shadow-2xl">
              <ShoppingBagIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-stone-900 mb-2">Your Artisan Collection</h1>
              <p className="text-lg text-stone-600">Review the beautiful creations you've selected from our artisans</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
                <div key={artisanId} className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6 hover:shadow-2xl hover:border-stone-200 transition-all duration-300">
                  {/* Artisan Header */}
                  <div className="border-b border-stone-200 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-stone-900">
                          {artisanData.artisan?.artisanName || 'Unknown Artisan'}
                        </h3>
                        <p className="text-stone-600 text-sm capitalize">
                          {artisanData.artisan?.type?.replace('_', ' ') || 'Artisan'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Options Tags */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {deliveryOptions[artisanId]?.pickup?.available && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckIcon className="w-3 h-3" />
                        Pickup Available
                      </span>
                    )}
                    {deliveryOptions[artisanId]?.personalDelivery?.available && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200 flex items-center gap-1">
                        <TruckIcon className="w-3 h-3" />
                        Personal Delivery: ${deliveryOptions[artisanId]?.personalDelivery?.fee || 0}
                        {deliveryOptions[artisanId]?.personalDelivery?.freeThreshold && 
                          ` (Free over $${deliveryOptions[artisanId]?.personalDelivery?.freeThreshold})`
                        }
                      </span>
                    )}
                    {deliveryOptions[artisanId]?.professionalDelivery?.available && (
                      <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-200 flex items-center gap-1">
                        <TruckIcon className="w-3 h-3" />
                        Professional Delivery Available
                      </span>
                    )}
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-4">
                    {artisanData.items.map((item) => (
                                              <div 
                          key={item._id} 
                          className={`flex items-center space-x-4 border-b border-stone-100 pb-4 last:border-b-0 transition-all duration-300 ease-in-out ${
                            updatingItems.has(item._id) ? 'animate-pulse' : ''
                          } ${
                            successItems.has(item._id) ? 'ring-2 ring-emerald-200 bg-emerald-50' : ''
                          }`}
                          style={{
                            opacity: updatingItems.has(item._id) ? 0.7 : 1,
                            transform: updatingItems.has(item._id) ? 'scale(0.98)' : 'scale(1)'
                          }}
                        >
                        <div className="relative">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-xl shadow-md"
                          />
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {item.quantity}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-stone-900 text-lg mb-1">{item.name}</h4>
                          <p className="text-sm text-stone-600 line-clamp-2 mb-2">{item.description}</p>
                          <p className="text-sm text-stone-500 font-medium">
                            {item.unit} • {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                              item.quantity <= 1 || updatingItems.has(item._id)
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:scale-110'
                            }`}
                            disabled={item.quantity <= 1 || updatingItems.has(item._id)}
                          >
                            {updatingItems.has(item._id) ? (
                              <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <MinusIcon className="w-4 h-4" />
                            )}
                          </button>
                          <span className="w-12 text-center font-semibold text-stone-900 select-none">
                            {updatingItems.has(item._id) ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                              updatingItems.has(item._id)
                                ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-700 hover:scale-110 group'
                            }`}
                            disabled={updatingItems.has(item._id)}
                          >
                            {updatingItems.has(item._id) ? (
                              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <PlusIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                            )}
                          </button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-bold text-lg text-stone-900 transition-all duration-300 ease-in-out">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          {successItems.has(item._id) && (
                            <div className="flex items-center justify-end mt-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-emerald-600 ml-1 font-medium">Updated</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleQuantityChange(item._id, 0)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 group ${
                            updatingItems.has(item._id)
                              ? 'bg-red-100 text-red-400 cursor-not-allowed'
                              : 'bg-red-100 hover:bg-red-200 text-red-600'
                          }`}
                          title="Remove item"
                          disabled={updatingItems.has(item._id)}
                        >
                          {updatingItems.has(item._id) ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <TrashIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Artisan Subtotal */}
                  <div className="mt-6 pt-4 border-t border-stone-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-stone-700">Subtotal:</span>
                      <span className="text-xl font-bold text-stone-900 transition-all duration-300 ease-in-out">
                        {formatPrice(artisanData.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6 sticky top-8">
                <h3 className="text-xl font-semibold text-stone-900 mb-6">Order Summary</h3>
                
                                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">Subtotal:</span>
                      <span className="font-semibold text-stone-900 text-lg transition-all duration-300 ease-in-out">
                        {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                    <div className="border-t border-stone-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Total:</span>
                        <span 
                          className={`font-bold text-stone-900 text-xl transition-all duration-300 ease-in-out ${
                            cartTotal !== cart.reduce((total, item) => total + (item.price * item.quantity), 0) 
                              ? 'animate-bounce-subtle text-amber-600' 
                              : ''
                          }`}
                        >
                          {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">Delivery fees will be calculated based on your selection</p>
                    </div>
                  </div>

                <button
                  onClick={handleNextStep}
                  className="w-full btn-primary text-lg py-4 hover:scale-105 transition-transform duration-200 shadow-xl"
                >
                  Choose Your Delivery Method
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // Render delivery information page
  if (checkoutStep === 'delivery') {
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-emerald-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl flex items-center justify-center mr-6 shadow-2xl">
              <TruckIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-stone-900 mb-2">How would you like to receive your order?</h1>
              <p className="text-lg text-stone-600">Choose your preferred way to connect with our artisans</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Delivery Options and Address */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6">
                {/* Step 1: Delivery Options */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    Choose Your Connection Method
                  </h2>
                  
                  {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
                    <div key={artisanId} className="mb-8 p-6 border border-stone-200 rounded-2xl bg-gradient-to-br from-stone-50 to-white hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-stone-900">
                            {artisanData.artisan?.artisanName || 'Unknown Artisan'}
                          </h3>
                          <p className="text-stone-600">Select how you'd like to receive your order</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {deliveryOptions[artisanId]?.pickup?.available && (
                          <label className="flex items-center space-x-4 p-4 border-2 border-stone-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-300 cursor-pointer group">
                            <input
                              type="radio"
                              name={`delivery-${artisanId}`}
                              value="pickup"
                              checked={selectedDeliveryMethods[artisanId] === 'pickup'}
                              onChange={() => handleDeliveryMethodChange(artisanId, 'pickup')}
                              className="text-emerald-600 w-6 h-6"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                  <MapPinIcon className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                  <span className="text-stone-900 font-bold text-lg">Visit the Artisan</span>
                                  <span className="text-emerald-600 text-sm font-semibold ml-2">(Free Pickup)</span>
                                </div>
                              </div>
                              <p className="text-stone-600 text-sm">Experience the artisan's space and connect personally</p>
                            </div>
                          </label>
                        )}
                        
                        {deliveryOptions[artisanId]?.personalDelivery?.available && (
                          <label className="flex items-center space-x-4 p-4 border-2 border-stone-200 rounded-2xl hover:border-amber-300 hover:bg-amber-50 transition-all duration-300 cursor-pointer group">
                            <input
                              type="radio"
                              name={`delivery-${artisanId}`}
                              value="personalDelivery"
                              checked={selectedDeliveryMethods[artisanId] === 'personalDelivery'}
                              onChange={() => handleDeliveryMethodChange(artisanId, 'personalDelivery')}
                              className="text-amber-600 w-6 h-6"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                  <TruckIcon className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <span className="text-stone-900 font-bold text-lg">Personal Delivery</span>
                                  <span className="text-stone-600 text-sm ml-2">
                                    ${deliveryOptions[artisanId]?.personalDelivery?.fee || 0}
                                    {deliveryOptions[artisanId]?.personalDelivery?.freeThreshold && 
                                      ` (Free over $${deliveryOptions[artisanId]?.personalDelivery?.freeThreshold})`
                                    }
                                  </span>
                                </div>
                              </div>
                              <p className="text-stone-600 text-sm">The artisan personally delivers to your doorstep</p>
                            </div>
                          </label>
                        )}
                        
                        {deliveryOptions[artisanId]?.professionalDelivery?.available && (
                          <label className="flex items-center space-x-4 p-4 border-2 border-stone-200 rounded-2xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 cursor-pointer group">
                            <input
                              type="radio"
                              name={`delivery-${artisanId}`}
                              value="professionalDelivery"
                              checked={selectedDeliveryMethods[artisanId] === 'professionalDelivery'}
                              onChange={() => handleDeliveryMethodChange(artisanId, 'professionalDelivery')}
                              className="text-purple-600 w-6 h-6"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                  <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <span className="text-stone-900 font-bold text-lg">Professional Delivery</span>
                                  <span className="text-stone-600 text-sm ml-2">(Uber Direct - $15)</span>
                                </div>
                              </div>
                              <p className="text-stone-600 text-sm">Reliable, tracked delivery with professional service</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Address Requirement Notice */}
                <div className="mb-6">
                  {isAddressRequired() ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />
                      <p className="text-blue-800 text-sm font-medium">
                        Address required for selected delivery methods
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckIcon className="w-5 h-5 text-emerald-600" />
                      <p className="text-emerald-800 text-sm font-medium">
                        No address required for pickup orders
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 2: Delivery Address */}
                {isAddressRequired() && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">2</span>
                      </div>
                      Where should we deliver your order?
                    </h2>
                    
                    {/* User Addresses */}
                    {userProfile?.addresses && userProfile.addresses.length > 0 ? (
                      <div className="mb-6">
                        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                          <MapPinIcon className="w-5 h-5 text-blue-600" />
                          Your Saved Addresses
                        </h3>
                        <div className="space-y-3">
                          {userProfile.addresses.map((address, index) => (
                            <label key={index} className="flex items-center space-x-4 p-4 border-2 border-stone-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 cursor-pointer group">
                              <input
                                type="radio"
                                name="saved-address"
                                checked={selectedAddress === address}
                                onChange={() => handleAddressSelect(address)}
                                className="text-blue-600 w-6 h-6"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-stone-900">
                                      {address.street}, {address.city}, {address.state} {address.zipCode}
                                    </p>
                                    <p className="text-sm text-stone-600">{address.country}</p>
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="w-5 h-5 text-amber-600" />
                          <div>
                            <h3 className="font-semibold text-amber-800">No Saved Addresses Found</h3>
                            <p className="text-amber-700 text-sm">
                              {!userProfile ? 'Loading profile...' : 
                               userProfile.addresses?.length === 0 ? 'No addresses saved yet. Add one below.' :
                               'Addresses not loaded. Please refresh the page.'}
                            </p>

                          </div>
                        </div>
                      </div>
                    )}

                    {/* Guest Information Form (for guest users) */}
                    {isGuest && (
                      <div className="border-t border-stone-200 pt-6 mb-6">
                        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                          Your Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-2">First Name *</label>
                            <input
                              type="text"
                              value={deliveryForm.firstName}
                              onChange={(e) => handleDeliveryFormChange('firstName', e.target.value)}
                              className="input-field"
                              placeholder="Enter your first name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-2">Last Name *</label>
                            <input
                              type="text"
                              value={deliveryForm.lastName}
                              onChange={(e) => handleDeliveryFormChange('lastName', e.target.value)}
                              className="input-field"
                              placeholder="Enter your last name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-2">Email Address</label>
                            <input
                              type="email"
                              value={deliveryForm.email}
                              onChange={(e) => handleDeliveryFormChange('email', e.target.value)}
                              className="input-field"
                              placeholder="Enter your email (optional)"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-2">Phone Number</label>
                            <input
                              type="tel"
                              value={deliveryForm.phone}
                              onChange={(e) => handleDeliveryFormChange('phone', e.target.value)}
                              className="input-field"
                              placeholder="Enter your phone number (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Address Form */}
                    <div className="border-t border-stone-200 pt-6">
                      <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                        <PlusIcon className="w-5 h-5 text-green-600" />
                        {isGuest ? 'Delivery Address' : 'Or Add a New Address'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-2">Street Address</label>
                          <input
                            type="text"
                            value={deliveryForm.street}
                            onChange={(e) => handleDeliveryFormChange('street', e.target.value)}
                            className="input-field"
                            placeholder="123 Main St"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-2">City</label>
                          <input
                            type="text"
                            value={deliveryForm.city}
                            onChange={(e) => handleDeliveryFormChange('city', e.target.value)}
                            className="input-field"
                            placeholder="Montreal"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-2">State/Province</label>
                          <input
                            type="text"
                            value={deliveryForm.state}
                            onChange={(e) => handleDeliveryFormChange('state', e.target.value)}
                            className="input-field"
                            placeholder="Quebec"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-stone-700 mb-2">ZIP/Postal Code</label>
                          <input
                            type="text"
                            value={deliveryForm.zipCode}
                            onChange={(e) => handleDeliveryFormChange('zipCode', e.target.value)}
                            className="input-field"
                            placeholder="H2K 3K2"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-stone-700 mb-2">Country</label>
                          <input
                            type="text"
                            value={deliveryForm.country}
                            onChange={(e) => handleDeliveryFormChange('country', e.target.value)}
                            className="input-field"
                            placeholder="Canada"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-stone-700 mb-2">Delivery Instructions (Optional)</label>
                          <textarea
                            value={deliveryForm.instructions}
                            onChange={(e) => handleDeliveryFormChange('instructions', e.target.value)}
                            className="input-field"
                            placeholder="Any special delivery instructions..."
                            rows="3"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-stone-200">
                  <button
                    onClick={handlePreviousStep}
                    className="btn-secondary text-lg px-8 py-4 hover:scale-105 transition-transform duration-200"
                  >
                    <ArrowLeftIcon className="w-6 h-6 mr-3" />
                    Review Your Selection
                  </button>
                                      {isGuest ? (
                      <button
                        onClick={handleGuestCheckout}
                        className="btn-primary text-lg px-8 py-4 hover:scale-105 transition-transform duration-200 shadow-xl"
                        disabled={
                          !deliveryForm.firstName || 
                          !deliveryForm.lastName || 
                          (isAddressRequired() && !deliveryForm.street) || 
                          isLoading
                        }
                      >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete Guest Order
                          <ArrowRightIcon className="w-6 h-6 ml-3" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleNextStep}
                      className="btn-primary text-lg px-8 py-4 hover:scale-105 transition-transform duration-200 shadow-xl"
                      disabled={isAddressRequired() && !selectedAddress && !deliveryForm.street}
                    >
                      Continue to Payment
                      <ArrowRightIcon className="w-6 h-6 ml-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column - Cost Summary and Order Summary */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Delivery Cost Summary */}
                <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6">
                  <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                      <TruckIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg">Delivery Summary</span>
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => {
                      const deliveryFee = getDeliveryFeeForArtisan(artisanId);
                      const selectedMethod = selectedDeliveryMethods[artisanId];
                      
                      return (
                        <div key={artisanId} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-200">
                          <span className="font-medium text-stone-700">{artisanData.artisan?.artisanName || 'Unknown Artisan'}:</span>
                          <span className={`font-semibold ${
                            selectedMethod === 'pickup' ? 'text-emerald-600' : 
                            selectedMethod === 'personalDelivery' ? 
                              (deliveryFee > 0 ? 'text-amber-600' : 'text-emerald-600') :
                            selectedMethod === 'professionalDelivery' ? 'text-purple-600' : 'text-stone-500'
                          }`}>
                            {selectedMethod === 'pickup' ? 'Free Pickup' : 
                             selectedMethod === 'personalDelivery' ? 
                               (deliveryFee > 0 ? `$${deliveryFee}` : 'Free Delivery') :
                             selectedMethod === 'professionalDelivery' ? '$15' : 'Not Selected'
                            }
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-stone-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-stone-800">Total Delivery:</span>
                        <span className="font-bold text-lg text-stone-900">{formatPrice(getTotalDeliveryFees())}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6">
                  <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                      <ShoppingBagIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg">Order Summary</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <span className="text-stone-600">Subtotal:</span>
                      <span className="font-semibold text-stone-900">
                        {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <span className="text-stone-600">Delivery Fees:</span>
                      <span className="font-semibold text-stone-900">{formatPrice(getTotalDeliveryFees())}</span>
                    </div>
                    <div className="border-t border-stone-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-stone-800 text-lg">Total:</span>
                        <span className="font-bold text-xl text-stone-900">{formatPrice(getTotalAmount())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render payment page (placeholder)
  if (checkoutStep === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <CreditCardIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-stone-900">Payment Information</h1>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6">
            {!isGuest && paymentMethods.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">Select Payment Method</h2>
                
                {/* Saved Payment Methods */}
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label key={method._id} className="flex items-center space-x-3 p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-all duration-200 cursor-pointer">
                      <input
                        type="radio"
                        name="payment-method"
                        checked={selectedPaymentMethod?._id === method._id}
                        onChange={() => setSelectedPaymentMethod(method)}
                        className="text-amber-600 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCardIcon className="w-5 h-5 text-stone-500" />
                          <span className="text-stone-600">
                            {method.brand?.toUpperCase()} •••• {method.last4}
                          </span>
                          {method.isDefault && (
                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-stone-600">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                
                {/* Add New Payment Method Button */}
                <button
                  onClick={() => setShowAddPaymentForm(true)}
                  className="btn-outline w-full"
                >
                  Add New Payment Method
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCardIcon className="w-16 h-16 text-stone-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900 mb-2">No Payment Methods</h3>
                <p className="text-stone-600 mb-4">
                  {isGuest ? 'Guest users need to add payment information to complete their order.' : 
                   !userProfile ? 'Loading profile...' :
                   userProfile.paymentMethods?.length === 0 ? 'No payment methods saved yet. Add one below.' :
                   'Payment methods not loaded. Please refresh the page.'}
                </p>

                <button
                  onClick={() => setShowAddPaymentForm(true)}
                  className="btn-primary"
                >
                  Add Payment Method
                </button>
              </div>
            )}
            
            {/* Add Payment Method Form */}
            {showAddPaymentForm && (
              <div className="mt-8 p-6 bg-stone-50 rounded-2xl border border-stone-200">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Add New Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">Card Number</label>
                    <input
                      type="text"
                      value={newPaymentForm.cardNumber}
                      onChange={(e) => handlePaymentFormChange('cardNumber', e.target.value)}
                      className="input-field"
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                    />
                    {paymentFormErrors.cardNumber && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.cardNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      value={newPaymentForm.cardholderName}
                      onChange={(e) => handlePaymentFormChange('cardholderName', e.target.value)}
                      className="input-field"
                      placeholder="John Doe"
                    />
                    {paymentFormErrors.cardholderName && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.cardholderName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Expiry Date</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newPaymentForm.expiryMonth}
                        onChange={(e) => handlePaymentFormChange('expiryMonth', e.target.value)}
                        className="input-field"
                        placeholder="MM"
                        maxLength="2"
                      />
                      <input
                        type="text"
                        value={newPaymentForm.expiryYear}
                        onChange={(e) => handlePaymentFormChange('expiryYear', e.target.value)}
                        className="input-field"
                        placeholder="YY"
                        maxLength="2"
                      />
                    </div>
                    {paymentFormErrors.expiry && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.expiry}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">CVV</label>
                    <input
                      type="text"
                      value={newPaymentForm.cvv}
                      onChange={(e) => handlePaymentFormChange('cvv', e.target.value)}
                      className="input-field"
                      placeholder="123"
                      maxLength="4"
                    />
                    {paymentFormErrors.cvv && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.cvv}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newPaymentForm.isDefault}
                        onChange={(e) => handlePaymentFormChange('isDefault', e.target.checked)}
                        className="text-amber-600 w-4 h-4"
                      />
                      <span className="text-sm text-stone-700">Set as default payment method</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddPaymentForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePaymentFormSubmit}
                    disabled={paymentLoading}
                    className="btn-primary"
                  >
                    {paymentLoading ? 'Adding...' : 'Add Payment Method'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={handlePreviousStep}
                className="btn-secondary"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Delivery
              </button>
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="btn-accent"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing Order...
                  </>
                ) : (
                  <>
                    Complete Order
                    <CheckIcon className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Cart;
