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
  ShieldCheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { cartService } from '../services/cartService';
import { deliveryService } from '../services/deliveryService';
import { pickupTimeService } from '../services/pickupTimeService';
import { getProfile } from '../services/authservice';
import { paymentService } from '../services/paymentService';
import { orderService } from '../services/orderService';
import { guestService } from '../services/guestService';
import { notificationService } from '../services/notificationService';
import { locationService } from '../services/locationService';
import { geocodingService } from '../services/geocodingService';
import { uberDirectService } from '../services/uberDirectService';
import ProductTypeBadge from './ProductTypeBadge';

const Cart = () => {
  const navigate = useNavigate();
  
  // Core cart state
  const [cart, setCart] = useState([]);
  const [cartByArtisan, setCartByArtisan] = useState({});
  const [checkoutStep, setCheckoutStep] = useState('cart');
  
  // Order confirmation state
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  

  
  // User state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [existingUser, setExistingUser] = useState(null);
  
  // Delivery state
  const [deliveryOptions, setDeliveryOptions] = useState({});
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [deliveryValidationResults, setDeliveryValidationResults] = useState({});
  
  // Pickup time window state
  const [pickupTimeWindows, setPickupTimeWindows] = useState({});
  const [selectedPickupTimes, setSelectedPickupTimes] = useState({});
  const [enhancedProducts, setEnhancedProducts] = useState({});
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
  const [profileLoading, setProfileLoading] = useState(false);
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
  
  // Guest payment form state
  const [guestPaymentForm, setGuestPaymentForm] = useState({
    paymentMethod: 'credit_card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

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

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    console.log('🖼️ Cart - Getting image URL for:', imagePath);
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      console.log('🖼️ Cart - Using base64 data URL');
      return imagePath;
    }
    
    // Handle HTTP URLs
    if (imagePath.startsWith('http')) {
      console.log('🖼️ Cart - Using HTTP URL');
      return imagePath;
    }
    
    // Handle relative paths (already have /uploads prefix)
    if (imagePath.startsWith('/uploads/')) {
      const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
      console.log('🖼️ Cart - Using relative path with /uploads:', fullUrl);
      return fullUrl;
    }
    
    // Handle paths that need /uploads prefix
    if (imagePath.startsWith('/')) {
      const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
      console.log('🖼️ Cart - Using path with leading slash:', fullUrl);
      return fullUrl;
    }
    
    // Handle paths without leading slash
    const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
    console.log('🖼️ Cart - Using path without leading slash:', fullUrl);
    return fullUrl;
  };

  // Helper function to check if address is required
  const isAddressRequired = () => {
    return Object.values(selectedDeliveryMethods).some(method => 
      method === 'personalDelivery' || method === 'professionalDelivery'
    );
  };

  // Helper function to get delivery fee for a specific artisan
  const getDeliveryFeeForArtisan = async (artisanId) => {
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
      const uberFee = await calculateUberDirectFee(artisanId);
      return uberFee || 15; // Fallback fee if calculation fails
    }
    
    return 0; // Pickup is free
  };

  // Calculate Uber Direct delivery fee using real API
  const [uberDirectQuotes, setUberDirectQuotes] = useState({});
  const [loadingUberQuotes, setLoadingUberQuotes] = useState(new Set());

  const calculateUberDirectFee = async (artisanId) => {
    // Check if we already have a quote for this artisan
    if (uberDirectQuotes[artisanId]) {
      return uberDirectQuotes[artisanId].fee;
    }

    // Check if we're already loading a quote for this artisan
    if (loadingUberQuotes.has(artisanId)) {
      return 15; // Return fallback while loading
    }

    try {
      setLoadingUberQuotes(prev => new Set([...prev, artisanId]));

      const artisanData = cartByArtisan[artisanId];
      if (!artisanData) return 15;

      // Get delivery address
      const deliveryAddr = selectedAddress || deliveryForm;
      if (!deliveryAddr.street) return 15;

      // Prepare locations for Uber Direct API
      const pickupLocation = {
        address: `${artisanData.artisan.address?.street || ''}, ${artisanData.artisan.address?.city || ''}, ${artisanData.artisan.address?.state || ''}, ${artisanData.artisan.address?.country || 'Canada'}`,
        latitude: artisanData.artisan.address?.latitude || artisanData.artisan.coordinates?.latitude,
        longitude: artisanData.artisan.address?.longitude || artisanData.artisan.coordinates?.longitude,
        phone: artisanData.artisan.phone || '',
        contactName: artisanData.artisan.artisanName
      };

      const dropoffLocation = {
        address: `${deliveryAddr.street}, ${deliveryAddr.city}, ${deliveryAddr.state}, ${deliveryAddr.country || 'Canada'}`,
        latitude: null, // Will be geocoded by backend
        longitude: null,
        phone: deliveryAddr.phone || '',
        contactName: `${deliveryAddr.firstName} ${deliveryAddr.lastName}`
      };

      // Calculate package details
      const totalWeight = artisanData.items.reduce((sum, item) => sum + (item.weight || 1), 0);
      const packageDetails = {
        name: `Order from ${artisanData.artisan.artisanName}`,
        quantity: artisanData.items.length,
        weight: totalWeight,
        price: artisanData.subtotal,
        size: totalWeight > 5 ? 'large' : totalWeight > 2 ? 'medium' : 'small'
      };

      // Get quote from Uber Direct
      const quote = await uberDirectService.getDeliveryQuote(
        pickupLocation,
        dropoffLocation,
        packageDetails
      );

      if (quote.success) {
        setUberDirectQuotes(prev => ({
          ...prev,
          [artisanId]: {
            fee: quote.quote.fee,
            duration: quote.quote.duration,
            pickup_eta: quote.quote.pickup_eta,
            dropoff_eta: quote.quote.dropoff_eta,
            quote_id: quote.quote.id
          }
        }));
        return quote.quote.fee;
      } else if (quote.fallback) {
        setUberDirectQuotes(prev => ({
          ...prev,
          [artisanId]: {
            fee: quote.fallback.fee,
            duration: quote.fallback.duration,
            pickup_eta: quote.fallback.pickup_eta,
            estimated: true
          }
        }));
        return quote.fallback.fee;
      }

      return 15; // Final fallback
    } catch (error) {
      console.error('❌ Error calculating Uber Direct fee:', error);
    return 15;
    } finally {
      setLoadingUberQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(artisanId);
        return newSet;
      });
    }
  };

  // Load user's payment methods
  const loadPaymentMethods = async () => {
    if (!currentUserId || isGuest) {
      return;
    }
    
    try {
      setPaymentLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
      
      // Set default payment method if available
      const defaultMethod = methods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    } catch (error) {
      console.error('❌ Error loading payment methods:', error);
    } finally {
      setPaymentLoading(false);
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

  // Get total delivery fees across all artisans (async version for API calls)
  const getTotalDeliveryFees = async () => {
    let totalFees = 0;
    
    for (const [artisanId, artisanData] of Object.entries(cartByArtisan)) {
      totalFees += await getDeliveryFeeForArtisan(artisanId);
    }
    
    return totalFees;
  };

  // Get total delivery fees synchronously (for UI display)
  const getTotalDeliveryFeesSync = () => {
    return Object.entries(cartByArtisan).reduce((total, [artisanId, artisanData]) => {
      const selectedMethod = selectedDeliveryMethods[artisanId];
      if (selectedMethod === 'personalDelivery') {
        const fee = deliveryOptions[artisanId]?.personalDelivery?.fee || 0;
        const freeThreshold = deliveryOptions[artisanId]?.personalDelivery?.freeThreshold || 0;
        return total + (artisanData.subtotal < freeThreshold ? fee : 0);
      } else if (selectedMethod === 'professionalDelivery') {
        return total + (uberDirectQuotes[artisanId]?.fee || 15);
      }
      return total;
    }, 0);
  };

  // Get total amount including delivery fees (async version for API calls)
  const getTotalAmount = async () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFees = await getTotalDeliveryFees();
    return subtotal + deliveryFees;
  };

  // Get total amount synchronously (for UI display)
  const getTotalAmountSync = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFees = getTotalDeliveryFeesSync();
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

  // Load user location
  const loadUserLocation = async () => {
    try {
      // First try to get user coordinates from profile
      if (userProfile && userProfile.coordinates) {
        const lat = parseFloat(userProfile.coordinates.latitude);
        const lng = parseFloat(userProfile.coordinates.longitude);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const locationData = {
            latitude: lat,
            longitude: lng,
            source: 'user_profile'
          };
          setUserLocation(locationData);
          return locationData;
        }
      }
      
      // Fallback to saved location
      const savedLocation = locationService.getUserLocation();
      if (savedLocation && savedLocation.lat && savedLocation.lng) {
        const lat = parseFloat(savedLocation.lat);
        const lng = parseFloat(savedLocation.lng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const locationData = {
            latitude: lat,
            longitude: lng,
            source: 'saved_location'
          };
          setUserLocation(locationData);
          return locationData;
        }
      }
      
      // If no location available, set to null
      setUserLocation(null);
      return null;
    } catch (error) {
      console.error('❌ Error loading user location:', error);
      setUserLocation(null);
      return null;
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
      
      // Determine user type and delivery address status
      const isGuestUser = !userProfile || userProfile.role === 'guest';
      const isPatronUser = userProfile && userProfile.role === 'patron';
      const hasDeliveryAddress = deliveryForm && (deliveryForm.street || deliveryForm.city);
      
      console.log('🔄 Loading delivery options with context:', {
        isGuestUser,
        isPatronUser,
        hasDeliveryAddress,
        userLocation,
        deliveryForm
      });
      
      // Process each artisan's delivery options
      Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
        if (artisanData.artisan?.deliveryOptions || artisanData.artisan?.professionalDelivery) {
          // Use the delivery service to structure options with user location and artisan data
          const processedOptions = deliveryService.getDeliveryOptions(
            artisanData.artisan,
            userLocation,
            isGuestUser,
            isPatronUser,
            hasDeliveryAddress
          );
          
          options[artisanId] = processedOptions;
          
          console.log('🔄 Processed delivery options for artisan:', artisanId, {
            pickup: processedOptions.pickup?.available,
            personalDelivery: processedOptions.personalDelivery?.available,
            professionalDelivery: processedOptions.professionalDelivery?.available,
            professionalDeliveryData: processedOptions.professionalDelivery
          });
          
          // Don't pre-select any delivery method - let user choose
          // methods[artisanId] will remain undefined until user selects
        }
      });
      
      setDeliveryOptions(options);
      setSelectedDeliveryMethods(methods);
      
      // Initialize pickup times - will be set when user selects pickup
      setSelectedPickupTimes({});
      
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
      setProfileLoading(true);
      const profile = await getProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    } finally {
      setProfileLoading(false);
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
        // Load profile and payment methods in parallel for better performance
        Promise.all([
          loadUserProfile(),
          loadPaymentMethods()
        ]).catch(error => {
          console.error('❌ Error loading profile or payment methods:', error);
        });
      }
    } else {
      // No token means guest user
      setCurrentUserId(null);
      setIsGuest(true);
      console.log('🔍 No token found, setting user as guest');
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

  // Load pickup time windows for artisans
  const loadPickupTimeWindows = async () => {
    if (!cartByArtisan || Object.keys(cartByArtisan).length === 0) {
      return;
    }
    
    try {
      const timeWindows = {};
      
      // Process each artisan's cart items
      for (const [artisanId, artisanData] of Object.entries(cartByArtisan)) {
        if (artisanData.artisan?.pickupSchedule) {
          // Fetch full product details for each item to get accurate availability
          const artisanEnhancedProducts = [];
          
          for (const item of artisanData.items || []) {
            try {
              // Try to fetch full product details from the backend
              const fullProductDetails = await cartService.fetchProductDetails(item._id);
              
              if (fullProductDetails) {
                // Use the full product details with all availability information
                artisanEnhancedProducts.push(fullProductDetails);
                console.log(`✅ Fetched full product details for ${item.name}:`, {
                  productType: fullProductDetails.productType,
                  nextAvailableDate: fullProductDetails.nextAvailableDate,
                  leadTime: fullProductDetails.leadTime
                });
              } else {
                // Fallback to cart item data if fetch fails
                const fallbackProduct = item.product || item;
                artisanEnhancedProducts.push(fallbackProduct);
                console.warn(`⚠️ Could not fetch full details for ${item.name}, using fallback data`);
              }
            } catch (error) {
              console.error(`❌ Error fetching product details for ${item.name}:`, error);
              // Fallback to cart item data
              const fallbackProduct = item.product || item;
              artisanEnhancedProducts.push(fallbackProduct);
            }
          }
          
          // Store enhanced products for this artisan
          setEnhancedProducts(prev => ({
            ...prev,
            [artisanId]: artisanEnhancedProducts
          }));
          
          const availableSlots = pickupTimeService.generateAvailableTimeSlots(
            artisanData.artisan.pickupSchedule,
            artisanEnhancedProducts,
            7 // 7 days ahead
          );
          timeWindows[artisanId] = availableSlots;
        }
      }
      
      setPickupTimeWindows(timeWindows);
    } catch (error) {
      console.error('Error loading pickup time windows:', error);
    }
  };

  // Handle delivery method selection
  const handleDeliveryMethodChange = async (artisanId, method) => {
    setSelectedDeliveryMethods(prev => ({
      ...prev,
      [artisanId]: method
    }));
    
    // Clear pickup time selection if switching away from pickup
    if (method !== 'pickup') {
      setSelectedPickupTimes(prev => ({
        ...prev,
        [artisanId]: null
      }));
    }
    
    // Validate delivery address if personal delivery is selected
    if (method === 'personalDelivery') {
      const addressToValidate = isGuest ? deliveryForm : (selectedAddress || deliveryForm);
      const hasCompleteAddress = addressToValidate && addressToValidate.street && addressToValidate.city && addressToValidate.state && addressToValidate.zipCode && addressToValidate.country;
      
      if (hasCompleteAddress) {
        const validation = await validateDeliveryAddress(addressToValidate);
        setDeliveryValidationResults(prev => ({
          ...prev,
          [artisanId]: validation.results?.[artisanId] || null
        }));
        
        // If personal delivery is invalid, auto-switch to another option
        if (validation.results?.[artisanId] && !validation.results[artisanId].valid) {
          const result = validation.results[artisanId];
          
          // Switch to pickup if available, otherwise professional delivery
          if (deliveryOptions[artisanId]?.pickup?.available) {
            setSelectedDeliveryMethods(prev => ({
              ...prev,
              [artisanId]: 'pickup'
            }));
            console.log(`🔄 Switched ${result.artisanName} to pickup due to invalid personal delivery`);
            const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
            toast(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText} (outside ${result.radius}km radius). Switched to pickup.`, {
              icon: '⚠️',
              style: {
                background: '#fef3c7',
                color: '#92400e',
              },
            });
          } else if (deliveryOptions[artisanId]?.professionalDelivery?.available) {
            setSelectedDeliveryMethods(prev => ({
              ...prev,
              [artisanId]: 'professionalDelivery'
            }));
            console.log(`🔄 Switched ${result.artisanName} to professional delivery due to invalid personal delivery`);
            const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
            toast(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText} (outside ${result.radius}km radius). Switched to professional delivery.`, {
              icon: '⚠️',
              style: {
                background: '#fef3c7',
                color: '#92400e',
              },
            });
          } else {
            setSelectedDeliveryMethods(prev => {
              const updated = { ...prev };
              delete updated[artisanId];
              return updated;
            });
            console.log(`🔄 Removed delivery method for ${result.artisanName} - no valid options available`);
            const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
            toast.error(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText} (outside ${result.radius}km radius). No other delivery options available.`);
          }
        }
      } else {
        // Clear validation results if no address provided
        setDeliveryValidationResults(prev => ({
          ...prev,
          [artisanId]: null
        }));
      }
    }
    
    // Get Uber Direct quote if professional delivery is selected
    if (method === 'professionalDelivery' && !uberDirectQuotes[artisanId]) {
      const addressToValidate = isGuest ? deliveryForm : (selectedAddress || deliveryForm);
      if (addressToValidate && addressToValidate.street) {
        console.log('🚛 Getting Uber Direct quote for artisan:', artisanId);
        await calculateUberDirectFee(artisanId);
      }
    } else {
      // Clear validation results for this artisan if switching away from personal delivery
      setDeliveryValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[artisanId];
        return newResults;
      });
    }
  };

  // Handle pickup time selection
  const handlePickupTimeChange = (artisanId, timeSlot) => {
    console.log('🕐 Pickup time selected for artisan:', artisanId, 'Time slot:', timeSlot);
    setSelectedPickupTimes(prev => ({
      ...prev,
      [artisanId]: timeSlot
    }));
  };

  // Validate delivery address for both guest users and patrons
  const validateDeliveryAddress = async (address) => {
    // Check if we have a complete address
    const hasCompleteAddress = address.street && address.city && address.state && address.zipCode && address.country;
    
    if (!hasCompleteAddress) {
      return { 
        valid: true, 
        incomplete: true,
        message: 'Please complete all address fields to validate delivery availability'
      };
    }

    try {
      // Geocode the delivery address
      const geocodedAddress = await geocodingService.geocodeAddress(
        `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`
      );

      if (!geocodedAddress) {
        return { 
          valid: false, 
          error: 'Could not verify this address. Please check if the address is correct and try again, or contact support if the issue persists.' 
        };
      }

      // Check delivery availability for each artisan with personal delivery
      const validationResults = {};
      let hasInvalidDelivery = false;
      const updatedDeliveryOptions = { ...deliveryOptions };
      const updatedSelectedMethods = { ...selectedDeliveryMethods };

      Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
        const artisanDeliveryOptions = deliveryOptions[artisanId];
        const selectedMethod = selectedDeliveryMethods[artisanId];
        
        // Only validate if personal delivery is selected for this artisan
        if (selectedMethod === 'personalDelivery' && artisanDeliveryOptions?.personalDelivery?.available) {
          
          console.log(`🔍 Artisan data for ${artisanData.artisan.artisanName}:`, {
            artisan: artisanData.artisan,
            address: artisanData.artisan?.address,
            coordinates: artisanData.artisan?.coordinates,
            fullArtisanData: artisanData.artisan
          });
          
          const artisanLat = artisanData.artisan?.address?.lat || artisanData.artisan?.address?.latitude || artisanData.artisan?.coordinates?.latitude;
          const artisanLng = artisanData.artisan?.address?.lng || artisanData.artisan?.address?.longitude || artisanData.artisan?.coordinates?.longitude;
          
          // Convert to numbers and validate
          const artisanLatNum = parseFloat(artisanLat);
          const artisanLngNum = parseFloat(artisanLng);
          const geocodedLatNum = parseFloat(geocodedAddress.latitude || geocodedAddress.lat);
          const geocodedLngNum = parseFloat(geocodedAddress.longitude || geocodedAddress.lng);
          
          if (artisanLat && artisanLng && !isNaN(artisanLatNum) && !isNaN(artisanLngNum) && !isNaN(geocodedLatNum) && !isNaN(geocodedLngNum)) {
            console.log(`🔍 Distance calculation inputs:`, {
              geocodedAddress: { 
                lat: geocodedAddress.lat, 
                lng: geocodedAddress.lng,
                latitude: geocodedAddress.latitude,
                longitude: geocodedAddress.longitude
              },
              artisanCoords: { lat: artisanLat, lng: artisanLng },
              geocodedAddressType: typeof geocodedAddress.latitude,
              artisanLatType: typeof artisanLat,
              artisanLngType: typeof artisanLng,
              convertedCoords: { 
                geocodedLat: geocodedLatNum, 
                geocodedLng: geocodedLngNum, 
                artisanLat: artisanLatNum, 
                artisanLng: artisanLngNum 
              }
            });
            
            const distance = deliveryService.calculateDistance(
              geocodedLatNum,
              geocodedLngNum,
              artisanLatNum,
              artisanLngNum
            );
            
            console.log(`🔍 Calculated distance:`, distance, typeof distance);
            
            const deliveryRadius = artisanData.artisan.deliveryOptions?.deliveryRadius || 0;
            
            // Check if distance calculation failed
            if (isNaN(distance)) {
              console.error(`❌ Distance calculation failed for ${artisanData.artisan.artisanName}:`, {
                geocodedAddress: geocodedAddress,
                artisanCoords: { lat: artisanLat, lng: artisanLng }
              });
              
              validationResults[artisanId] = {
                valid: false,
                distance: 0,
                radius: deliveryRadius,
                artisanName: artisanData.artisan.artisanName,
                error: 'Distance calculation failed'
              };
              hasInvalidDelivery = true;
            } else {
            const isValid = distance <= deliveryRadius;
            
            validationResults[artisanId] = {
              valid: isValid,
              distance: distance,
              radius: deliveryRadius,
              artisanName: artisanData.artisan.artisanName
            };
            
            if (!isValid) {
              hasInvalidDelivery = true;
              }
            }
            
            // Keep personal delivery option visible but update validation status
            // Don't modify the delivery options availability - let the UI handle the display
            if (!isNaN(distance)) {
              console.log(`📍 Address validation for ${artisanData.artisan.artisanName}:`, {
                distance: distance.toFixed(1),
                radius: deliveryRadius,
                isValid: validationResults[artisanId].valid,
                address: `${geocodedLatNum}, ${geocodedLngNum}`,
                selectedMethod: selectedMethod
              });
              
              if (!validationResults[artisanId].valid) {
                console.log(`❌ Personal delivery not available for ${artisanData.artisan.artisanName}: ${distance.toFixed(1)}km > ${deliveryRadius}km`);
              } else {
                console.log(`✅ Personal delivery available for ${artisanData.artisan.artisanName}: ${distance.toFixed(1)}km <= ${deliveryRadius}km`);
                }
              }
            } else {
            console.log(`⚠️ Invalid coordinates for artisan ${artisanData.artisan.artisanName}:`, {
              artisanLat,
              artisanLng,
              geocodedLat: geocodedAddress.latitude || geocodedAddress.lat,
              geocodedLng: geocodedAddress.longitude || geocodedAddress.lng,
              geocodedAddressFull: geocodedAddress,
              artisanLatNum,
              artisanLngNum,
              geocodedLatNum,
              geocodedLngNum
            });
            
            // Mark as invalid if coordinates are missing or invalid
            validationResults[artisanId] = {
              valid: false,
              distance: 0,
              radius: artisanData.artisan.deliveryOptions?.deliveryRadius || 0,
              artisanName: artisanData.artisan.artisanName,
              error: 'Invalid coordinates'
            };
            hasInvalidDelivery = true;
          }
        } else {
          console.log(`🔍 Skipping validation for artisan ${artisanData.artisan.artisanName}: selectedMethod=${selectedMethod}, personalDeliveryAvailable=${artisanDeliveryOptions?.personalDelivery?.available}`);
        }
      });

      // Don't automatically change delivery options or selected methods
      // Let the user see the validation results and decide what to do

      return {
        valid: !hasInvalidDelivery,
        results: validationResults,
        geocodedAddress: geocodedAddress
      };
    } catch (error) {
      console.error('Error validating delivery address:', error);
      return { 
        valid: false, 
        error: 'Unable to validate delivery address. Please check your internet connection and try again, or contact support if the issue persists.' 
      };
    }
  };


  // Handle delivery form changes
  const handleDeliveryFormChange = async (field, value) => {
    setDeliveryForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Check for existing user when email changes (with debouncing)
    if (field === 'email' && value && value.includes('@') && value.length > 5) {
      // Clear any existing timeout
      if (window.emailCheckTimeout) {
        clearTimeout(window.emailCheckTimeout);
      }
      
      // Set a new timeout to debounce the API call
      window.emailCheckTimeout = setTimeout(async () => {
      try {
        const existingUserData = await guestService.checkExistingUser(value);
        setExistingUser(existingUserData);
        if (existingUserData) {
          toast.success(`Welcome back! Found existing account for ${value}`);
        }
      } catch (error) {
        // User not found, clear existing user state
        setExistingUser(null);
      }
      }, 500); // Wait 500ms after user stops typing
    }
    
    // Validate address when address fields are completed
    if (['street', 'city', 'state', 'zipCode', 'country'].includes(field)) {
      // Clear any existing timeout
      if (window.addressValidationTimeout) {
        clearTimeout(window.addressValidationTimeout);
      }
      
      // Set a new timeout to debounce the address validation
      window.addressValidationTimeout = setTimeout(async () => {
        const updatedForm = { ...deliveryForm, [field]: value };
        
        // Only validate if we have complete address information and personal delivery is selected
        const hasCompleteAddress = updatedForm.street && updatedForm.city && updatedForm.state && updatedForm.zipCode && updatedForm.country;
        
        if (hasCompleteAddress) {
          try {
            console.log('🔍 Validating complete address for delivery options update:', updatedForm);
            
            // Check if any artisan has personal delivery selected
            const hasPersonalDeliverySelected = Object.entries(selectedDeliveryMethods).some(([artisanId, method]) => 
              method === 'personalDelivery'
            );
            
            if (hasPersonalDeliverySelected) {
              const validation = await validateDeliveryAddress(updatedForm);
              setDeliveryValidationResults(validation.results || {});
              
              // If any personal delivery becomes invalid, auto-switch to pickup or professional delivery
              if (validation.results) {
                const updatedMethods = { ...selectedDeliveryMethods };
                let methodsChanged = false;
                
                Object.entries(validation.results).forEach(([artisanId, result]) => {
                  if (!result.valid && selectedDeliveryMethods[artisanId] === 'personalDelivery') {
                    // Switch to pickup if available, otherwise professional delivery
                    if (deliveryOptions[artisanId]?.pickup?.available) {
                      updatedMethods[artisanId] = 'pickup';
                      methodsChanged = true;
                      console.log(`🔄 Switched ${result.artisanName} to pickup due to invalid personal delivery`);
                      const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
                      toast(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText} (outside ${result.radius}km radius). Switched to pickup.`, {
                        icon: '⚠️',
                        style: {
                          background: '#fef3c7',
                          color: '#92400e',
                        },
                      });
                    } else if (deliveryOptions[artisanId]?.professionalDelivery?.available) {
                      updatedMethods[artisanId] = 'professionalDelivery';
                      methodsChanged = true;
                      console.log(`🔄 Switched ${result.artisanName} to professional delivery due to invalid personal delivery`);
                      const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
                      toast(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText} (outside ${result.radius}km radius). Switched to professional delivery.`, {
                        icon: '⚠️',
                        style: {
                          background: '#fef3c7',
                          color: '#92400e',
                        },
                      });
                    } else {
                      delete updatedMethods[artisanId];
                      methodsChanged = true;
                      console.log(`🔄 Removed delivery method for ${result.artisanName} - no valid options available`);
                      const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
                      toast.error(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText} (outside ${result.radius}km radius). No other delivery options available.`);
                    }
                  }
                });
                
                if (methodsChanged) {
                  setSelectedDeliveryMethods(updatedMethods);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error validating address:', error);
          }
        }
      }, 1000); // Wait 1 second after user stops typing
    }
  };

  const handleGuestPaymentFormChange = (field, value) => {
    setGuestPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle address selection
  const handleAddressSelect = async (address) => {
    setSelectedAddress(address);
    if (address) {
      setDeliveryForm({
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        country: address.country || ''
      });
      
      // Clear previous validation results
      setDeliveryValidationResults({});
      
      // Always validate delivery address to update delivery options
      try {
        console.log('🔍 Validating selected address for delivery options update:', address);
        const validation = await validateDeliveryAddress(address);
        setDeliveryValidationResults(validation.results || {});
      } catch (error) {
        console.error('❌ Error validating selected address:', error);
      }
    }
  };

  // Handle checkout step navigation
  const handleNextStep = async () => {
    if (checkoutStep === 'cart') {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return;
      }
      
      console.log('🔍 handleNextStep - isGuest:', isGuest, 'currentUserId:', currentUserId);
      
      // For guest users or unauthenticated users, allow them to proceed to delivery
      if (isGuest || !currentUserId) {
        // Set as guest if not already set
        if (!isGuest) {
          setIsGuest(true);
        }
        console.log('🔍 Guest/unauthenticated user proceeding to delivery');
        setCheckoutStep('delivery');
        return;
      }
      
      // For authenticated users, go to delivery step
      console.log('🔍 Authenticated user proceeding to delivery');
      setCheckoutStep('delivery');
    } else if (checkoutStep === 'delivery') {
      // Validate that delivery methods are selected for each artisan
      const unselectedArtisans = [];
      Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
        if (!selectedDeliveryMethods[artisanId]) {
          unselectedArtisans.push(artisanData.artisan?.artisanName || 'Unknown Artisan');
        }
      });
      
      if (unselectedArtisans.length > 0) {
        toast.error(`Please select a delivery method for: ${unselectedArtisans.join(', ')}`);
        return;
      }
      
      // Validate pickup times for pickup orders
      const missingPickupTimes = [];
      Object.entries(selectedDeliveryMethods).forEach(([artisanId, method]) => {
        if (method === 'pickup' && !selectedPickupTimes[artisanId]) {
          const artisanName = cartByArtisan[artisanId]?.artisan?.artisanName || 'Unknown Artisan';
          missingPickupTimes.push(artisanName);
        }
      });
      
      if (missingPickupTimes.length > 0) {
        toast.error(`Please select a pickup time for: ${missingPickupTimes.join(', ')}`);
        return;
      }
      
      if (isAddressRequired() && !selectedAddress && !deliveryForm.street) {
        toast.error('Please provide delivery address');
        return;
      }
      // For guests, validate required fields before proceeding
      if (isGuest) {
        if (!deliveryForm.firstName || !deliveryForm.lastName || !deliveryForm.email) {
          toast.error('Please provide your first name, last name, and email');
          return;
        }
      }
      
      // Validate delivery address for both guests and patrons
      if (isAddressRequired()) {
        const addressToValidate = isGuest ? deliveryForm : (selectedAddress || deliveryForm);
        const hasCompleteAddress = addressToValidate && addressToValidate.street && addressToValidate.city && addressToValidate.state && addressToValidate.zipCode && addressToValidate.country;
        
        if (!hasCompleteAddress) {
          toast.error('Please complete all address fields (street, city, state, postal code) to proceed with delivery.');
          return;
        }
        
          const validation = await validateDeliveryAddress(addressToValidate);
          setDeliveryValidationResults(validation.results || {});
          
        console.log('🔍 Address validation results:', {
          validation,
          selectedDeliveryMethods,
          validationResults: validation.results
        });
        
        // Debug: Log each validation result in detail
        if (validation.results) {
          Object.entries(validation.results).forEach(([artisanId, result]) => {
            console.log(`🔍 Validation result for artisan ${artisanId}:`, {
              result,
              selectedMethod: selectedDeliveryMethods[artisanId],
              isValid: result.valid,
              distance: result.distance,
              radius: result.radius,
              artisanName: result.artisanName
            });
          });
        } else {
          console.log('🔍 No validation results found');
        }
        
        // Check if there are any invalid personal deliveries
        const hasInvalidPersonalDeliveries = Object.entries(validation.results || {}).some(([artisanId, result]) => {
          const selectedMethod = selectedDeliveryMethods[artisanId];
          const isInvalid = selectedMethod === 'personalDelivery' && !result.valid;
          console.log(`🔍 Checking artisan ${artisanId}:`, {
            selectedMethod,
            resultValid: result.valid,
            isInvalid,
            distance: result.distance,
            radius: result.radius
          });
          return isInvalid;
        });
        
        console.log('🔍 Has invalid personal deliveries:', hasInvalidPersonalDeliveries);
        
        if (!validation.valid || hasInvalidPersonalDeliveries) {
            // Check if it's a geocoding error
            if (validation.error) {
              toast.error(validation.error);
            } else {
              // Show error for each invalid delivery
              Object.entries(validation.results || {}).forEach(([artisanId, result]) => {
              const selectedMethod = selectedDeliveryMethods[artisanId];
              if (selectedMethod === 'personalDelivery' && !result.valid) {
                const distanceText = result.error ? 'distance calculation failed' : `${result.distance.toFixed(1)}km away`;
                toast.error(`🚚 Personal delivery to ${result.artisanName} is not available - your address is ${distanceText}, but their delivery radius is only ${result.radius}km. Please choose pickup or professional delivery.`);
                }
              });
            }
            return;
        }
      }
      setCheckoutStep('payment');
    }
  };

  const handlePreviousStep = () => {
    if (checkoutStep === 'delivery') {
      setCheckoutStep('cart');
    } else if (checkoutStep === 'payment') {
      setCheckoutStep('delivery');
    } else if (checkoutStep === 'confirmation') {
      setCheckoutStep('payment');
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

      // Validate pickup time selection for pickup orders
      for (const [artisanId, deliveryMethod] of Object.entries(selectedDeliveryMethods)) {
        if (deliveryMethod === 'pickup' && !selectedPickupTimes[artisanId]) {
          console.log('❌ Pickup time validation failed for artisan:', artisanId);
          console.log('   Delivery method:', deliveryMethod);
          console.log('   Selected pickup time:', selectedPickupTimes[artisanId]);
          console.log('   Available pickup windows:', pickupTimeWindows[artisanId]);
          toast.error('Please select a pickup time for all pickup orders');
          return;
        }
      }

      if (isAddressRequired() && !selectedAddress && !deliveryForm.street) {
        toast.error('Please provide delivery address');
        return;
      }

      // For guest users, validate payment information
      if (isGuest) {
        if (!guestPaymentForm.paymentMethod) {
          toast.error('Please select a payment method');
          return;
        }
        if (!guestPaymentForm.cardNumber || !guestPaymentForm.expiryDate || !guestPaymentForm.cvv || !guestPaymentForm.cardholderName) {
          toast.error('Please complete all payment details');
          return;
        }
        await handleGuestCheckout();
        return;
      }

      // For authenticated users, validate payment method
      if (!selectedPaymentMethod) {
        toast.error('Please select a payment method');
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
      
      // Check if we need to create a guest user first
      if (isGuest || !currentUserId) {
        console.log('🔍 User is guest or has no ID, using guest order endpoint');
        await handleGuestCheckout();
        return;
      }
      
      // Prepare order data for authenticated users
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          productType: item.productType || 'ready_to_ship'
        })),
        deliveryAddress: selectedAddress || deliveryForm,
        deliveryInstructions: deliveryForm.instructions || '',
        deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
        pickupTimeWindows: selectedPickupTimes, // Include pickup time selections
        paymentMethod: selectedPaymentMethod?.type || 'credit_card',
        paymentMethodId: selectedPaymentMethod?._id,
        // Include delivery method details with instructions for each artisan
        deliveryMethodDetails: Object.entries(selectedDeliveryMethods).map(([artisanId, method]) => ({
          artisanId,
          method,
          instructions: method === 'pickup' 
            ? deliveryOptions[artisanId]?.pickup?.instructions || ''
            : method === 'personalDelivery'
            ? deliveryOptions[artisanId]?.personalDelivery?.instructions || ''
            : method === 'professionalDelivery'
            ? `${deliveryOptions[artisanId]?.professionalDelivery?.packaging || ''}${deliveryOptions[artisanId]?.professionalDelivery?.restrictions ? ` - ${deliveryOptions[artisanId].professionalDelivery.restrictions}` : ''}`.trim()
            : ''
        }))
      };

      console.log('🚀🚀🚀 FRONTEND AUTHENTICATED ORDER CREATION 🚀🚀🚀');
      console.log('🔍 Creating order for authenticated user:', orderData);
      console.log('🔍 Frontend Debug - selectedPickupTimes being sent:', selectedPickupTimes);
      console.log('🔍 Frontend Debug - selectedPickupTimes keys:', Object.keys(selectedPickupTimes));
      console.log('🔍 Frontend Debug - selectedPickupTimes values:', Object.values(selectedPickupTimes));
      console.log('🔍 Frontend Debug - orderData.pickupTimeWindows:', orderData.pickupTimeWindows);
      
      // Create order using authenticated endpoint
      const result = await orderService.createOrder(orderData);
      
      // Send order completion notification for authenticated user
      const userInfo = {
        id: currentUserId,
        email: userProfile?.email,
        phone: userProfile?.phone,
        firstName: userProfile?.firstName,
        lastName: userProfile?.lastName,
        isGuest: false
      };
      
      // Send notification for each order
      for (const order of result.orders) {
        await notificationService.sendOrderCompletionNotification(order, userInfo);
      }
      
      // Clear cart
      await cartService.clearCart(currentUserId);
      
      // Show success message
      toast.success(`Order placed successfully! ${result.orders.length} order${result.orders.length > 1 ? 's' : ''} created.`);
      
      // Navigate to order confirmation
      console.log('🔍 Cart - Navigating to order confirmation with data:', {
        orders: result.orders,
        selectedPickupTimes: selectedPickupTimes,
        selectedDeliveryMethods: selectedDeliveryMethods,
        isPickupOrder: Object.values(selectedDeliveryMethods).includes('pickup'),
        firstOrderDeliveryMethod: result.orders[0]?.deliveryMethod
      });
      
      navigate('/order-confirmation', { 
        state: { 
          orders: result.orders,
          message: 'Order placed successfully!',
          orderSummary: {
            totalOrders: result.orders.length,
            totalAmount: result.orders.reduce((sum, order) => sum + order.totalAmount, 0),
            estimatedDeliveryTime: '2-3 business days',
            orderNumbers: result.orders.map(order => order.orderNumber || order._id?.toString().slice(-8).toUpperCase())
          },
          selectedPickupTimes: selectedPickupTimes, // Include pickup time selections
          isPickupOrder: Object.values(selectedDeliveryMethods).includes('pickup')
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
      
      // First, check if user already exists by email, then create or update guest profile
      let guestToken = localStorage.getItem('token');
      let guestUserId = null;
      let existingUser = null;
      
      if (deliveryForm.email) {
        console.log('🔍 Checking if user already exists with email:', deliveryForm.email);
        try {
          // Check if user exists by email
          existingUser = await guestService.checkExistingUser(deliveryForm.email);
          if (existingUser) {
            console.log('🔍 Found existing user:', existingUser);
            // Use existing user's token if available
            if (existingUser.token) {
              guestToken = existingUser.token;
              guestUserId = existingUser.id;
              // Update existing user's delivery info
              await guestService.updateUserProfile(existingUser.id, {
                firstName: deliveryForm.firstName || existingUser.firstName,
                lastName: deliveryForm.lastName || existingUser.lastName,
                phone: deliveryForm.phone || existingUser.phone
              });
            }
          }
        } catch (error) {
          console.log('🔍 No existing user found, will create new one');
        }
      }
      
      if (!guestToken || isGuest) {
        if (existingUser && !existingUser.token) {
          // Existing user but no token, need to create one
          console.log('🔍 Creating token for existing user...');
          try {
            const tokenResponse = await guestService.createTokenForExistingUser(existingUser.id);
            guestToken = tokenResponse.token;
            guestUserId = existingUser.id;
          } catch (error) {
            console.error('❌ Error creating token for existing user:', error);
            toast.error('Failed to authenticate existing user. Please try again.');
            return;
          }
        } else if (!existingUser) {
          // Create new guest user profile
          console.log('🔍 Creating new guest user profile...');
          
          const guestInfo = {
            firstName: deliveryForm.firstName || 'Guest',
            lastName: deliveryForm.lastName || 'User',
            email: deliveryForm.email || undefined,
            phone: deliveryForm.phone || undefined
          };
          
          try {
            const guestResponse = await guestService.createGuestProfile(guestInfo);
            guestToken = guestResponse.token;
            guestUserId = guestResponse.user.id;
            
            console.log('🔍 Guest user created successfully:', guestResponse.user);
          } catch (guestError) {
            console.error('❌ Error creating guest user:', guestError);
            toast.error('Failed to create guest profile. Please try again.');
            return;
          }
        }
        
        // Store the guest token
        localStorage.setItem('token', guestToken);
        
        // Update local state
        setCurrentUserId(guestUserId);
        setIsGuest(true);
      }
      
      // Show notification if using existing account
      if (existingUser) {
        toast.success(`Welcome back! Using existing account for ${existingUser.email}`);
      }
      
      // Generate unique guest ID for this order
      const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Prepare order data for guest
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          productType: item.productType || 'ready_to_ship'
        })),
        deliveryAddress: isAddressRequired() ? deliveryForm : undefined,
        deliveryInstructions: isAddressRequired() ? (deliveryForm.instructions || '') : 'Customer will pickup at artisan location',
        deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
        pickupTimeWindows: selectedPickupTimes, // Include pickup time selections
        paymentMethod: guestPaymentForm.paymentMethod,
        paymentDetails: {
          cardNumber: guestPaymentForm.cardNumber,
          expiryDate: guestPaymentForm.expiryDate,
          cvv: guestPaymentForm.cvv,
          cardholderName: guestPaymentForm.cardholderName,
          cardType: guestPaymentForm.paymentMethod === 'credit_card' ? 'credit' : 'debit'
        },
        // Include delivery method details with instructions for each artisan
        deliveryMethodDetails: Object.entries(selectedDeliveryMethods).map(([artisanId, method]) => ({
          artisanId,
          method,
          instructions: method === 'pickup' 
            ? deliveryOptions[artisanId]?.pickup?.instructions || ''
            : method === 'personalDelivery'
            ? deliveryOptions[artisanId]?.personalDelivery?.instructions || ''
            : method === 'professionalDelivery'
            ? `${deliveryOptions[artisanId]?.professionalDelivery?.packaging || ''}${deliveryOptions[artisanId]?.professionalDelivery?.restrictions ? ` - ${deliveryOptions[artisanId].professionalDelivery.restrictions}` : ''}`.trim()
            : ''
        })),
        guestInfo: {
          firstName: deliveryForm.firstName || 'Guest',
          lastName: deliveryForm.lastName || 'User',
          email: deliveryForm.email || '',
          phone: deliveryForm.phone || '',
          guestId: guestId
        }
      };

      console.log('🚀🚀🚀 FRONTEND GUEST ORDER CREATION 🚀🚀🚀');
      console.log('🔍 Creating guest order:', orderData);
      console.log('🔍 Frontend Debug - selectedPickupTimes being sent (guest):', selectedPickupTimes);
      console.log('🔍 Frontend Debug - selectedPickupTimes keys (guest):', Object.keys(selectedPickupTimes));
      console.log('🔍 Frontend Debug - selectedPickupTimes values (guest):', Object.values(selectedPickupTimes));
      console.log('🔍 Frontend Debug - orderData.pickupTimeWindows (guest):', orderData.pickupTimeWindows);
      
      // Create guest order using the guest endpoint
      const result = await orderService.createGuestOrder(orderData);
      
      // Send order completion notification for guest
      const guestUserInfo = {
        id: guestUserId,
        email: deliveryForm.email,
        phone: deliveryForm.phone,
        firstName: deliveryForm.firstName,
        lastName: deliveryForm.lastName,
        isGuest: true
      };
      
      // Send notification for each order
      for (const order of result.orders) {
        await notificationService.sendOrderCompletionNotification(order, guestUserInfo);
      }
      
      // Clear guest cart
      await cartService.clearCart(null);
      
      // Show success message
      const isPickupOrder = !isAddressRequired();
      const orderType = isPickupOrder ? 'pickup' : 'delivery';
      toast.success(`Guest ${orderType} order placed successfully! ${result.totalOrders} order${result.totalOrders > 1 ? 's' : ''} created.`);
      
      // Navigate to order confirmation
      console.log('🔍 Cart - Guest checkout navigating to order confirmation with data:', {
        orders: result.orders,
        selectedPickupTimes: selectedPickupTimes,
        isPickupOrder: isPickupOrder
      });
      
      navigate('/order-confirmation', { 
        state: { 
          message: `Guest ${orderType} order placed successfully!`,
          orders: result.orders,
          guestInfo: result.guestInfo,
          orderSummary: result.orderSummary,
          isPickupOrder: isPickupOrder,
          selectedPickupTimes: selectedPickupTimes // Include pickup time selections
        }
      });
      
    } catch (error) {
      console.error('❌ Error during guest checkout:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place guest order. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Don't automatically load user location - only when needed for delivery validation
  // useEffect(() => {
  //   if (userProfile) {
  //     loadUserLocation();
  //   }
  // }, [userProfile]);

  // Track if we've already loaded options for current cart state
  const loadedOptionsRef = React.useRef(null);

  // Load delivery options when cart data or user location changes
  useEffect(() => {
    if (Object.keys(cartByArtisan).length > 0) {
      // Create a key to track if we've already loaded for this cart state
      const cartKey = JSON.stringify({
        artisanIds: Object.keys(cartByArtisan),
        userLocation: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'no-location'
      });
      
      // Only load if we haven't loaded for this exact cart state
      if (loadedOptionsRef.current !== cartKey) {
        console.log('🔄 Loading delivery options for new cart state');
        loadedOptionsRef.current = cartKey;
      loadDeliveryOptions();
      loadPickupTimeWindows();
      } else {
        console.log('🔄 Skipping delivery options load - already loaded for this cart state');
      }
    }
  }, [cartByArtisan, userLocation]);

  // Load user profile immediately when user is authenticated
  useEffect(() => {
    if (currentUserId && !isGuest && !userProfile) {
      // Load profile and payment methods in parallel for better performance
      Promise.all([
        loadUserProfile(),
        loadPaymentMethods()
      ]).catch(error => {
        console.error('❌ Error loading user data:', error);
      });
    }
  }, [currentUserId, isGuest, userProfile]);

  // Monitor cart total changes for animation
  const [cartTotal, setCartTotal] = useState(0);
  useEffect(() => {
    const newTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    if (newTotal !== cartTotal) {
      setCartTotal(newTotal);
    }
  }, [cart, cartTotal]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (window.emailCheckTimeout) {
        clearTimeout(window.emailCheckTimeout);
      }
    };
  }, []);

  // Render loading skeleton
  if (cartLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-[#E6B655] rounded-2xl w-1/3 mb-8"></div>
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
      <div className="min-h-screen bg-[#F5F1EA] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-[#D77A61] rounded-3xl flex items-center justify-center mb-6 shadow-lg animate-bounce">
              <ShoppingBagIcon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4 animate-fade-in font-serif">Your Collection Awaits</h1>
            <p className="text-gray-600 text-lg mb-8 animate-fade-in-delay">Start exploring our local artisans and discover their unique creations</p>
            <button
              onClick={() => navigate('/')}
              className="bg-[#D77A61] text-white text-lg px-8 py-4 rounded-full hover:bg-[#3C6E47] transition-colors hover:scale-105 transition-transform duration-200 animate-fade-in-delay-2"
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
      <div className="min-h-screen bg-[#F5F1EA] py-8 relative">
        {/* Loading Overlay */}
        {updatingItems.size > 0 && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#E6B655] border-t-[#D77A61] rounded-full animate-spin"></div>
              <p className="text-lg font-semibold text-gray-700">Updating Cart...</p>
              <p className="text-sm text-gray-500">Please wait while we update your selection</p>
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D77A61] rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
              <ShoppingBagIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 font-serif">Your Artisan Collection</h1>
              <p className="text-sm sm:text-base text-gray-600">Review the beautiful creations you've selected</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
                <div key={artisanId} className="bg-white rounded-2xl shadow-xl border border-stone-100 p-4 hover:shadow-2xl hover:border-stone-200 transition-all duration-300">
                  {/* Artisan Header */}
                  <div className="border-b border-stone-200 pb-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">
                          {artisanData.artisan?.artisanName || 'Unknown Artisan'}
                        </h3>
                        <p className="text-stone-600 text-xs capitalize">
                          {artisanData.artisan?.type?.replace('_', ' ') || 'Artisan'}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Options Tags */}
                  <div className="mb-3 flex flex-wrap gap-1">
                    {deliveryOptions[artisanId]?.pickup?.available && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckIcon className="w-2.5 h-2.5" />
                        Pickup
                      </span>
                    )}
                    {deliveryOptions[artisanId]?.personalDelivery?.available ? (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                        <TruckIcon className="w-2.5 h-2.5" />
                        Personal: ${deliveryOptions[artisanId]?.personalDelivery?.fee || 0}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                        <TruckIcon className="w-2.5 h-2.5" />
                        Personal: Not Available
                      </span>
                    )}
                    {deliveryOptions[artisanId]?.professionalDelivery?.available && (
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                        <TruckIcon className="w-2.5 h-2.5" />
                        Professional
                      </span>
                    )}
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-3">
                    {artisanData.items.map((item) => (
                      <div 
                        key={item._id} 
                        className={`flex items-center space-x-3 border-b border-stone-100 pb-3 last:border-b-0 transition-all duration-300 ease-in-out ${
                          updatingItems.has(item._id) ? 'animate-pulse' : ''
                        } ${
                          successItems.has(item._id) ? 'ring-2 ring-emerald-200 bg-emerald-50' : ''
                        }`}
                        style={{
                          opacity: updatingItems.has(item._id) ? 0.7 : 1,
                          transform: updatingItems.has(item._id) ? 'scale(0.98)' : 'scale(1)'
                        }}
                      >
                        {/* Product Image */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg shadow-sm"
                            onError={(e) => {
                              console.log('❌ Cart - Image failed to load:', e.target.src);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                            onLoad={(e) => {
                              console.log('✅ Cart - Image loaded successfully:', e.target.src);
                            }}
                          />
                          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center rounded-lg shadow-sm" style={{ display: 'none' }}>
                            <ShoppingBagIcon className="w-6 h-6 text-amber-400" />
                          </div>
                          <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {item.quantity}
                          </div>
                        </div>

                        {/* Product Info - Simplified */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-stone-900 text-base mb-1 truncate">{item.name}</h4>
                          
                          {/* Availability Status - Compact */}
                          <div className="mb-2">
                            {item.productType === 'ready_to_ship' && (
                              <div className="flex items-center space-x-2 text-xs">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-green-700 font-medium">
                                  Ready Now
                                </span>
                              </div>
                            )}
                            {item.productType === 'made_to_order' && (
                              <div className="flex items-center space-x-2 text-xs">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-blue-700 font-medium">
                                  {item.leadTime || 1} {item.leadTimeUnit || 'days'}
                                </span>
                              </div>
                            )}
                            {item.productType === 'scheduled_order' && (
                              <div className="flex items-center space-x-2 text-xs">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-purple-700 font-medium">
                                  {item.nextAvailableDate ? (
                                    new Date(item.nextAvailableDate).toLocaleDateString()
                                  ) : (
                                    'Schedule TBD'
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls - Compact */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                              item.quantity <= 1 || updatingItems.has(item._id)
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:scale-110'
                            }`}
                            disabled={item.quantity <= 1 || updatingItems.has(item._id)}
                          >
                            {updatingItems.has(item._id) ? (
                              <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <MinusIcon className="w-3 h-3" />
                            )}
                          </button>
                          <span className="w-8 text-center font-semibold text-stone-900 select-none text-sm">
                            {updatingItems.has(item._id) ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                              updatingItems.has(item._id)
                                ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                                : 'bg-amber-100 hover:bg-amber-200 text-stone-700 hover:scale-110'
                            }`}
                            disabled={updatingItems.has(item._id)}
                          >
                            {updatingItems.has(item._id) ? (
                              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <PlusIcon className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Price and Actions - Compact */}
                        <div className="flex items-center space-x-2">
                          <div className="text-right min-w-[60px]">
                            <p className="font-bold text-base text-stone-900">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                            {successItems.has(item._id) && (
                              <div className="flex items-center justify-end mt-1">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-emerald-600 ml-1">✓</span>
                              </div>
                          )}
                          </div>
                          <button
                            onClick={() => handleQuantityChange(item._id, 0)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                              updatingItems.has(item._id)
                                ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                : 'bg-red-100 hover:bg-red-200 text-red-600'
                            }`}
                            title="Remove item"
                            disabled={updatingItems.has(item._id)}
                          >
                            {updatingItems.has(item._id) ? (
                              <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <TrashIcon className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Artisan Subtotal */}
                  <div className="mt-4 pt-3 border-t border-stone-200">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-stone-700">Subtotal:</span>
                      <span className="text-lg font-bold text-stone-900 transition-all duration-300 ease-in-out">
                        {formatPrice(artisanData.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
                              <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-4 sticky top-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Order Summary</h3>
                
                {/* Availability Summary */}
                <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <h4 className="text-xs font-semibold text-stone-700 mb-2">Order Timeline</h4>
                  <div className="space-y-1">
                    {cart.some(item => item.productType === 'ready_to_ship') && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span className="text-green-700">Ready to ship</span>
                      </div>
                    )}
                    {cart.some(item => item.productType === 'made_to_order') && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-700">Custom made</span>
                      </div>
                    )}
                    {cart.some(item => item.productType === 'scheduled_order') && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                        <span className="text-purple-700">Scheduled</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600 text-sm">Subtotal:</span>
                    <span className="font-semibold text-stone-900 text-base transition-all duration-300 ease-in-out">
                      {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                    </span>
                  </div>
                  <div className="border-t border-stone-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600 text-sm">Total:</span>
                      <span 
                        className={`font-bold text-stone-900 text-lg transition-all duration-300 ease-in-out ${
                          cartTotal !== cart.reduce((total, item) => total + (item.price * item.quantity), 0) 
                            ? 'animate-bounce-subtle text-amber-600' 
                            : ''
                        }`}
                      >
                        {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Delivery fees calculated at checkout</p>
                  </div>
                </div>

                <button
                  onClick={handleNextStep}
                  className="w-full btn-primary text-base py-3 hover:scale-105 transition-transform duration-200 shadow-lg"
                >
                  Choose Delivery Method
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Delivery Information</h1>
            <p className="text-gray-600">Choose your preferred delivery method and provide your details</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Delivery Options and Address */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {/* Step 1: Delivery Options */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose Delivery Method</h2>
                  
                  {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => (
                    <div key={artisanId} className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {artisanData.artisan?.artisanName || 'Unknown Artisan'}
                          </h3>
                          
                          {/* Product Types */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {artisanData.items.some(item => item.productType === 'ready_to_ship') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ready to Ship
                              </span>
                            )}
                            {artisanData.items.some(item => item.productType === 'made_to_order') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Made to Order
                              </span>
                            )}
                            {artisanData.items.some(item => item.productType === 'scheduled_order') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Scheduled Order
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {deliveryOptions[artisanId]?.pickup?.available && (
                          <>
                          <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
                            <input
                              type="radio"
                              name={`delivery-${artisanId}`}
                              value="pickup"
                              checked={selectedDeliveryMethods[artisanId] === 'pickup'}
                              onChange={() => handleDeliveryMethodChange(artisanId, 'pickup')}
                              className="text-green-600 w-4 h-4"
                            />
                            <div className="flex items-center gap-3">
                              <MapPinIcon className="w-5 h-5 text-green-600" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                <span className="text-gray-900 font-medium">Visit the Artisan</span>
                                  <span className="text-green-600 text-sm">(Free)</span>
                                </div>
                                
                                {/* Show details only when selected */}
                                {selectedDeliveryMethods[artisanId] === 'pickup' && (
                                  <div className="mt-2 space-y-2">
                                    {deliveryOptions[artisanId]?.pickup?.instructions && (
                                      <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                                        📋 <strong>Pickup Instructions:</strong> {deliveryOptions[artisanId].pickup.instructions}
                                      </div>
                                    )}
                                    {deliveryOptions[artisanId]?.pickup?.hours && (
                                      <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                                        🕒 <strong>Pickup Hours:</strong> {deliveryOptions[artisanId].pickup.hours}
                                      </div>
                                    )}
                                    {deliveryOptions[artisanId]?.pickup?.address && (
                                      <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                                        📍 <strong>Pickup Location:</strong> {deliveryOptions[artisanId].pickup.address}
                                      </div>
                                    )}
                                    <div className="text-xs text-green-700 bg-green-100 p-2 rounded border border-green-200">
                                      ✅ <strong>No additional requirements needed</strong> - You can pickup at your convenience during business hours
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                            
                            {/* Pickup Time Selection */}
                            {selectedDeliveryMethods[artisanId] === 'pickup' && pickupTimeWindows[artisanId] && (
                              <div className="ml-7 mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
                                  <MapPinIcon className="w-4 h-4" />
                                  Select Pickup Time
                                </h4>
                                
                                {/* Availability Information */}
                                {(() => {
                                  // Use enhanced products if available, otherwise fallback to cart item data
                                  const artisanProducts = enhancedProducts[artisanId] || 
                                    artisanData.items?.map(item => item.product || item) || [];
                                  
                                  const availabilityInfo = pickupTimeService.getAvailabilityInfo(artisanProducts);
                                  
                                  return (
                                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-blue-800">📅 Availability:</span>
                                        <span className={`text-xs ${
                                          availabilityInfo.type === 'ready' ? 'text-green-700' : 
                                          availabilityInfo.type === 'made_to_order' ? 'text-orange-700' : 
                                          'text-blue-700'
                                        }`}>
                                          {availabilityInfo.message}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div className="space-y-2">
                                  {pickupTimeWindows[artisanId].slice(0, 6).map((timeSlot, index) => (
                                    <label key={index} className="flex items-center space-x-3 p-2 border border-green-200 rounded-lg hover:border-green-300 hover:bg-green-100 transition-colors cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`pickup-time-${artisanId}`}
                                        value={timeSlot.fullLabel}
                                        checked={selectedPickupTimes[artisanId]?.fullLabel === timeSlot.fullLabel}
                                        onChange={() => handlePickupTimeChange(artisanId, timeSlot)}
                                        className="text-green-600 w-4 h-4"
                                      />
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-green-900">{timeSlot.dateLabel}</span>
                                        <span className="text-sm text-green-700">{timeSlot.timeSlot.label}</span>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                                {pickupTimeWindows[artisanId].length > 6 && (
                                  <p className="text-xs text-green-600 mt-2">
                                    Showing next 6 available slots. More slots available.
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        
                        {deliveryOptions[artisanId]?.personalDelivery?.available ? (
                          <label className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors cursor-pointer ${
                            deliveryValidationResults[artisanId] && !deliveryValidationResults[artisanId].valid
                              ? 'border-red-200 bg-red-50 hover:border-red-300'
                              : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                          }`}>
                            <input
                              type="radio"
                              name={`delivery-${artisanId}`}
                              value="personalDelivery"
                              checked={selectedDeliveryMethods[artisanId] === 'personalDelivery'}
                              onChange={() => handleDeliveryMethodChange(artisanId, 'personalDelivery')}
                              className="text-orange-600 w-4 h-4"
                              disabled={deliveryValidationResults[artisanId] && !deliveryValidationResults[artisanId].valid}
                            />
                            <div className="flex items-center gap-3">
                              <TruckIcon className={`w-5 h-5 ${
                                deliveryValidationResults[artisanId] && !deliveryValidationResults[artisanId].valid
                                  ? 'text-red-400'
                                  : 'text-orange-600'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${
                                    deliveryValidationResults[artisanId] && !deliveryValidationResults[artisanId].valid
                                      ? 'text-red-700'
                                      : 'text-gray-900'
                                  }`}>Personal Delivery</span>
                                  <span className="text-gray-600 text-sm">
                                  ${deliveryOptions[artisanId]?.personalDelivery?.fee || 0}
                                  {deliveryOptions[artisanId]?.personalDelivery?.freeThreshold && 
                                    ` (Free over $${deliveryOptions[artisanId]?.personalDelivery?.freeThreshold})`
                                  }
                                </span>
                                </div>
                                
                                {/* Show details only when selected */}
                                {selectedDeliveryMethods[artisanId] === 'personalDelivery' && (
                                  <div className="mt-2 space-y-2">
                                    {/* Address validation status */}
                                    {deliveryValidationResults[artisanId] ? (
                                      deliveryValidationResults[artisanId].valid ? (
                                        <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                          ✅ <strong>Available:</strong> Your address is {deliveryValidationResults[artisanId].distance.toFixed(1)}km away (within {deliveryValidationResults[artisanId].radius}km radius)
                                        </div>
                                      ) : (
                                        <div className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
                                          ❌ <strong>Not Available:</strong> Your address is {deliveryValidationResults[artisanId].distance.toFixed(1)}km away (outside {deliveryValidationResults[artisanId].radius}km radius). Please choose pickup or professional delivery.
                                        </div>
                                      )
                                    ) : (
                                      <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                                        📍 <strong>Complete Address Required:</strong> Please enter your complete delivery address (street, city, state, postal code) to verify availability within {deliveryOptions[artisanId]?.personalDelivery?.radius}km radius
                                      </div>
                                    )}
                                    
                                    {deliveryOptions[artisanId]?.personalDelivery?.instructions && (
                                      <div className="text-xs text-gray-600 bg-orange-50 p-2 rounded">
                                        📋 <strong>Delivery Instructions:</strong> {deliveryOptions[artisanId].personalDelivery.instructions}
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">
                                      💰 <strong>Delivery Fee:</strong> 
                                      {deliveryOptions[artisanId]?.personalDelivery?.fee > 0 ? (
                                        <> ${deliveryOptions[artisanId]?.personalDelivery?.fee} 
                                        {deliveryOptions[artisanId]?.personalDelivery?.freeThreshold && 
                                          <> (Free on orders over ${deliveryOptions[artisanId]?.personalDelivery?.freeThreshold})</>
                                        }</>
                                      ) : (
                                        <> Free delivery</>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        ) : (
                          <div className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg bg-red-50 opacity-80">
                            <input
                              type="radio"
                              disabled
                              className="text-gray-400 w-4 h-4"
                            />
                            <div className="flex items-center gap-3">
                              <TruckIcon className="w-5 h-5 text-red-400" />
                              <div>
                                <span className="text-red-600 font-medium">Personal Delivery</span>
                                <div className="text-xs text-red-700 mt-1 font-medium">
                                  ❌ {deliveryOptions[artisanId]?.personalDelivery?.reason || 'Not available'}
                                </div>
                                {deliveryValidationResults[artisanId] && !deliveryValidationResults[artisanId].valid && (
                                <div className="text-xs text-red-600 mt-1">
                                    {deliveryValidationResults[artisanId].error 
                                      ? '⚠️ Distance calculation failed - please verify your address'
                                      : `🚚 Too far for personal delivery: ${deliveryValidationResults[artisanId].distance.toFixed(1)}km away (${deliveryValidationResults[artisanId].radius}km radius)`
                                    }
                                </div>
                                )}
                                {(deliveryOptions[artisanId]?.personalDelivery?.reason?.includes('Outside') || 
                                  (deliveryValidationResults[artisanId] && !deliveryValidationResults[artisanId].valid)) && (
                                  <div className="text-xs text-red-600 mt-1 italic">
                                    💡 Try pickup or check if professional delivery is available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {deliveryOptions[artisanId]?.professionalDelivery?.available && (
                          <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer">
                            <input
                              type="radio"
                              name={`delivery-${artisanId}`}
                              value="professionalDelivery"
                              checked={selectedDeliveryMethods[artisanId] === 'professionalDelivery'}
                              onChange={() => handleDeliveryMethodChange(artisanId, 'professionalDelivery')}
                              className="text-purple-600 w-4 h-4"
                            />
                            <div className="flex items-center gap-3">
                              <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                <span className="text-gray-900 font-medium">Professional Delivery</span>
                                  <span className="text-gray-500 text-sm">(Uber Direct)</span>
                                </div>
                                
                                {/* Show details only when selected */}
                                {selectedDeliveryMethods[artisanId] === 'professionalDelivery' && (
                                  <div className="mt-2 space-y-2">
                                    <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                                      📍 <strong>Address Required:</strong> Enter your delivery address below to get an accurate quote and delivery time
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 bg-purple-50 p-2 rounded border border-purple-200">
                                      {loadingUberQuotes.has(artisanId) ? (
                                        <span className="flex items-center gap-2">
                                          <div className="w-3 h-3 border border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                                          <span>Getting quote...</span>
                                        </span>
                                      ) : uberDirectQuotes[artisanId] ? (
                                        <div className="flex items-center gap-2">
                                          <span>🚛 <strong>${uberDirectQuotes[artisanId].fee}</strong></span>
                                          {uberDirectQuotes[artisanId].estimated && (
                                            <span className="text-xs text-orange-600">(estimated)</span>
                                          )}
                                          {uberDirectQuotes[artisanId].duration && (
                                            <span className="text-xs text-gray-500">• {uberDirectQuotes[artisanId].duration} min</span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-600">Quote will be calculated after address entry</span>
                                      )}
                                    </div>
                                    
                                    {(deliveryOptions[artisanId]?.professionalDelivery?.packaging || 
                                      deliveryOptions[artisanId]?.professionalDelivery?.restrictions) && (
                                      <div className="space-y-1">
                                        {deliveryOptions[artisanId]?.professionalDelivery?.packaging && (
                                          <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded">
                                            📦 <strong>Packaging:</strong> {deliveryOptions[artisanId].professionalDelivery.packaging}
                                          </div>
                                        )}
                                        {deliveryOptions[artisanId]?.professionalDelivery?.restrictions && (
                                          <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded">
                                            ⚠️ <strong>Restrictions:</strong> {deliveryOptions[artisanId].professionalDelivery.restrictions}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded border border-purple-200">
                                      🚛 <strong>Professional Service:</strong> Reliable delivery with tracking and insurance coverage
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        )}
                      </div>
                      
                      {/* Show selection status */}
                      {!selectedDeliveryMethods[artisanId] && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-800 font-medium">
                              Please select a delivery method above
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Address Requirement Notice */}
                <div className="mb-6">
                  {isAddressRequired() ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />
                      <p className="text-blue-800 text-sm font-medium">
                        Address required for selected delivery methods
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <CheckIcon className="w-5 h-5 text-green-600" />
                      <p className="text-green-800 text-sm font-medium">
                        No address required for pickup orders
                      </p>
                    </div>
                  )}
                </div>

                {/* Guest Information Form (for guest users) - Always show for guests */}
                {isGuest && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                        <input
                          type="text"
                          value={deliveryForm.firstName}
                          onChange={(e) => handleDeliveryFormChange('firstName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="First name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                        <input
                          type="text"
                          value={deliveryForm.lastName}
                          onChange={(e) => handleDeliveryFormChange('lastName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Last name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                        <input
                          type="email"
                          value={deliveryForm.email}
                          onChange={(e) => handleDeliveryFormChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Enter your email address"
                          required
                        />
                        {/* Show existing account notification */}
                        {existingUser && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-800">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Welcome back! Using existing account for {existingUser.email}
                              </span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              Your information will be updated with this order.
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={deliveryForm.phone}
                          onChange={(e) => handleDeliveryFormChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Enter your phone number (optional)"
                        />
                      </div>
                    </div>
                      
                    {/* Pickup Information Notice */}
                    {!isAddressRequired() && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-green-800 text-sm font-medium">Pickup Order</p>
                            <p className="text-green-700 text-sm">
                              You'll visit the artisan to collect your order. We'll use your email to identify you and send order updates.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Delivery Address (only when required) */}
                {isAddressRequired() && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Delivery Address</h2>
                    
                    {/* User Addresses - Only for authenticated users */}
                    {!isGuest && userProfile?.addresses && userProfile.addresses.length > 0 ? (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <MapPinIcon className="w-5 h-5 text-blue-600" />
                          Your Saved Addresses
                        </h3>
                        <div className="space-y-3">
                          {userProfile.addresses.map((address, index) => (
                            <label key={index} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                              <input
                                type="radio"
                                name="saved-address"
                                checked={selectedAddress === address}
                                onChange={() => handleAddressSelect(address)}
                                className="text-blue-600 w-4 h-4"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {address.street}, {address.city}, {address.state} {address.zipCode}
                                </p>
                                <p className="text-xs text-gray-600">{address.country}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : !isGuest && profileLoading ? (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          <div>
                            <h3 className="font-medium text-blue-800 text-sm">Loading Addresses</h3>
                            <p className="text-blue-700 text-sm">Please wait while we load your saved addresses...</p>
                          </div>
                        </div>
                      </div>
                    ) : !isGuest && (
                      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="w-5 h-5 text-orange-600" />
                          <div>
                            <h3 className="font-medium text-orange-800 text-sm">No Saved Addresses</h3>
                            <p className="text-orange-700 text-sm">No addresses saved yet. Add one below.</p>
                          </div>
                        </div>
                      </div>
                    )}





                    {/* Manual Address Form - Only show when address is required */}
                    {isAddressRequired() && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <PlusIcon className="w-5 h-5 text-green-600" />
                          {isGuest ? 'Delivery Address' : 'Add New Address'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                            <input
                              type="text"
                              value={deliveryForm.street}
                              onChange={(e) => handleDeliveryFormChange('street', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="123 Main St"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                            <input
                              type="text"
                              value={deliveryForm.city}
                              onChange={(e) => handleDeliveryFormChange('city', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Montreal"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">State/Province *</label>
                            <input
                              type="text"
                              value={deliveryForm.state}
                              onChange={(e) => handleDeliveryFormChange('state', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="State/Province"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code *</label>
                            <input
                              type="text"
                              value={deliveryForm.zipCode}
                              onChange={(e) => handleDeliveryFormChange('zipCode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="H2K 3K2"
                              required
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                            <input
                              type="text"
                              value={deliveryForm.country}
                              onChange={(e) => handleDeliveryFormChange('country', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Canada"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Instructions</label>
                            <textarea
                              value={deliveryForm.instructions}
                              onChange={(e) => handleDeliveryFormChange('instructions', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Any special delivery instructions..."
                              rows="3"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Pickup Instructions for Guest Users */}
                    {isGuest && !isAddressRequired() && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <MapPinIcon className="w-5 h-5 text-green-600" />
                          Pickup Instructions
                        </h3>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-green-600 text-xs font-bold">1</span>
                              </div>
                              <div>
                                <p className="text-green-800 text-sm font-medium">Complete your order</p>
                                <p className="text-green-700 text-sm">Provide your name, email, and phone number above</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-green-600 text-xs font-bold">2</span>
                              </div>
                              <div>
                                <p className="text-green-800 text-sm font-medium">Visit the artisan</p>
                                <p className="text-green-700 text-sm">Go to the artisan's location to collect your order</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-green-600 text-xs font-bold">3</span>
                              </div>
                              <div>
                                <p className="text-green-800 text-sm font-medium">Show your email</p>
                                <p className="text-green-700 text-sm">Present your email confirmation to the artisan</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handlePreviousStep}
                    className="flex items-center px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back to Cart
                  </button>
                  {isGuest ? (
                    <button
                      onClick={handleNextStep}
                      className="flex items-center px-6 py-3 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        !deliveryForm.firstName || 
                        !deliveryForm.lastName || 
                        !deliveryForm.email ||
                        (isAddressRequired() && !deliveryForm.street) || 
                        isLoading
                      }
                    >
                      Continue to Payment
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </button>
                  ) : (
                    <button
                      onClick={handleNextStep}
                      className="flex items-center px-6 py-3 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isAddressRequired() && !selectedAddress && !deliveryForm.street}
                    >
                      Continue to Payment
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column - Cost Summary and Order Summary */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Delivery Cost Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
                    <TruckIcon className="w-5 h-5 text-orange-600" />
                    Delivery Summary
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => {
                      const selectedMethod = selectedDeliveryMethods[artisanId];
                      // For display purposes, use synchronous calculation or cached values
                      const deliveryFee = selectedMethod === 'personalDelivery' ? 
                        (artisanData.subtotal >= (deliveryOptions[artisanId]?.personalDelivery?.freeThreshold || 0) ? 0 : 
                         deliveryOptions[artisanId]?.personalDelivery?.fee || 0) : 
                        selectedMethod === 'professionalDelivery' ? 
                          (uberDirectQuotes[artisanId]?.fee || 15) : 0;
                      
                      return (
                        <div key={artisanId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">{artisanData.artisan?.artisanName || 'Unknown Artisan'}:</span>
                          <span className={`font-semibold ${
                            selectedMethod === 'pickup' ? 'text-green-600' : 
                            selectedMethod === 'personalDelivery' ? 
                              (deliveryFee > 0 ? 'text-orange-600' : 'text-green-600') :
                            selectedMethod === 'professionalDelivery' ? 'text-purple-600' : 'text-gray-500'
                          }`}>
                            {selectedMethod === 'pickup' ? 'Free Pickup' : 
                             selectedMethod === 'personalDelivery' ? 
                               (deliveryFee > 0 ? `$${deliveryFee}` : 'Free Delivery') :
                             selectedMethod === 'professionalDelivery' ? `$${uberDirectQuotes[artisanId]?.fee || 15}` : 'Not Selected'
                            }
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">Total Delivery:</span>
                        <span className="font-bold text-lg text-gray-900">{formatPrice(
                          Object.entries(cartByArtisan).reduce((total, [artisanId, artisanData]) => {
                            const selectedMethod = selectedDeliveryMethods[artisanId];
                            if (selectedMethod === 'personalDelivery') {
                              const fee = deliveryOptions[artisanId]?.personalDelivery?.fee || 0;
                              const freeThreshold = deliveryOptions[artisanId]?.personalDelivery?.freeThreshold || 0;
                              return total + (artisanData.subtotal < freeThreshold ? fee : 0);
                            } else if (selectedMethod === 'professionalDelivery') {
                              return total + (uberDirectQuotes[artisanId]?.fee || 15);
                            }
                            return total;
                          }, 0)
                        )}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
                    <ShoppingBagIcon className="w-5 h-5 text-green-600" />
                    Order Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Delivery Fees:</span>
                      <span className="font-semibold text-gray-900">{formatPrice(getTotalDeliveryFeesSync())}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800 text-lg">Total:</span>
                        <span className="font-bold text-xl text-gray-900">{formatPrice(getTotalAmountSync())}</span>
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Information</h1>
            <p className="text-gray-600">Complete your order with secure payment</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {isGuest ? (
              // Guest Payment Method Selection
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Payment Method</h2>
                
                {/* Payment Method Options for Guests */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="guest-payment-method"
                      value="credit_card"
                      checked={guestPaymentForm.paymentMethod === 'credit_card'}
                      onChange={(e) => handleGuestPaymentFormChange('paymentMethod', e.target.value)}
                      className="text-green-600 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCardIcon className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-gray-900">Credit Card</span>
                      </div>
                      <p className="text-gray-600 text-sm">Secure payment with major credit cards</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="guest-payment-method"
                      value="debit_card"
                      checked={guestPaymentForm.paymentMethod === 'debit_card'}
                      onChange={(e) => handleGuestPaymentFormChange('paymentMethod', e.target.value)}
                      className="text-blue-600 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCardIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900">Debit Card</span>
                      </div>
                      <p className="text-gray-600 text-sm">Direct payment from your bank account</p>
                    </div>
                  </label>
                </div>

                {/* Payment Details Form for Guests */}
                {guestPaymentForm.paymentMethod && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Payment Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Card Number *</label>
                        <input
                          type="text"
                          value={guestPaymentForm.cardNumber}
                          onChange={(e) => handleGuestPaymentFormChange('cardNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                        <input
                          type="text"
                          value={guestPaymentForm.expiryDate}
                          onChange={(e) => handleGuestPaymentFormChange('expiryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="MM/YY"
                          maxLength="5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CVV *</label>
                        <input
                          type="text"
                          value={guestPaymentForm.cvv}
                          onChange={(e) => handleGuestPaymentFormChange('cvv', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="123"
                          maxLength="4"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name *</label>
                        <input
                          type="text"
                          value={guestPaymentForm.cardholderName}
                          onChange={(e) => handleGuestPaymentFormChange('cardholderName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Name on card"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : !isGuest && profileLoading ? (
              // Loading Payment Methods
              <div className="text-center py-8">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Payment Methods</h3>
                <p className="text-gray-600">Please wait while we load your saved payment methods...</p>
              </div>
            ) : !isGuest && paymentMethods.length > 0 ? (
              // Authenticated User Payment Methods
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-gray-900 mb-4">Select Payment Method</h2>
                
                {/* Saved Payment Methods */}
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label key={method._id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="payment-method"
                        checked={selectedPaymentMethod?._id === method._id}
                        onChange={() => setSelectedPaymentMethod(method)}
                        className="text-orange-600 w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCardIcon className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-600">
                            {method.brand?.toUpperCase()} •••• {method.last4}
                          </span>
                          {method.isDefault && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
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
              // No Payment Methods (for authenticated users)
              <div className="text-center py-8">
                <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods</h3>
                <p className="text-gray-600 mb-4">
                  {profileLoading ? 'Loading payment methods...' :
                   userProfile?.paymentMethods?.length === 0 ? 'No payment methods saved yet. Add one below.' :
                   'No payment methods available.'}
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
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input
                      type="text"
                      value={newPaymentForm.cardNumber}
                      onChange={(e) => handlePaymentFormChange('cardNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                    />
                    {paymentFormErrors.cardNumber && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.cardNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      value={newPaymentForm.cardholderName}
                      onChange={(e) => handlePaymentFormChange('cardholderName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="John Doe"
                    />
                    {paymentFormErrors.cardholderName && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.cardholderName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newPaymentForm.expiryMonth}
                        onChange={(e) => handlePaymentFormChange('expiryMonth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="MM"
                        maxLength="2"
                      />
                      <input
                        type="text"
                        value={newPaymentForm.expiryYear}
                        onChange={(e) => handlePaymentFormChange('expiryYear', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="YY"
                        maxLength="2"
                      />
                    </div>
                    {paymentFormErrors.expiry && (
                      <p className="text-red-600 text-sm mt-1">{paymentFormErrors.expiry}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                    <input
                      type="text"
                      value={newPaymentForm.cvv}
                      onChange={(e) => handlePaymentFormChange('cvv', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

  // Render order confirmation page
  if (checkoutStep === 'confirmation' && orderConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mr-6">
              <CheckIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">🎉 Order Confirmed!</h1>
              <p className="text-lg text-gray-600">Your order has been successfully placed with our artisans</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            {/* Order Summary */}
            <div className="mb-8">
              <h2 className="text-2xl font-medium text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📋</span>
                </div>
                Order Summary
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900">{orderConfirmation.orderSummary?.totalOrders || orderConfirmation.orders?.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${orderConfirmation.orderSummary?.totalAmount || 
                      orderConfirmation.orders?.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600 font-medium">Estimated Delivery</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {orderConfirmation.orderSummary?.estimatedDeliveryTime || '2-3 business days'}
                  </p>
                </div>
              </div>

              {/* Order Numbers */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Order Numbers:</p>
                <div className="flex flex-wrap gap-2">
                  {orderConfirmation.orderSummary?.orderNumbers?.map((orderNum, index) => (
                    <span key={index} className="bg-white px-3 py-1 rounded-lg border border-gray-200 font-mono text-sm font-bold">
                      {orderNum}
                    </span>
                  )) || 
                  orderConfirmation.orders?.map((order, index) => (
                    <span key={index} className="bg-white px-3 py-1 rounded-lg border border-gray-200 font-mono text-sm font-bold">
                      {order.orderNumber || order.orderId?.toString().slice(-8).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Individual Orders */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-stone-900 mb-4">Order Details</h3>
              <div className="space-y-6">
                {orderConfirmation.orders?.map((order, index) => (
                  <div key={index} className="border border-stone-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-stone-900 text-lg">
                          {order.artisan?.name || 'Artisan'}
                        </h4>
                        <p className="text-stone-600">
                          {order.artisan?.type || 'Local Artisan'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          ${order.totalAmount?.toFixed(2)}
                        </p>
                        <p className="text-sm text-stone-500">Order Total</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-4">
                      <h5 className="font-semibold text-stone-900 mb-3">Items:</h5>
                      <div className="space-y-2">
                        {order.items?.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between items-center py-2 border-b border-stone-100">
                            <div>
                              <p className="font-medium text-stone-900">{item.name}</p>
                              <p className="text-sm text-stone-600">
                                Qty: {item.quantity} × ${item.unitPrice?.toFixed(2)}
                              </p>
                            </div>
                            <p className="font-semibold text-stone-900">
                              ${item.totalPrice?.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="bg-stone-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-stone-900 mb-2">Delivery Address:</h5>
                      <p className="text-stone-700">
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.zipCode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Information */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-stone-900 mb-4">Your Information</h3>
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Name</p>
                    <p className="font-semibold text-stone-900">
                      {orderConfirmation.guestInfo?.firstName} {orderConfirmation.guestInfo?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Email</p>
                    <p className="font-semibold text-stone-900">{orderConfirmation.guestInfo?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Phone</p>
                    <p className="font-semibold text-stone-900">{orderConfirmation.guestInfo?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Guest ID</p>
                    <p className="font-mono text-sm font-semibold text-stone-900">{orderConfirmation.guestInfo?.guestId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Follow-up Information */}
            {orderConfirmation.followUpInfo && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-stone-900 mb-4">What's Next?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3">📧 Check Your Email</h4>
                    <p className="text-blue-800 text-sm">
                      We've sent a confirmation email to {orderConfirmation.guestInfo?.email} with all the details.
                    </p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <h4 className="font-bold text-green-900 mb-3">📱 Track Your Order</h4>
                    <p className="text-green-800 text-sm">
                      Use the order numbers above to track your order status with our artisans.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Creation Encouragement */}
            {orderConfirmation.accountCreation && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-amber-900 mb-3">
                    🌟 Ready to unlock the full bazaar experience?
                  </h3>
                  <p className="text-amber-800 mb-4">
                    Create your free account and start earning rewards, tracking orders in real-time, and getting exclusive artisan offers!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => navigate('/register')}
                      className="btn-primary px-8 py-3"
                    >
                      Create Free Account
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="btn-outline px-8 py-3"
                    >
                      Sign In to Existing Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information */}
            {orderConfirmation.followUpInfo?.contactInfo && (
              <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
                <h3 className="text-xl font-bold text-stone-900 mb-4">Need Help?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Email Support</p>
                    <p className="font-semibold text-stone-900">{orderConfirmation.followUpInfo.contactInfo.supportEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Phone Support</p>
                    <p className="font-semibold text-stone-900">{orderConfirmation.followUpInfo.contactInfo.supportPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Help Center</p>
                    <a 
                      href={orderConfirmation.followUpInfo.contactInfo.helpCenter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      Visit Help Center
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t border-stone-200">
              <button
                onClick={() => navigate('/')}
                className="btn-primary px-8 py-3"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => setCheckoutStep('payment')}
                className="btn-outline px-8 py-3"
              >
                Back to Payment
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
