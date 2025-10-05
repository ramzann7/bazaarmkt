import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TruckIcon, 
  CreditCardIcon,
  MapPinIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { cartService } from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';
import { deliveryService } from '../services/deliveryService';
import { pickupTimeService } from '../services/pickupTimeService';
import { getProfile } from '../services/authservice';
import { paymentService } from '../services/paymentService';
import { profileService } from '../services/profileService';
import { orderService } from '../services/orderService';
import { guestService } from '../services/guestService';
import { notificationService } from '../services/notificationService';
import { locationService } from '../services/locationService';
import { geocodingService } from '../services/geocodingService';
import { uberDirectService } from '../services/uberDirectService';
import { orderPaymentService } from '../services/orderPaymentService';
import DeliveryInformation from './DeliveryInformation.jsx';
import StripeOrderPayment from './StripeOrderPayment.jsx';

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Core cart state
  const [cart, setCart] = useState([]);
  const [cartByArtisan, setCartByArtisan] = useState({});
  const [checkoutStep, setCheckoutStep] = useState('delivery'); // Start at delivery options
  const [currentCheckoutArtisan, setCurrentCheckoutArtisan] = useState(null);
  const [processedArtisans, setProcessedArtisans] = useState([]);
  
  // Order confirmation state
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  

  
  // User state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [existingUser, setExistingUser] = useState(null);
  const [lastValidatedEmail, setLastValidatedEmail] = useState(null);
  
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
  
  // Payment state
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  

  // Initialize checkout artisan when cart loads
  useEffect(() => {
    if (cartByArtisan && Object.keys(cartByArtisan).length > 0 && !currentCheckoutArtisan) {
      const firstArtisanId = Object.keys(cartByArtisan)[0];
      setCurrentCheckoutArtisan(firstArtisanId);
      console.log('🔍 Initialized checkout with first artisan:', firstArtisanId);
    }
  }, [cartByArtisan, currentCheckoutArtisan]);

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

  // Using centralized image utilities from imageUtils.js

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


  // Validate payment form
  const validatePaymentForm = () => {
    const errors = {};
    
    // Validate card number
    if (!newPaymentForm.cardNumber) {
      errors.cardNumber = 'Card number is required';
    } else {
      const cardDigitsOnly = newPaymentForm.cardNumber.replace(/\D/g, '');
      if (cardDigitsOnly.length < 13 || cardDigitsOnly.length > 19) {
        errors.cardNumber = 'Card number must be 13-19 digits';
      }
    }
    
    // Validate expiry date
    if (!newPaymentForm.expiryMonth || !newPaymentForm.expiryYear) {
      errors.expiry = 'Expiry date is required';
    } else {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expiryYear = parseInt(newPaymentForm.expiryYear);
      const expiryMonth = parseInt(newPaymentForm.expiryMonth);
      
      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        errors.expiry = 'Card has expired';
      }
    }
    
    // Validate CVV
    if (!newPaymentForm.cvv) {
      errors.cvv = 'CVV is required';
    } else if (newPaymentForm.cvv.length < 3) {
      errors.cvv = 'CVV must be 3-4 digits';
    }
    
    // Validate cardholder name
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
      
      // Extract last 4 digits and detect brand
      const cardDigitsOnly = newPaymentForm.cardNumber.replace(/\D/g, '');
      const last4 = cardDigitsOnly.slice(-4);
      
      // Auto-detect brand
      let brand = 'other';
      if (cardDigitsOnly.startsWith('4')) {
        brand = 'visa';
      } else if (cardDigitsOnly.startsWith('5')) {
        brand = 'mastercard';
      } else if (cardDigitsOnly.startsWith('34') || cardDigitsOnly.startsWith('37')) {
        brand = 'amex';
      } else if (cardDigitsOnly.startsWith('6')) {
        brand = 'discover';
      }
      
      const paymentData = {
        type: 'credit_card',
        last4: last4,  // Only store last 4 digits
        brand: brand,
        expiryMonth: parseInt(newPaymentForm.expiryMonth),
        expiryYear: parseInt(newPaymentForm.expiryYear),
        cardholderName: newPaymentForm.cardholderName.trim(),
        isDefault: paymentMethods.length === 0 // First card is always default
      };
      
      console.log('💳 Adding payment method to profile:', paymentData);
      
      // Save to profile using profileService
      const response = await profileService.updatePaymentMethods([...paymentMethods, paymentData]);
      console.log('✅ Payment method saved:', response);
      
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
      
      toast.success('Payment method added successfully!');
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error(error.response?.data?.message || 'Failed to add payment method');
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

  // Load saved addresses and pre-populate delivery form
  const loadSavedAddresses = async () => {
    try {
      if (!userProfile || !userProfile.addresses || userProfile.addresses.length === 0) {
        console.log('📭 No saved addresses found for user');
        return;
      }

      // Find the default address or use the first address
      const defaultAddress = userProfile.addresses.find(addr => addr.isDefault) || userProfile.addresses[0];
      
      if (defaultAddress) {
        console.log('🏠 Loading saved address:', defaultAddress);
        
        // Pre-populate delivery form with saved address
        setDeliveryForm(prev => ({
          ...prev,
          firstName: userProfile.firstName || prev.firstName,
          lastName: userProfile.lastName || prev.lastName,
          email: userProfile.email || prev.email,
          phone: userProfile.phone || prev.phone,
          // Set address in the nested structure that DeliveryInformation expects
          deliveryAddress: {
            street: defaultAddress.street || '',
            city: defaultAddress.city || '',
            state: defaultAddress.state || '',
            zipCode: defaultAddress.zipCode || defaultAddress.postalCode || '',
            country: defaultAddress.country || 'Canada'
          }
        }));

        // Set the selected address
        setSelectedAddress(defaultAddress);
        
        toast.success('Saved address loaded', { duration: 2000 });
      }
    } catch (error) {
      console.error('❌ Error loading saved addresses:', error);
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
    if (field === 'email') {
      // Helper function to validate email format
      const isValidEmailFormat = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      // Only validate if email format is valid
      if (value && isValidEmailFormat(value)) {
        // Skip if this email was already validated
        if (value === lastValidatedEmail) {
          return;
        }

        // Clear any existing timeout
        if (window.emailCheckTimeout) {
          clearTimeout(window.emailCheckTimeout);
        }
        
        // Set a new timeout to debounce the API call
        window.emailCheckTimeout = setTimeout(async () => {
        try {
          const result = await guestService.checkExistingUser(value);
          setLastValidatedEmail(value);
          
          if (result.exists) {
            setExistingUser(result.user);
            
            if (result.isPatron) {
              // User is a registered patron - ask them to login
              toast.error(
                `This email is registered as a patron account. Please log in to continue with your order.`,
                {
                  duration: 5000,
                  icon: '🔐',
                  style: {
                    background: '#fef2f2',
                    color: '#991b1b',
                  },
                }
              );
            } else if (result.isGuest) {
              // User is a guest - welcome them back
              toast.success(
                `Welcome back, ${result.user.firstName || 'guest'}! We found your previous order information.`,
                {
                  duration: 4000,
                  icon: '👋',
                  style: {
                    background: '#f0fdf4',
                    color: '#166534',
                  },
                }
              );
            }
          } else {
            // No existing user
            setExistingUser(null);
          }
        } catch (error) {
          // User not found, clear existing user state
          setExistingUser(null);
          console.error('Error checking user:', error);
        }
        }, 800); // Wait 800ms after user stops typing
      } else if (value !== lastValidatedEmail) {
        // Reset validation when email changes but is incomplete
        setExistingUser(null);
      }
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
    if (checkoutStep === 'delivery') {
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
      
      if (isAddressRequired() && !selectedAddress && 
          (!deliveryForm.street && !deliveryForm.deliveryAddress?.street)) {
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
        // For guests, check deliveryForm.deliveryAddress (nested object from DeliveryInformation)
        // For authenticated users, use selectedAddress or deliveryForm
        const addressToValidate = isGuest 
          ? (deliveryForm.deliveryAddress || deliveryForm)
          : (selectedAddress || deliveryForm);
        
        const hasCompleteAddress = addressToValidate && 
          addressToValidate.street && 
          addressToValidate.city && 
          addressToValidate.state && 
          addressToValidate.zipCode;
        
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
      // Go back to shopping (close checkout)
      navigate(-1);
    } else if (checkoutStep === 'payment') {
      setCheckoutStep('delivery');
    } else if (checkoutStep === 'confirmation') {
      setCheckoutStep('payment');
    }
  };

  // Create payment intent
  const createPaymentIntent = async () => {
    try {
      setIsCreatingPaymentIntent(true);

      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          productType: item.productType || 'ready_to_ship'
        })),
        deliveryAddress: selectedAddress || deliveryForm,
        deliveryInstructions: deliveryForm.instructions || '',
        deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
        pickupTimeWindows: selectedPickupTimes,
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

      let response;
      if (isGuest) {
        // Add guest info for guest payment intent
        orderData.guestInfo = {
          firstName: deliveryForm.firstName || 'Guest',
          lastName: deliveryForm.lastName || 'User',
          email: deliveryForm.email || '',
          phone: deliveryForm.phone || ''
        };
        response = await orderPaymentService.createGuestPaymentIntent(orderData);
      } else {
        response = await orderPaymentService.createPaymentIntent(orderData);
      }

      if (response.success) {
        setPaymentIntent(response.data);
        setCheckoutStep('payment');
        toast.success('Payment form ready');
      } else {
        throw new Error(response.message || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setIsCreatingPaymentIntent(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = (orderData) => {
    console.log('Payment successful, order created:', orderData);
    // Clear cart
    cartService.clearCart(currentUserId);
    // Navigate to order confirmation
    navigate('/order-confirmation', { 
      state: { 
        orderData: orderData,
        message: 'Order placed successfully!' 
      } 
    });
  };

  // Handle payment error
  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    toast.error('Payment failed. Please try again.');
  };

  // Handle checkout - go directly to Stripe payment
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

      if (isAddressRequired() && !selectedAddress && 
          (!deliveryForm.street && !deliveryForm.deliveryAddress?.street)) {
        toast.error('Please provide delivery address');
        return;
      }

      // Create payment intent and go directly to Stripe payment page
      await createPaymentIntent();
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

      console.log('🚀 Creating order for authenticated user...');
      
      // Create order using authenticated endpoint
      const result = await orderService.createOrder(orderData);
      
      // Note: Backend already sends order confirmation emails and notifications
      // No need to send from frontend to avoid duplicates
      
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
      
      // Create or get guest profile (backend handles checking if user exists)
      let guestToken = localStorage.getItem('token');
      let guestUserId = null;
      
      // Create/get guest profile - backend will reuse existing if email exists
      console.log('🔍 Creating or getting guest profile...');
      
      const guestInfo = {
        firstName: deliveryForm.firstName || 'Guest',
        lastName: deliveryForm.lastName || 'User',
        email: deliveryForm.email,
        phone: deliveryForm.phone || ''
      };
      
      try {
        const guestResponse = await guestService.createGuestProfile(guestInfo);
        guestToken = guestResponse.token;
        guestUserId = guestResponse.user.id || guestResponse.user._id?.toString();
        
        console.log('✅ Guest profile ready:', guestResponse.user);
        
        // Store the guest token
        localStorage.setItem('token', guestToken);
        
        // Update local state
        setCurrentUserId(guestUserId);
        setIsGuest(true);
        
        // Show notification if reusing existing account
        if (guestResponse.message.includes('existing')) {
          toast.success(`Welcome back! Using your existing account.`);
        }
      } catch (guestError) {
        console.error('❌ Error with guest profile:', guestError);
        toast.error('Failed to create guest profile. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Generate unique guest ID for this order
      const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Prepare order data for guest
      // Extract ONLY the address fields (not personal info like firstName, email, etc)
      const guestDeliveryAddress = isAddressRequired() 
        ? (deliveryForm.deliveryAddress || {
            street: deliveryForm.street || '',
            city: deliveryForm.city || '',
            state: deliveryForm.state || '',
            zipCode: deliveryForm.zipCode || '',
            country: deliveryForm.country || 'Canada',
            instructions: deliveryForm.instructions || ''
          })
        : undefined;
      
      const orderData = {
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          productType: item.productType || 'ready_to_ship'
        })),
        deliveryAddress: guestDeliveryAddress,
        deliveryInstructions: isAddressRequired() 
          ? (deliveryForm.deliveryAddress?.instructions || deliveryForm.instructions || '') 
          : 'Customer will pickup at artisan location',
        deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
        pickupTimeWindows: selectedPickupTimes, // Include pickup time selections
        paymentMethod: guestPaymentForm.paymentMethod,
        paymentDetails: {
          cardNumber: guestPaymentForm.cardNumber,
          expiryDate: guestPaymentForm.expiryDate,
          cvv: guestPaymentForm.cvv,
          cardholderName: guestPaymentForm.cardholderName,
          cardType: guestPaymentForm.paymentMethod === 'credit_card' ? 'credit' : 'debit',
          zipCode: guestPaymentForm.zipCode
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

      console.log('🚀 Creating guest order...');
      console.log('📍 Delivery address being sent:', orderData.deliveryAddress);
      
      // Create guest order using the guest endpoint
      const result = await orderService.createGuestOrder(orderData);
      
      // Note: Backend already sends guest order confirmation email
      // No need to send from frontend to avoid duplicates
      
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

  // Load saved addresses and pre-populate delivery form when user profile is loaded
  useEffect(() => {
    if (userProfile && !isGuest) {
      loadSavedAddresses();
    }
  }, [userProfile, isGuest]);

  // Set default payment method when payment methods are loaded
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod && !isGuest) {
      const defaultMethod = paymentMethods.find(method => method.isDefault) || paymentMethods[0];
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
        console.log('💳 Auto-selected default payment method:', defaultMethod);
        toast.success('Saved payment method loaded', { duration: 2000 });
      }
    }
  }, [paymentMethods, selectedPaymentMethod, isGuest]);


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
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-amber-200 rounded-2xl w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 card"></div>
                ))}
              </div>
              <div className="lg:col-span-1">
                <div className="h-64 card"></div>
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
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg animate-bounce">
              <ShoppingBagIcon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-stone-800 mb-4 animate-fade-in font-display">Your Collection Awaits</h1>
            <p className="text-stone-600 text-lg mb-8 animate-fade-in-delay">Start exploring our local artisans and discover their unique creations</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary text-lg px-8 py-4 animate-fade-in-delay-2"
            >
              Discover Artisans
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render delivery information page
  if (checkoutStep === 'delivery') {
    return (
      <DeliveryInformation
        cartByArtisan={currentCheckoutArtisan ? { [currentCheckoutArtisan]: cartByArtisan[currentCheckoutArtisan] } : {}}
        deliveryOptions={deliveryOptions}
        selectedDeliveryMethods={selectedDeliveryMethods}
        onDeliveryMethodChange={handleDeliveryMethodChange}
        deliveryForm={deliveryForm}
        onDeliveryFormChange={handleDeliveryFormChange}
        onContinue={handleNextStep}
        onBack={handlePreviousStep}
        isGuest={isGuest}
        user={user}
        userLocation={userLocation}
        deliveryValidationResults={deliveryValidationResults}
        pickupTimeWindows={pickupTimeWindows}
        selectedPickupTimes={selectedPickupTimes}
        onPickupTimeChange={handlePickupTimeChange}
        enhancedProducts={enhancedProducts}
      />
    );
  }

  // Render payment page
  if (checkoutStep === 'payment') {
    // Show loading while creating payment intent
    if (isCreatingPaymentIntent) {
      return (
        <div className="min-h-screen bg-background py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-semibold text-stone-800 mb-2">Preparing Payment</h2>
              <p className="text-stone-600">Setting up secure payment processing...</p>
            </div>
          </div>
        </div>
      );
    }

    // Show Stripe payment form
    if (paymentIntent && stripePromise) {
      return (
        <div className="min-h-screen bg-background py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <button
              onClick={() => setCheckoutStep('delivery')}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors group"
            >
              <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Delivery</span>
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-stone-800 font-display mb-3">Complete Your Payment</h1>
              <p className="text-xl text-stone-600">Secure payment processing with Stripe</p>
            </div>

            {/* Stripe Payment Component */}
            <Elements stripe={stripePromise}>
              <StripeOrderPayment
                clientSecret={paymentIntent.clientSecret}
                amount={paymentIntent.amount}
                currency={paymentIntent.currency}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                orderData={{
                  items: cart.map(item => ({
                    productId: item._id,
                    quantity: item.quantity,
                    productType: item.productType || 'ready_to_ship'
                  })),
                  deliveryAddress: selectedAddress || deliveryForm,
                  deliveryInstructions: deliveryForm.instructions || '',
                  deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
                  pickupTimeWindows: selectedPickupTimes,
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
                  guestInfo: isGuest ? {
                    firstName: deliveryForm.firstName || 'Guest',
                    lastName: deliveryForm.lastName || 'User',
                    email: deliveryForm.email || '',
                    phone: deliveryForm.phone || ''
                  } : null
                }}
                isGuest={isGuest}
                savedPaymentMethods={userProfile?.paymentMethods || []}
              />
            </Elements>
          </div>
        </div>
      );
    }

    // Fallback to old payment form if Stripe is not available
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => setCheckoutStep('delivery')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-6 transition-colors group"
          >
            <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Delivery</span>
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-800 mb-2 font-display">Payment Information</h1>
            <p className="text-stone-600">Complete your order with secure payment</p>
          </div>
          
          <div className="card p-6">
            {isGuest ? (
              // Guest Payment Method Selection
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-800 mb-6 font-display">Select Payment Method</h2>
                
                {/* Payment Method Options for Guests */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <label className={`flex items-center space-x-4 p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                    guestPaymentForm.paymentMethod === 'credit_card' 
                      ? 'border-amber-500 bg-amber-50' 
                      : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}>
                    <input
                      type="radio"
                      name="guest-payment-method"
                      value="credit_card"
                      checked={guestPaymentForm.paymentMethod === 'credit_card'}
                      onChange={(e) => handleGuestPaymentFormChange('paymentMethod', e.target.value)}
                      className="text-amber-600 w-5 h-5"
                    />
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="w-6 h-6 text-amber-600" />
                      <div>
                        <span className="text-stone-800 font-medium">Credit Card</span>
                        <p className="text-sm text-stone-600">Visa, Mastercard, Amex</p>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center space-x-4 p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                    guestPaymentForm.paymentMethod === 'debit_card' 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}>
                    <input
                      type="radio"
                      name="guest-payment-method"
                      value="debit_card"
                      checked={guestPaymentForm.paymentMethod === 'debit_card'}
                      onChange={(e) => handleGuestPaymentFormChange('paymentMethod', e.target.value)}
                      className="text-emerald-600 w-5 h-5"
                    />
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="w-6 h-6 text-emerald-600" />
                      <div>
                        <span className="text-stone-800 font-medium">Debit Card</span>
                        <p className="text-sm text-stone-600">Direct bank transfer</p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Card Details Form */}
                {guestPaymentForm.paymentMethod && (
                  <div className="border-t border-stone-200 pt-6">
                    <h3 className="text-lg font-semibold text-stone-800 mb-4 font-display">Card Details</h3>
                    <div className="space-y-4">
                      {/* Card Number */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          value={guestPaymentForm.cardNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                            handleGuestPaymentFormChange('cardNumber', formatted);
                          }}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 text-lg transition-all duration-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Expiry Date */}
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-2">
                            Expiry Date *
                          </label>
                          <input
                            type="text"
                            value={guestPaymentForm.expiryDate}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 2) {
                                value = value.slice(0, 2) + '/' + value.slice(2, 4);
                              }
                              handleGuestPaymentFormChange('expiryDate', value);
                            }}
                            placeholder="MM/YY"
                            maxLength="5"
                            className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-100 focus:border-amber-400 text-lg transition-all duration-200"
                          />
                        </div>

                        {/* CVV */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            value={guestPaymentForm.cvv}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                              handleGuestPaymentFormChange('cvv', value);
                            }}
                            placeholder="123"
                            maxLength="4"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                          />
                        </div>

                        {/* Cardholder Name */}
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            value={guestPaymentForm.zipCode || ''}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase().slice(0, 7);
                              handleGuestPaymentFormChange('zipCode', value);
                            }}
                            placeholder="A1A 1A1"
                            maxLength="7"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                          />
                        </div>
                      </div>

                      {/* Cardholder Name - Full Width */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          value={guestPaymentForm.cardholderName}
                          onChange={(e) => handleGuestPaymentFormChange('cardholderName', e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                        />
                      </div>

                      {/* Security Notice */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">Secure Payment</p>
                          <p>Your payment information is encrypted and secure. We never store your full card details.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Authenticated user payment - show saved payment methods
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-stone-800 font-display">Payment Method</h2>
                  
                  {/* Saved Payment Method Indicator */}
                  {selectedPaymentMethod && selectedPaymentMethod !== 'new' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                      <CheckCircleIcon className="w-4 h-4" />
                      Saved Method Selected
                    </div>
                  )}
                </div>
                
                {paymentLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin"></div>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {/* Saved Payment Methods */}
                    {paymentMethods.map((method, index) => {
                      const methodId = method._id || `${method.brand}-${method.last4}-${index}`;
                      const selectedId = selectedPaymentMethod?._id || (selectedPaymentMethod ? `${selectedPaymentMethod.brand}-${selectedPaymentMethod.last4}-${paymentMethods.indexOf(selectedPaymentMethod)}` : null);
                      const isSelected = selectedPaymentMethod !== 'new' && methodId === selectedId;
                      
                      return (
                      <label
                        key={methodId}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="radio"
                            name="payment-method"
                            value={methodId}
                            checked={isSelected}
                            onChange={() => {
                              console.log('💳 Payment method selected:', method);
                              console.log('💳 Method ID:', methodId);
                              console.log('💳 Brand:', method.brand);
                              console.log('💳 Last4:', method.last4);
                              setSelectedPaymentMethod(method);
                              setShowAddPaymentForm(false);
                            }}
                            className="w-5 h-5 text-orange-600"
                          />
                          <CreditCardIcon className="w-6 h-6 text-gray-600" />
                          <div>
                            <div className="font-semibold text-gray-900 capitalize">
                              {method.brand || method.cardType || 'Card'} •••• {method.last4 || method.last4Digits || '****'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Expires {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                            </div>
                          </div>
                        </div>
                        {method.isDefault && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Default
                          </span>
                        )}
                      </label>
                    );
                    })}
                    
                    {/* Add New Payment Method Option */}
                    <label
                      className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPaymentMethod === 'new'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="payment-method"
                          value="new"
                          checked={selectedPaymentMethod === 'new'}
                          onChange={() => {
                            console.log('💳 Selected: Add New Payment Method');
                            setSelectedPaymentMethod('new');
                            setShowAddPaymentForm(true);
                          }}
                          className="w-5 h-5 text-orange-600"
                        />
                        <PlusIcon className="w-6 h-6 text-orange-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            Add New Payment Method
                          </div>
                          <div className="text-sm text-gray-600">
                            Use a different card
                          </div>
                        </div>
                      </div>
                    </label>
                    
                    {/* Add New Payment Method Form - Only shows when "new" is selected */}
                    {selectedPaymentMethod === 'new' && showAddPaymentForm && (
                      <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Add New Card</h3>
                          <button
                            onClick={() => setShowAddPaymentForm(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <span className="text-2xl">×</span>
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Card Number */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Card Number *
                            </label>
                            <input
                              type="text"
                              value={newPaymentForm.cardNumber}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
                                handlePaymentFormChange('cardNumber', formatted);
                              }}
                              placeholder="1234 5678 9012 3456"
                              maxLength="23"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                            />
                            {paymentFormErrors.cardNumber && (
                              <p className="text-red-600 text-sm mt-1">{paymentFormErrors.cardNumber}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Expiry Month */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expiry Month *
                              </label>
                              <input
                                type="number"
                                value={newPaymentForm.expiryMonth}
                                onChange={(e) => handlePaymentFormChange('expiryMonth', e.target.value)}
                                placeholder="MM"
                                min="1"
                                max="12"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            
                            {/* Expiry Year */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expiry Year *
                              </label>
                              <input
                                type="number"
                                value={newPaymentForm.expiryYear}
                                onChange={(e) => handlePaymentFormChange('expiryYear', e.target.value)}
                                placeholder="YYYY"
                                min={new Date().getFullYear()}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* CVV */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                CVV *
                              </label>
                              <input
                                type="text"
                                value={newPaymentForm.cvv}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                  handlePaymentFormChange('cvv', value);
                                }}
                                placeholder="123"
                                maxLength="4"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            
                            {/* Cardholder Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cardholder Name *
                              </label>
                              <input
                                type="text"
                                value={newPaymentForm.cardholderName}
                                onChange={(e) => handlePaymentFormChange('cardholderName', e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                          </div>
                          
                          {/* Save and Cancel Buttons */}
                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={handlePaymentFormSubmit}
                              disabled={paymentLoading}
                              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold"
                            >
                              {paymentLoading ? 'Saving...' : 'Save & Use This Card'}
                            </button>
                            <button
                              onClick={() => {
                                setShowAddPaymentForm(false);
                                setPaymentFormErrors({});
                              }}
                              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                          
                          {/* Security Notice */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 mt-4">
                            <ShieldCheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-800">
                              <p className="font-semibold">Secure Payment</p>
                              <p>Only last 4 digits will be stored. Full card number never saved.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No saved payment methods</p>
                    <button
                      onClick={() => setShowAddPaymentForm(true)}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all"
                    >
                      Add Payment Method
                    </button>
                  </div>
                )}
              </div>
            )}
                </div>
                
          {/* Place Order Button */}
          <div className="flex justify-end mt-8">
                  <button
              onClick={async () => {
                console.log('🔍 Button clicked - isGuest:', isGuest);
                console.log('🔍 selectedPaymentMethod:', selectedPaymentMethod);
                console.log('🔍 Button should be enabled:', !isGuest && !!selectedPaymentMethod);
                
                // Process the order using new Stripe payment flow
                await handleCheckout();
              }}
              disabled={isLoading || isCreatingPaymentIntent}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center gap-2 ${
                !isLoading && !isCreatingPaymentIntent
                  ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
                    {isLoading || isCreatingPaymentIntent ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isCreatingPaymentIntent ? 'Preparing Payment...' : 'Processing Order...'}
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="w-5 h-5" />
                        Proceed to Payment
                      </>
                    )}
              </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Cart;
