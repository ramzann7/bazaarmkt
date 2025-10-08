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

// Initialize Stripe with Canadian locale
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
      locale: 'en-CA', // Canadian English locale for postal code format
      stripeAccount: undefined, // Use default account
    })
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



  // Handle payment form submission


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
  
      
      // Get current user info
      const token = localStorage.getItem('token');
      let userId = null;
      let guestStatus = true;
      
      if (token) {
        const tokenData = parseToken(token);
        userId = tokenData.userId;
        guestStatus = tokenData.isGuest;
        
        
        // Only set currentUserId if it's not already set to avoid race conditions
        if (!currentUserId) {
          setCurrentUserId(userId);
        }
        if (!isGuest) {
          setIsGuest(guestStatus);
        }
      } else {
      }
      
      
      // Load cart data from localStorage
      const cartData = await cartService.getCart(userId);
      
      if (!cartData || cartData.length === 0) {
        setCart([]);
        setCartByArtisan({});
        return;
      }
      
      // Load cart by artisan (this fetches fresh artisan data)
      const cartByArtisanData = await cartService.getCartByArtisan(userId);
      
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
        // Load profile for better performance
        loadUserProfile().catch(error => {
          console.error('❌ Error loading profile:', error);
        });
      }
    } else {
      // No token means guest user
      setCurrentUserId(null);
      setIsGuest(true);
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
      
      // Create payment intent and go to payment step
      await handleCheckout();
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
        items: cart.map(item => {
          // If _id is the artisan ID, we need to find the actual product ID
          // For now, let's use the _id but this needs to be fixed in the cart service
          let productId = item._id;
          
          // If the _id matches the artisan ID, we have a problem
          if (item.artisan && (item._id === item.artisan._id || item._id === item.artisan)) {
            // We need to find the actual product ID - this should be fixed in cart service
            productId = item.productId || item._id; // fallback for now
          }
          
          return {
            productId: productId,
            quantity: item.quantity,
            productType: item.productType || 'ready_to_ship'
          };
        }),
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
      
      // Handle specific error types
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;
        
        // Check for inventory-related errors
        if (errorMessage.includes('Insufficient inventory')) {
          toast.error(`❌ ${errorMessage}. Please adjust your cart quantities.`);
        } else if (errorMessage.includes('Product not found')) {
          toast.error('❌ Some items in your cart are no longer available. Please refresh your cart.');
        } else {
          toast.error(`❌ ${errorMessage}`);
        }
      } else {
        toast.error('Failed to initialize payment. Please try again.');
      }
    } finally {
      setIsCreatingPaymentIntent(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (orderData) => {
    console.log('Payment successful, order created:', orderData);
    
    // Set checkout step to success immediately to prevent showing error page
    setCheckoutStep('success');
      
    // Send order completion notification
    try {
      const userInfo = {
        id: user?.id || currentUserId || userProfile?.id,
        email: isGuest ? deliveryForm.email : (user?.email || userProfile?.email),
        phone: isGuest ? deliveryForm.phone : (user?.phone || userProfile?.phone),
        isGuest: isGuest,
        firstName: isGuest ? deliveryForm.firstName : (user?.firstName || userProfile?.firstName),
        lastName: isGuest ? deliveryForm.lastName : (user?.lastName || userProfile?.lastName)
      };
      
      console.log('📧 Notification userInfo:', userInfo);
      console.log('📧 Order data for notification:', orderData);
      
      if (userInfo.email) {
        await notificationService.sendOrderCompletionNotification(orderData, userInfo);
      } else {
        console.log('⚠️ Skipping notification - no email available');
      }
    } catch (notificationError) {
      console.error('❌ Error sending order completion notification:', notificationError);
      // Don't fail the order flow if notification fails
    }

    // Trigger immediate toast notification for order creation
    try {
      const { orderNotificationService } = await import('../services/orderNotificationService');
      const userRole = isGuest ? 'guest' : (userProfile?.role || 'patron');
      orderNotificationService.triggerOrderCreatedNotification(orderData, userRole);
    } catch (toastError) {
      console.error('❌ Error triggering toast notification:', toastError);
      // Don't fail the order flow if toast notification fails
    }
      
    // Clear cart
    cartService.clearCart(currentUserId);
    
    // Navigate to order confirmation with the correct data structure
    const orderWithDeliveryInfo = {
      ...orderData,
      deliveryAddress: selectedAddress || deliveryForm,
      deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
      deliveryInstructions: deliveryForm.instructions || '',
      pickupTimeWindows: selectedPickupTimes,
      guestInfo: isGuest ? {
        firstName: deliveryForm.firstName || 'Guest',
        lastName: deliveryForm.lastName || 'User',
        email: deliveryForm.email || '',
        phone: deliveryForm.phone || ''
      } : null
    };

    navigate('/order-confirmation', { 
      state: { 
        orders: [orderWithDeliveryInfo], // Wrap single order in array for OrderConfirmation component
        message: 'Order placed successfully!',
        orderSummary: {
          total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
          items: cart
        },
        guestInfo: isGuest ? {
          firstName: deliveryForm.firstName || 'Guest',
          lastName: deliveryForm.lastName || 'User',
          email: deliveryForm.email || '',
          phone: deliveryForm.phone || ''
        } : null,
        selectedPickupTimes: selectedPickupTimes,
        isPickupOrder: Object.values(selectedDeliveryMethods)[0] === 'pickup'
      } 
    });
    
    // Clear payment intent after navigation to prevent reuse
    setPaymentIntent(null);
  };

  // Handle payment error
  const handlePaymentError = (error) => {
    console.error('Payment error details:', {
      code: error.code,
      type: error.type,
      message: error.message,
      fullError: error
    });
    
    // Show user-friendly error message based on error type
    if (error.code === 'payment_intent_unexpected_state') {
      toast.error('Payment session expired. Please refresh the page and try again.');
      // Clear payment intent and force refresh for unexpected state errors
      setPaymentIntent(null);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else if (error.code === 'incomplete_cvc' || error.type === 'validation_error') {
      // Don't clear payment intent for validation errors - just show the error
      toast.error(error.message || 'Please check your card details and try again.');
    } else {
      // For other errors, show the error but don't clear payment intent immediately
      // Let the user try again with the same payment intent
      toast.error(error.message || 'Payment failed. Please try again.');
      
      // Only clear payment intent for specific critical errors
      if (error.code === 'card_declined' || error.code === 'expired_card') {
        // These are terminal errors, clear the payment intent
        setPaymentIntent(null);
      }
    }
  };

  // Validate cart inventory before checkout
  const validateCartInventory = async () => {
    try {
      // Check if we need to validate inventory for any items
      const itemsToValidate = cart.map(item => ({
        productId: item._id,
        quantity: item.quantity,
        name: item.name
      }));

      if (itemsToValidate.length === 0) {
        return { isValid: true };
      }

      // For now, we'll let the payment intent creation handle inventory validation
      // In the future, we could add a dedicated inventory validation endpoint
      return { isValid: true };
    } catch (error) {
      console.error('❌ Error validating cart inventory:', error);
      return { isValid: false, error: 'Failed to validate cart inventory' };
    }
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
          toast.error('Please select a pickup time for all pickup orders');
          return;
        }
      }

      if (isAddressRequired() && !selectedAddress && 
      (!deliveryForm.street && !deliveryForm.deliveryAddress?.street)) {
        toast.error('Please provide delivery address');
        return;
      }

      // Validate cart inventory
      const inventoryValidation = await validateCartInventory();
      if (!inventoryValidation.isValid) {
        toast.error(inventoryValidation.error || 'Cart validation failed');
        return;
      }
      
      // Create payment intent and go directly to Stripe payment page
      await createPaymentIntent();
    } catch (error) {
      console.error('❌ Error during checkout:', error);
      toast.error('Checkout failed');
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
      // Load profile for better performance
      loadUserProfile().catch(error => {
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
            <Elements stripe={stripePromise} options={{ locale: 'en-CA' }}>
              <StripeOrderPayment
                clientSecret={paymentIntent.clientSecret}
                amount={paymentIntent.amount}
                currency={paymentIntent.currency}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                orderData={{
                  items: cart.map(item => {
                    // Use the same logic as above for consistency
                    let productId = item._id;
                    if (item.artisan && (item._id === item.artisan._id || item._id === item.artisan)) {
                      productId = item.productId || item._id; // fallback for now
                    }
                    return {
                      productId: productId,
                      quantity: item.quantity,
                      productType: item.productType || 'ready_to_ship'
                    };
                  }),
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

    // Fallback if Stripe is not available
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
            <h1 className="text-2xl font-bold text-stone-800 mb-2 font-display">Payment System</h1>
            <p className="text-stone-600">Secure payment processing</p>
                          </div>
                          
          <div className="card p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCardIcon className="w-8 h-8 text-red-600" />
                            </div>
              <h2 className="text-xl font-semibold text-stone-800 mb-2 font-display">Payment System Configuration Error</h2>
              <p className="text-stone-600 mb-4">
                Stripe payment processing is not properly configured.
              </p>
              <div className="text-sm text-stone-500 space-y-2">
                <p><strong>Debug Information:</strong></p>
                <p>• Payment Intent: {paymentIntent ? '✅ Available' : '❌ Missing'}</p>
                <p>• Stripe Promise: {stripePromise ? '✅ Available' : '❌ Missing'}</p>
                <p>• Stripe Key: {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'}</p>
                          </div>
              <p className="text-sm text-stone-500 mt-4">
                Please contact support or try again later.
              </p>
                        </div>
                      </div>
        </div>
      </div>
    );
  }
  
  // Render success state (brief transition before navigation)
  if (checkoutStep === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2 font-display">Payment Successful!</h2>
          <p className="text-stone-600 mb-4">Redirecting to order confirmation...</p>
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return null;
};

export default Cart;
