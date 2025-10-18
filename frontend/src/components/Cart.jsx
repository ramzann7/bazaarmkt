import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  TruckIcon, 
  CreditCardIcon,
  MapPinIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
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
import walletService from '../services/walletService';
import { getImageUrl } from '../utils/imageUtils.js';
import DeliveryInformation from './DeliveryInformation.jsx';
import StripeOrderPayment from './StripeOrderPayment.jsx';
import WalletTopUp from './WalletTopUp.jsx';

// Initialize Stripe with Canadian locale
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
      locale: 'en-CA', // Canadian English locale for postal code format
      stripeAccount: undefined, // Use default account
    })
  : null;

// Wallet Payment Section Component (Artisan Only)
const WalletPaymentSection = ({ totalAmount, onTopUpClick, onBalanceLoaded, externalBalance = null, userRole = null }) => {
  const [walletBalance, setWalletBalance] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  

  // Use external balance if provided and valid, otherwise fetch
  React.useEffect(() => {
    // Only fetch wallet balance for artisans
    if (userRole !== 'artisan') {
      setWalletBalance(0);
      setLoading(false);
      return;
    }

    // Only use externalBalance if it's been actually loaded (not null or 0 from initial state)
    // We consider it loaded if it's a positive number OR if it's explicitly 0 after being loaded
    const hasValidExternalBalance = externalBalance !== null && externalBalance > 0;
    
    if (hasValidExternalBalance) {
      setWalletBalance(externalBalance);
      setLoading(false);
      return;
    }

    // Always fetch fresh balance for artisans
    const fetchBalance = async () => {
      try {
        setLoading(true);
        const response = await walletService.getWalletBalance();
        
        const balance = response.success ? (response.data?.balance || 0) : 0;
        
        setWalletBalance(balance);
        
        // Notify parent of loaded balance
        if (onBalanceLoaded) {
          onBalanceLoaded(balance);
        }
      } catch (error) {
        console.error('❌ Error fetching wallet balance:', error);
        setWalletBalance(0);
        if (onBalanceLoaded) {
          onBalanceLoaded(0);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [onBalanceLoaded, externalBalance, userRole]);

  const hasSufficientFunds = walletBalance !== null && walletBalance >= totalAmount;
  const shortfall = walletBalance !== null ? Math.max(0, totalAmount - walletBalance) : 0;

  return (
    <div className={`rounded-xl shadow-sm border-2 p-6 mb-6 ${
      hasSufficientFunds 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
        : 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          hasSufficientFunds ? 'bg-green-600' : 'bg-purple-600'
        }`}>
          <CreditCardIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-3 ${
            hasSufficientFunds ? 'text-green-900' : 'text-purple-900'
          }`}>
            Payment Method: Wallet
          </h3>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading wallet balance...</span>
            </div>
          ) : (
            <>
              {/* Wallet Balance Display */}
              <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Current Balance</span>
                  <span className={`text-2xl font-bold ${
                    hasSufficientFunds ? 'text-green-600' : 'text-purple-600'
                  }`}>
                    ${walletBalance !== null ? walletBalance.toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Order Total</span>
                  <span className="font-semibold text-gray-800">${totalAmount.toFixed(2)}</span>
                </div>
                {!hasSufficientFunds && shortfall > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-red-600 font-medium">Amount Needed</span>
                      <span className="font-bold text-red-600">${shortfall.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message & Actions */}
              {hasSufficientFunds ? (
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="font-medium">✓ Sufficient funds available</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-800 text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span>Insufficient funds to complete this purchase</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔵 Top Up Wallet button clicked');
                      if (onTopUpClick) {
                        onTopUpClick();
                      } else {
                        console.error('❌ onTopUpClick is not defined!');
                      }
                    }}
                    type="button"
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Top Up Wallet</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Core cart state
  const [cart, setCart] = useState([]);
  const [cartByArtisan, setCartByArtisan] = useState({});
  const [checkoutStep, setCheckoutStep] = useState('checkout'); // Single checkout page with collapsible sections
  const [currentCheckoutArtisan, setCurrentCheckoutArtisan] = useState(null);
  const [processedArtisans, setProcessedArtisans] = useState([]);
  
  // Collapsible section states
  const [deliverySectionExpanded, setDeliverySectionExpanded] = useState(true);
  const [paymentSectionExpanded, setPaymentSectionExpanded] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  
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
  const [useSavedAddress, setUseSavedAddress] = useState(true); // Track if user wants to use saved address
  const [newAddressForm, setNewAddressForm] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Canada'
  }); // Separate state for new address entry
  
  // Loading states
  const [cartLoading, setCartLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [deliveryOptionsLoading, setDeliveryOptionsLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Payment state
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [paymentOrderData, setPaymentOrderData] = useState(null); // Store order data for payment confirmation
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  
  // Wallet top-up state
  const [showWalletTopUp, setShowWalletTopUp] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState(null);
  const [currentWalletBalance, setCurrentWalletBalance] = useState(null); // Initialize to null, will be loaded when needed

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

  const calculateUberDirectFee = async (artisanId, addressOverride = null) => {
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

      // Get delivery address based on user choice
      let deliveryAddr = addressOverride;
      
      if (!deliveryAddr || !deliveryAddr.street) {
        if (useSavedAddress) {
          // Use saved address: selectedAddress or deliveryForm.deliveryAddress
          deliveryAddr = selectedAddress || deliveryForm.deliveryAddress || deliveryForm;
        } else {
          // Use new address form (separate from saved address)
          deliveryAddr = newAddressForm.street ? newAddressForm : (deliveryForm.deliveryAddress || deliveryForm);
        }
      }
      
      // Verify we have a complete address
      if (!deliveryAddr || !deliveryAddr.street) {
        console.log('⏳ No complete address available for Uber quote', {
          addressOverride: !!addressOverride,
          selectedAddress: !!selectedAddress,
          deliveryFormDeliveryAddress: !!deliveryForm.deliveryAddress,
          deliveryFormStreet: !!deliveryForm.street
        });
        return 15;
      }

      console.log('🚛 Using address for Uber quote:', {
        street: deliveryAddr.street,
        city: deliveryAddr.city,
        source: addressOverride ? 'parameter' : (selectedAddress ? 'selectedAddress' : 'deliveryForm')
      });

      // Prepare locations for Uber Direct API
      const pickupLocation = {
        address: `${artisanData.artisan.address?.street || ''}, ${artisanData.artisan.address?.city || ''}, ${artisanData.artisan.address?.state || ''}, ${artisanData.artisan.address?.country || 'Canada'}`,
        latitude: artisanData.artisan.coordinates?.latitude || artisanData.artisan.address?.latitude,
        longitude: artisanData.artisan.coordinates?.longitude || artisanData.artisan.address?.longitude,
        phone: artisanData.artisan.phone || '',
        contactName: artisanData.artisan.artisanName
      };

      const dropoffLocation = {
        address: `${deliveryAddr.street}, ${deliveryAddr.city}, ${deliveryAddr.state}, ${deliveryAddr.country || 'Canada'}`,
        latitude: deliveryAddr.latitude || null, // Use if available
        longitude: deliveryAddr.longitude || null,
        phone: deliveryAddr.phone || deliveryForm.phone || '',
        contactName: `${deliveryForm.firstName || deliveryAddr.firstName || ''} ${deliveryForm.lastName || deliveryAddr.lastName || ''}`.trim()
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

      // Get quote from Uber Direct with 20% buffer for surge protection
      const quote = await uberDirectService.getDeliveryQuoteWithBuffer(
        pickupLocation,
        dropoffLocation,
        packageDetails,
        20 // 20% buffer
      );

      if (quote.success) {
        setUberDirectQuotes(prev => ({
          ...prev,
          [artisanId]: {
            estimatedFee: parseFloat(quote.estimatedFee),
            buffer: parseFloat(quote.buffer),
            bufferPercentage: quote.bufferPercentage,
            fee: parseFloat(quote.chargedAmount), // This is what user pays (estimate + buffer)
            duration: quote.duration,
            pickup_eta: quote.pickupEta,
            dropoff_eta: quote.dropoffEta,
            quote_id: quote.quoteId,
            expires_at: quote.expiresAt,
            explanation: quote.explanation
          }
        }));
        return parseFloat(quote.chargedAmount); // Return charged amount (with buffer)
      } else if (quote.fallback) {
        setUberDirectQuotes(prev => ({
          ...prev,
          [artisanId]: {
            estimatedFee: parseFloat(quote.estimatedFee),
            buffer: parseFloat(quote.buffer),
            bufferPercentage: quote.bufferPercentage,
            fee: parseFloat(quote.chargedAmount),
            duration: quote.duration,
            pickup_eta: quote.pickupEta,
            estimated: true,
            explanation: quote.explanation
          }
        }));
        return parseFloat(quote.chargedAmount); // Return charged amount (with buffer)
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
        
        
        // Only set if values have changed to avoid unnecessary re-renders
        if (currentUserId !== userId) {
          setCurrentUserId(userId);
        }
        if (isGuest !== guestStatus) {
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
      
      // Process each artisan's delivery options
      Object.entries(cartByArtisan).forEach(([artisanId, artisanData]) => {
        if (artisanData.artisan?.fulfillment?.methods) {
          // Use the delivery service to structure options with user location and artisan data
          const processedOptions = deliveryService.getDeliveryOptions(
            artisanData.artisan,
            userLocation,
            isGuestUser,
            isPatronUser,
            hasDeliveryAddress
          );
          
          options[artisanId] = processedOptions;
          
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
  const loadUserProfile = async (userIdOverride = null, isGuestOverride = null) => {
    const userId = userIdOverride || currentUserId;
    const guestStatus = isGuestOverride !== null ? isGuestOverride : isGuest;
    
    if (!userId || guestStatus) {
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
        // Populate deliveryForm with saved address for DISPLAY purposes
        setDeliveryForm(prev => ({
          ...prev,
          firstName: userProfile.firstName || prev.firstName,
          lastName: userProfile.lastName || prev.lastName,
          email: userProfile.email || prev.email,
          phone: userProfile.phone || prev.phone,
          // Populate deliveryAddress structure for DeliveryInformation component
          deliveryAddress: {
            street: defaultAddress.street || '',
            city: defaultAddress.city || '',
            state: defaultAddress.state || '',
            zipCode: defaultAddress.zipCode || defaultAddress.postalCode || '',
            country: defaultAddress.country || 'Canada',
            latitude: defaultAddress.latitude,
            longitude: defaultAddress.longitude
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
      
      // Reset stale ref: if ref says "initiated" but there's no profile and not currently loading, reset it
      if (profileLoadingInitiatedRef.current && !userProfile && !profileLoading) {
        profileLoadingInitiatedRef.current = false;
      }
      
      // Load profile if not guest and not already loaded/loading
      if (!tokenData.isGuest && !userProfile && !profileLoadingInitiatedRef.current) {
        profileLoadingInitiatedRef.current = true;
        // Pass userId and isGuest directly since state hasn't updated yet
        loadUserProfile(tokenData.userId, tokenData.isGuest).catch(error => {
          console.error('❌ Error loading profile:', error);
          profileLoadingInitiatedRef.current = false; // Reset on error to allow retry
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
        if (artisanData.artisan?.fulfillment?.methods?.pickup?.schedule || artisanData.artisan?.hours?.schedule) {
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
            artisanData.artisan.fulfillment?.methods?.pickup?.schedule || artisanData.artisan.hours?.schedule || {},
            artisanEnhancedProducts,
            10 // 10 days ahead to provide more options
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
      // Determine which address to use based on user choice
      let addressToValidate;
      if (isGuest) {
        addressToValidate = deliveryForm.deliveryAddress || deliveryForm;
      } else if (useSavedAddress) {
        // Use saved address
        addressToValidate = selectedAddress || deliveryForm.deliveryAddress || deliveryForm;
      } else {
        // User wants to enter new address - use newAddressForm
        addressToValidate = newAddressForm.street ? newAddressForm : (deliveryForm.deliveryAddress || deliveryForm);
      }
      
      const hasCompleteAddress = addressToValidate && 
        addressToValidate.street && 
        addressToValidate.city && 
        addressToValidate.state && 
        addressToValidate.zipCode && 
        addressToValidate.country;
      
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
    if (method === 'professionalDelivery') {
      // Clear existing quote to force re-fetch
      setUberDirectQuotes(prev => {
        const updated = { ...prev };
        delete updated[artisanId];
        return updated;
      });
      
      // Determine which address to use based on user choice
      let addressToValidate;
      if (isGuest) {
        addressToValidate = deliveryForm.deliveryAddress || deliveryForm;
      } else if (useSavedAddress) {
        // Use saved address
        addressToValidate = selectedAddress || deliveryForm.deliveryAddress || deliveryForm;
      } else {
        // User wants to enter new address - use newAddressForm
        addressToValidate = newAddressForm.street ? newAddressForm : (deliveryForm.deliveryAddress || deliveryForm);
      }
      
      // Check if we have a complete address
      const hasCompleteAddress = addressToValidate && (
        addressToValidate.street || 
        (addressToValidate.deliveryAddress && addressToValidate.deliveryAddress.street)
      );
      
      if (hasCompleteAddress) {
        // Fetch quote immediately with the address
        await calculateUberDirectFee(artisanId, addressToValidate);
      }
    } else {
      // Clear validation results for this artisan if switching away from personal delivery
      setDeliveryValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[artisanId];
        return newResults;
      });
      
      // Clear Uber quote if switching away from professional delivery
      if (uberDirectQuotes[artisanId]) {
        setUberDirectQuotes(prev => {
          const updated = { ...prev };
          delete updated[artisanId];
          return updated;
        });
      }
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
            coordinatesLatitude: artisanData.artisan?.coordinates?.latitude,
            coordinatesLongitude: artisanData.artisan?.coordinates?.longitude,
            addressLatitude: artisanData.artisan?.address?.latitude,
            addressLongitude: artisanData.artisan?.address?.longitude,
            addressLat: artisanData.artisan?.address?.lat,
            addressLng: artisanData.artisan?.address?.lng,
            fullArtisanData: artisanData.artisan
          });
          
          // Priority order: coordinates object, then address object, then fallback to address lat/lng
          const artisanLat = artisanData.artisan?.coordinates?.latitude || 
                           artisanData.artisan?.address?.latitude || 
                           artisanData.artisan?.address?.lat;
          const artisanLng = artisanData.artisan?.coordinates?.longitude || 
                           artisanData.artisan?.address?.longitude || 
                           artisanData.artisan?.address?.lng;
          
          console.log(`🔍 Extracted coordinates for ${artisanData.artisan.artisanName}:`, {
            artisanLat,
            artisanLng,
            coordinatesObj: artisanData.artisan?.coordinates,
            addressObj: artisanData.artisan?.address
          });
          
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
            
            const deliveryRadius = artisanData.artisan.fulfillment?.methods?.delivery?.radius || 0;
            
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
              radius: artisanData.artisan.fulfillment?.methods?.delivery?.radius || 0,
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
    // When user edits address fields, they're using new address (not saved address)
    if (['street', 'city', 'state', 'zipCode', 'country'].includes(field)) {
      setUseSavedAddress(false);
      setSelectedAddress(null);
    }
    
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
        
        // Only validate if we have complete address information
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
            
            // NEW: Check if any artisan has professional delivery selected and fetch Uber quote
            const hasProfessionalDeliverySelected = Object.entries(selectedDeliveryMethods).some(([artisanId, method]) => 
              method === 'professionalDelivery'
            );
            
            if (hasProfessionalDeliverySelected) {
              console.log('🚛 Professional delivery selected - fetching Uber quotes for complete address');
              
              // Clear existing quotes to force re-fetch with new address
              setUberDirectQuotes({});
              
              // Fetch Uber quote for each artisan with professional delivery
              // Pass the updated address directly
              for (const [artisanId, method] of Object.entries(selectedDeliveryMethods)) {
                if (method === 'professionalDelivery') {
                  console.log('🚛 Getting Uber Direct quote for artisan:', artisanId);
                  await calculateUberDirectFee(artisanId, updatedForm);
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


  // Handle switching between saved address and new address
  const handleUseSavedAddressChange = async (useSaved) => {
    setUseSavedAddress(useSaved);
    
    // ALWAYS clear quotes when switching addresses to force fresh fetch
    setUberDirectQuotes({});
    
    if (!useSaved) {
      // User wants to enter new address
      setSelectedAddress(null);
      // Reset new address form
      setNewAddressForm({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Canada'
      });
    } else {
      // User switched back to saved address - immediately fetch quotes
      const addressToUse = selectedAddress || deliveryForm.deliveryAddress;
      
      if (addressToUse && addressToUse.street) {
        // Fetch quote for professional delivery
        const professionalDeliveryArtisans = Object.entries(selectedDeliveryMethods)
          .filter(([_, method]) => method === 'professionalDelivery')
          .map(([artisanId]) => artisanId);
        
        for (const artisanId of professionalDeliveryArtisans) {
          await calculateUberDirectFee(artisanId, addressToUse);
        }
        
        // Validate for personal delivery
        const personalDeliveryArtisans = Object.entries(selectedDeliveryMethods)
          .filter(([_, method]) => method === 'personalDelivery')
          .map(([artisanId]) => artisanId);
        
        if (personalDeliveryArtisans.length > 0) {
          const validation = await validateDeliveryAddress(addressToUse);
          if (validation.results) {
            setDeliveryValidationResults(validation.results);
          }
        }
      }
    }
  };

  // Handle address selection
  const handleAddressSelect = async (address) => {
    setSelectedAddress(address);
    setUseSavedAddress(true); // User is choosing to use saved address
    
    if (address) {
      // DON'T populate deliveryForm - keep saved address and new address separate
      // Only update user info if not already set
      setDeliveryForm(prev => ({
        ...prev,
        firstName: prev.firstName || userProfile?.firstName || '',
        lastName: prev.lastName || userProfile?.lastName || '',
        email: prev.email || userProfile?.email || '',
        phone: prev.phone || userProfile?.phone || ''
        // NOTE: Don't copy address fields - keep them independent
      }));
      
      // Clear previous validation results
      setDeliveryValidationResults({});
      
      // Clear any existing Uber quotes since address changed
      setUberDirectQuotes({});
      
      // Always validate delivery address to update delivery options
      try {
        console.log('🔍 Validating selected address for delivery options update:', address);
        const validation = await validateDeliveryAddress(address);
        setDeliveryValidationResults(validation.results || {});
        
        // NEW: If professional delivery is selected, fetch Uber quote with new address
        const hasProfessionalDeliverySelected = Object.entries(selectedDeliveryMethods).some(([artisanId, method]) => 
          method === 'professionalDelivery'
        );
        
        if (hasProfessionalDeliverySelected) {
          console.log('🚛 Professional delivery selected - fetching Uber quotes for selected address');
          
          // Fetch Uber quote for each artisan with professional delivery
          // Pass the address directly to ensure we use the correct address
          for (const [artisanId, method] of Object.entries(selectedDeliveryMethods)) {
            if (method === 'professionalDelivery') {
              console.log('🚛 Getting Uber Direct quote for artisan:', artisanId);
              await calculateUberDirectFee(artisanId, address);
            }
          }
        }
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
        // For authenticated users, use selectedAddress (saved) or newAddressForm (new)
        const addressToValidate = isGuest 
          ? (deliveryForm.deliveryAddress || deliveryForm)
          : (useSavedAddress ? (selectedAddress || deliveryForm) : (newAddressForm.street ? newAddressForm : deliveryForm));
        
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

      // Calculate total delivery fee with buffered quotes
      const totalDeliveryFee = await getTotalDeliveryFees();
      
      console.log('💰 Creating payment intent with delivery fee:', {
        totalDeliveryFee,
        uberDirectQuotes,
        selectedDeliveryMethods
      });

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
        deliveryAddress: useSavedAddress ? (selectedAddress || deliveryForm) : (newAddressForm.street ? newAddressForm : deliveryForm),
        deliveryInstructions: deliveryForm.instructions || '',
        deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
        deliveryFee: totalDeliveryFee, // EXPLICITLY include the calculated delivery fee
        pickupTimeWindows: selectedPickupTimes,
        deliveryMethodDetails: Object.entries(selectedDeliveryMethods).map(([artisanId, method]) => ({
          artisanId,
          method,
          fee: method === 'professionalDelivery' 
            ? (uberDirectQuotes[artisanId]?.fee || 0)
            : method === 'personalDelivery'
            ? (deliveryOptions[artisanId]?.personalDelivery?.fee || 0)
            : 0,
          instructions: method === 'pickup' 
            ? deliveryOptions[artisanId]?.pickup?.instructions || ''
            : method === 'personalDelivery'
            ? deliveryOptions[artisanId]?.personalDelivery?.instructions || ''
            : method === 'professionalDelivery'
            ? `${deliveryOptions[artisanId]?.professionalDelivery?.packaging || ''}${deliveryOptions[artisanId]?.professionalDelivery?.restrictions ? ` - ${deliveryOptions[artisanId].professionalDelivery.restrictions}` : ''}`.trim()
            : ''
        })),
        // Include delivery pricing data from buffered quotes (for professional delivery)
        deliveryPricing: (() => {
          const professionalDeliveryArtisan = Object.entries(selectedDeliveryMethods)
            .find(([artisanId, method]) => method === 'professionalDelivery');
          
          if (professionalDeliveryArtisan) {
            const [artisanId] = professionalDeliveryArtisan;
            const quote = uberDirectQuotes[artisanId];
            
            if (quote) {
              return {
                estimatedFee: quote.estimatedFee || 0,
                buffer: quote.buffer || 0,
                bufferPercentage: quote.bufferPercentage || 20,
                chargedAmount: quote.fee || 0,
                uberQuoteId: quote.quote_id,
                uberQuoteExpiry: quote.expires_at
              };
            }
          }
          return null;
        })()
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
        console.log('✅ Payment intent response:', response);
        console.log('✅ Payment intent data:', response.data);
        console.log('✅ Client secret (camelCase):', response.data?.clientSecret);
        console.log('✅ Client secret (snake_case):', response.data?.client_secret);
        
        // Normalize the response - backend might return camelCase or snake_case
        const normalizedData = {
          ...response.data,
          client_secret: response.data.clientSecret || response.data.client_secret,
          clientSecret: response.data.clientSecret || response.data.client_secret
        };
        
        setPaymentIntent(normalizedData);
        // Store orderData for payment confirmation
        setPaymentOrderData(orderData);
        console.log('✅ Stored order data for payment confirmation:', orderData);
        
        // Don't set checkoutStep - we're using collapsible sections now
        // setCheckoutStep('payment'); // REMOVED - conflicts with collapsible flow
        
        if (!normalizedData.client_secret) {
          console.error('❌ Payment intent created but missing client_secret!');
          throw new Error('Invalid payment intent response - missing client_secret');
        }
        
        console.log('✅ Payment intent set with client_secret:', normalizedData.client_secret.substring(0, 20) + '...');
        toast.success('Payment form ready');
      } else {
        throw new Error(response.message || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      
      // Handle specific error types
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;
        
        console.error('❌ Backend error message:', errorMessage);
        
        // Check for inventory-related errors
        if (errorMessage.includes('Insufficient inventory')) {
          toast.error(`❌ ${errorMessage}. Please adjust your cart quantities.`);
        } else if (errorMessage.includes('Product not found')) {
          toast.error('❌ Some items in your cart are no longer available. Please refresh your cart.');
        } else if (errorMessage.includes('Stripe is not configured') || errorMessage.includes('Payment processing is not available')) {
          toast.error('❌ Payment system is not available. Please contact support.');
        } else {
          toast.error(`❌ ${errorMessage}`);
        }
      } else if (error.message) {
        console.error('❌ Error message:', error.message);
        toast.error(`Failed to initialize payment: ${error.message}`);
      } else {
        toast.error('Failed to initialize payment. Please try again.');
      }
      
      // Clear payment intent on error
      setPaymentIntent(null);
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

  // Handle "Continue to Payment" - validate delivery and collapse/expand sections
  const handleContinueToPayment = async () => {
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
      
      // Mark delivery as confirmed
      setDeliveryConfirmed(true);
      
      // Collapse delivery, expand payment
      setDeliverySectionExpanded(false);
      setPaymentSectionExpanded(true);
      
      // For patrons/guests, create payment intent when entering payment section
      const isArtisan = userProfile?.role === 'artisan';
      if (!isArtisan) {
        await createPaymentIntent();
      }
      
      // Scroll to payment section
      setTimeout(() => {
        document.getElementById('payment-section')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error proceeding to payment:', error);
      toast.error('Failed to proceed to payment');
    }
  };

  // Handle wallet checkout for artisans
  const handleWalletCheckout = async () => {
    try {
      setPaymentLoading(true);
      
      // Fetch fresh wallet balance to ensure we have the latest after any top-ups
      let walletBalance = currentWalletBalance || 0;
      
      try {
        const freshBalanceResponse = await walletService.getWalletBalance();
        const freshBalance = freshBalanceResponse?.data?.balance || freshBalanceResponse?.balance;
        
        if (freshBalance !== undefined && freshBalance !== null) {
          walletBalance = freshBalance;
          setCurrentWalletBalance(freshBalance);
        }
      } catch (balanceError) {
        console.error('❌ Error fetching fresh balance, using state:', balanceError);
        walletBalance = currentWalletBalance || 0;
      }
      
      // Calculate total including delivery fees
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDeliveryFee = await getTotalDeliveryFees();
      const totalAmount = subtotal + totalDeliveryFee;
      
      // Check if artisan has sufficient funds
      if (walletBalance < totalAmount) {
        const shortfall = totalAmount - walletBalance;
        setPaymentLoading(false);
        
        // Store payment data to retry after successful top-up
        setPendingPaymentData({
          orderData: null, // Will be set when retrying
          totalAmount,
          currentBalance: walletBalance,
          shortfall
        });
        
        // Show wallet top-up modal
        console.log('🔴 Setting showWalletTopUp to true');
        console.log('🔴 Pending payment data:', {
          totalAmount,
          currentBalance: walletBalance,
          shortfall
        });
        setShowWalletTopUp(true);
        toast.error(`Insufficient funds. Current balance: $${walletBalance.toFixed(2)}, Need: $${totalAmount.toFixed(2)}`);
        return;
      }
      
      // Prepare order data
      const orderData = {
        items: cart.map(item => {
          let productId = item._id;
          if (item.artisan && (item._id === item.artisan._id || item._id === item.artisan)) {
            productId = item.productId || item._id;
          }
          return {
            productId: productId,
            quantity: item.quantity,
            productType: item.productType || 'ready_to_ship'
          };
        }),
        deliveryAddress: useSavedAddress ? (selectedAddress || deliveryForm) : (newAddressForm.street ? newAddressForm : deliveryForm),
        deliveryInstructions: deliveryForm.instructions || '',
        deliveryMethod: Object.values(selectedDeliveryMethods)[0] || 'pickup',
        deliveryFee: totalDeliveryFee,
        totalAmount: totalAmount,
        pickupTimeWindows: selectedPickupTimes,
        deliveryMethodDetails: Object.entries(selectedDeliveryMethods).map(([artisanId, method]) => ({
          artisanId,
          method,
          fee: method === 'professionalDelivery' 
            ? (uberDirectQuotes[artisanId]?.fee || 0)
            : method === 'personalDelivery'
            ? (deliveryOptions[artisanId]?.personalDelivery?.fee || 0)
            : 0,
          instructions: method === 'pickup' 
            ? deliveryOptions[artisanId]?.pickup?.instructions || ''
            : method === 'personalDelivery'
            ? deliveryOptions[artisanId]?.personalDelivery?.instructions || ''
            : method === 'professionalDelivery'
            ? `${deliveryOptions[artisanId]?.professionalDelivery?.packaging || ''}${deliveryOptions[artisanId]?.professionalDelivery?.restrictions ? ` - ${deliveryOptions[artisanId].professionalDelivery.restrictions}` : ''}`.trim()
            : ''
        })),
        deliveryPricing: (() => {
          const professionalDeliveryArtisan = Object.entries(selectedDeliveryMethods)
            .find(([artisanId, method]) => method === 'professionalDelivery');
          
          if (professionalDeliveryArtisan) {
            const [artisanId] = professionalDeliveryArtisan;
            const quote = uberDirectQuotes[artisanId];
            
            if (quote) {
              return {
                estimatedFee: quote.estimatedFee || 0,
                buffer: quote.buffer || 0,
                bufferPercentage: quote.bufferPercentage || 20,
                chargedAmount: quote.fee || 0,
                uberQuoteId: quote.quote_id,
                uberQuoteExpiry: quote.expires_at
              };
            }
          }
          return null;
        })()
      };
      
      // Create order with wallet payment
      const response = await orderService.createWalletOrder(orderData);
      
      if (response.success) {
        console.log('✅ Wallet order created successfully:', response);
        toast.success('Order placed successfully! Payment deducted from your wallet.');
        
        // Extract order ID - same logic as patron flow
        let orderId = null;
        if (response.data._id) {
          orderId = response.data._id.toString();
        } else if (response.data.orderId) {
          orderId = response.data.orderId.toString();
        }
        
        console.log('✅ Wallet order ID:', orderId);
        
        if (orderId) {
          // Clear cart
          await cartService.clearCart();
          
          // Trigger notification refresh for new order
          window.dispatchEvent(new CustomEvent('newNotificationReceived', {
            detail: { orderId, type: 'order_placed' }
          }));
          
          // Navigate to order confirmation - same as patron flow
          navigate('/order-confirmation', {
            state: {
              orderId: orderId,
              message: 'Order placed successfully!',
              fromCart: true,
              paymentMethod: 'wallet'
            }
          });
        } else {
          console.error('❌ Could not extract order ID from wallet response');
          toast.error('Order created but navigation failed. Check your Orders page.');
          navigate('/orders');
        }
      } else {
        throw new Error(response.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('❌ Error during wallet checkout:', error);
      
      if (error.message === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient wallet balance. Please top up your wallet.');
        setTimeout(() => {
          navigate('/wallet');
        }, 2000);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to process wallet payment. Please try again.');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle successful wallet top-up
  const handleWalletTopUpSuccess = async (data) => {
    console.log('✅ Wallet top-up successful:', data);
    
    // Handle different response formats
    const amount = data?.transaction?.amount || data?.amount || 0;
    const newBalance = data?.newBalance || data?.balance || (currentWalletBalance + amount);
    
    console.log('💰 Top-up complete - new balance:', newBalance);
    
    // Update state
    setCurrentWalletBalance(newBalance);
    
    // Close the modal
    setShowWalletTopUp(false);
    setPendingPaymentData(null);
    
    // Show success message
    if (amount > 0) {
      toast.success(`Successfully added $${amount.toFixed(2)} to your wallet!`);
    } else {
      toast.success('Wallet topped up successfully!');
    }
    
    // Fetch fresh balance from API to ensure accuracy
    try {
      const freshBalance = await walletService.getWalletBalance();
      const confirmedBalance = freshBalance?.data?.balance || freshBalance?.balance || newBalance;
      
      console.log('💰 Fresh balance from API:', confirmedBalance);
      setCurrentWalletBalance(confirmedBalance);
      
      // Retry the payment automatically with confirmed balance
      toast('Retrying payment with updated balance...', { icon: '🔄' });
      
      // Wait a moment for state to update, then retry checkout
      setTimeout(async () => {
        await handleWalletCheckout();
      }, 500);
      
    } catch (balanceError) {
      console.error('❌ Error fetching fresh balance:', balanceError);
      // Use the newBalance from top-up response
      toast('Retrying payment...', { icon: '🔄' });
      setTimeout(async () => {
        await handleWalletCheckout();
      }, 500);
    }
  };

  // Handle wallet top-up cancel
  const handleWalletTopUpCancel = () => {
    setShowWalletTopUp(false);
    setPendingPaymentData(null);
    toast('Payment cancelled. Please top up your wallet to continue.', { icon: 'ℹ️' });
  };

  // Handle top-up button click from payment section
  const handleTopUpClick = () => {
    console.log('🟢 handleTopUpClick called');
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * item.quantity), 0);
    const totalDeliveryFee = Object.values(uberDirectQuotes).reduce((sum, quote) => sum + (quote.fee || 0), 0) || 
      Object.values(selectedDeliveryMethods).reduce((sum, method, idx) => {
        const artisanId = Object.keys(selectedDeliveryMethods)[idx];
        if (method === 'personalDelivery') {
          return sum + (deliveryOptions[artisanId]?.personalDelivery?.fee || 0);
        }
        return sum;
      }, 0);
    const totalAmount = subtotal + totalDeliveryFee;
    const shortfall = Math.max(0, totalAmount - (currentWalletBalance || 0));

    console.log('🟢 Setting modal data:', {
      totalAmount,
      currentBalance: currentWalletBalance,
      shortfall
    });

    setPendingPaymentData({
      orderData: null,
      totalAmount,
      currentBalance: currentWalletBalance || 0,
      shortfall
    });
    setShowWalletTopUp(true);
    console.log('🟢 Modal should now be visible');
  };

  // Handle balance loaded from WalletPaymentSection
  const handleBalanceLoaded = (balance) => {
    setCurrentWalletBalance(balance);
  };


  // Load data on component mount
  useEffect(() => {
    if (!checkAuthCalledRef.current) {
      checkAuthCalledRef.current = true;
      checkAuth();
    }
  }, []);

  // Don't automatically load user location - only when needed for delivery validation
  // useEffect(() => {
  //   if (userProfile) {
  //     loadUserLocation();
  //   }
  // }, [userProfile]);

  // Track if we've already loaded options for current cart state
  const loadedOptionsRef = React.useRef(null);
  
  // Track if profile loading has been initiated to prevent duplicate loads
  const profileLoadingInitiatedRef = React.useRef(false);
  
  // Track if checkAuth has been called to prevent duplicate cart loads
  const checkAuthCalledRef = React.useRef(false);

  // Load delivery options when cart data or user location changes
  useEffect(() => {
    if (Object.keys(cartByArtisan).length > 0) {
      // For logged-in users, wait for profile to load before loading delivery options
      // For guests, load immediately since there's no profile to wait for
      if (!isGuest && !userProfile) {
        return;
      }
      
      // Create a key to track if we've already loaded for this cart state
      const cartKey = JSON.stringify({
        artisanIds: Object.keys(cartByArtisan),
        userLocation: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'no-location',
        hasProfile: !!userProfile
      });
      
      // Only load if we haven't loaded for this exact cart state
      if (loadedOptionsRef.current !== cartKey) {
        loadedOptionsRef.current = cartKey;
        loadDeliveryOptions();
        loadPickupTimeWindows();
      }
    }
  }, [cartByArtisan, userLocation, userProfile, isGuest]);

  // Load user profile immediately when user is authenticated
  useEffect(() => {
    if (currentUserId && !isGuest && !userProfile && !profileLoadingInitiatedRef.current) {
      profileLoadingInitiatedRef.current = true;
      // Pass userId directly to avoid timing issues
      loadUserProfile(currentUserId).catch(error => {
        console.error('❌ Error loading user data:', error);
        profileLoadingInitiatedRef.current = false; // Reset on error to allow retry
      });
    }
  }, [currentUserId, isGuest, userProfile]);

  // Track if addresses have been loaded to prevent multiple loads
  const [addressesLoaded, setAddressesLoaded] = useState(false);

  // Load saved addresses immediately when cart loads and user profile is available
  useEffect(() => {
    if (userProfile && !isGuest && !addressesLoaded && userProfile.addresses && userProfile.addresses.length > 0) {
      loadSavedAddresses();
      setAddressesLoaded(true);
    }
  }, [userProfile, isGuest, addressesLoaded]);
  
  // Watch for new address completion and fetch quotes
  useEffect(() => {
    const checkNewAddressComplete = async () => {
      // Only process if user chose to enter new address
      if (useSavedAddress) return;
      
      // Check if new address is complete
      const isComplete = newAddressForm.street && 
                        newAddressForm.city && 
                        newAddressForm.state && 
                        newAddressForm.zipCode;
      
      if (!isComplete) return;
      
      // Clear existing quotes to force fresh fetch with new address
      setUberDirectQuotes({});
      
      // Fetch quote for professional delivery
      const professionalDeliveryArtisans = Object.entries(selectedDeliveryMethods)
        .filter(([_, method]) => method === 'professionalDelivery')
        .map(([artisanId]) => artisanId);
      
      if (professionalDeliveryArtisans.length > 0) {
        for (const artisanId of professionalDeliveryArtisans) {
          await calculateUberDirectFee(artisanId, newAddressForm);
        }
      }
    };
    
    // Debounce the check
    const timeout = setTimeout(checkNewAddressComplete, 1000);
    return () => clearTimeout(timeout);
  }, [newAddressForm, useSavedAddress, selectedDeliveryMethods]);

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

  // Render checkout page with collapsible delivery & payment sections
  if (checkoutStep === 'checkout') {
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * item.quantity), 0);
    const totalDeliveryFee = Object.values(uberDirectQuotes).reduce((sum, quote) => sum + (quote.fee || 0), 0) || 
      Object.values(selectedDeliveryMethods).reduce((sum, method, idx) => {
        const artisanId = Object.keys(selectedDeliveryMethods)[idx];
        if (method === 'personalDelivery') {
          return sum + (deliveryOptions[artisanId]?.personalDelivery?.fee || 0);
        }
        return sum;
      }, 0);
    const totalAmount = subtotal + totalDeliveryFee;

    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-stone-800 font-display mb-2">Delivery & Payment</h1>
            <p className="text-lg text-stone-600">Complete your purchase in 2 simple steps</p>
          </div>

          {/* Artisan Cards - Always Visible */}
          <div className="mb-6 space-y-4">
            {Object.entries(cartByArtisan).map(([artisanId, artisanData]) => {
              const artisan = artisanData.artisan;
              const artisanItems = artisanData.items || [];
              
              return (
                <div key={artisanId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Artisan Image */}
                    {artisan?.businessImage ? (
                      <img
                        src={getImageUrl(artisan.businessImage)}
                        alt={artisan.artisanName}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border-2 border-amber-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ display: artisan?.businessImage ? 'none' : 'flex' }}
                    >
                      <BuildingStorefrontIcon className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-800 mb-1">{artisan?.artisanName || 'Unknown Artisan'}</h3>
                      <div className="flex items-center gap-4 text-sm text-stone-600 flex-wrap">
                        {artisan?.rating?.average && (
                          <div className="flex items-center gap-1">
                            <StarIcon className="w-4 h-4 text-amber-500" />
                            <span className="font-medium">{Number(artisan.rating.average).toFixed(1)}</span>
                            <span className="text-stone-400">({artisan.rating.count || 0})</span>
                          </div>
                        )}
                        {artisan?.address?.city && (
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{artisan.address.city}, {artisan.address.state || artisan.address.province || 'QC'}</span>
                          </div>
                        )}
                        {artisan?.type && (
                          <div className="px-2 py-1 bg-stone-100 rounded text-xs font-medium text-stone-700 capitalize">
                            {artisan.type}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Products from this artisan */}
                  <div className="space-y-3">
                    {artisanItems.map((item) => (
                      <div key={item._id} className="flex items-center gap-4 p-3 bg-stone-50 rounded-lg">
                        <img
                          src={getImageUrl(item.images?.[0])}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => { e.target.src = '/placeholder-product.png'; }}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-stone-800">{item.name}</h4>
                          <p className="text-sm text-stone-600">
                            ${Number(item.price || 0).toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-stone-800">
                            ${(Number(item.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary with Total - Always Visible */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border-2 border-amber-300 p-6 mb-6">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {totalDeliveryFee > 0 && (
                <div>
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Fee</span>
                    <span className="font-medium">${totalDeliveryFee.toFixed(2)}</span>
                  </div>
                  {/* Show buffer breakdown for professional delivery */}
                  {Object.entries(selectedDeliveryMethods).some(([_, method]) => method === 'professionalDelivery') && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-900 mb-1">Professional Delivery Details:</p>
                      {Object.entries(selectedDeliveryMethods).map(([artisanId, method]) => {
                        if (method !== 'professionalDelivery') return null;
                        const quote = uberDirectQuotes[artisanId];
                        if (!quote) return null;
                        const artisanName = cartByArtisan[artisanId]?.artisan?.artisanName || 'Artisan';
                        
                        return (
                          <div key={artisanId} className="text-xs text-blue-800 space-y-1 mb-2 last:mb-0">
                            <p className="font-medium">{artisanName}:</p>
                            <div className="ml-3 space-y-0.5">
                              <p>• Estimated: ${quote.estimatedFee?.toFixed(2) || '0.00'}</p>
                              <p>• Buffer ({quote.bufferPercentage || 20}%): ${quote.buffer?.toFixed(2) || '0.00'}</p>
                              <p className="font-semibold">• You pay: ${quote.fee?.toFixed(2) || '0.00'}</p>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs text-blue-700 mt-2 italic">
                        💡 Buffer protects against surge pricing. Any unused amount will be automatically refunded to your wallet.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between text-xl font-bold text-stone-800">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Section - Collapsible */}
          <div className="mb-6">
            <div
              onClick={() => {
                if (deliveryConfirmed) {
                  setDeliverySectionExpanded(!deliverySectionExpanded);
                  if (deliverySectionExpanded) {
                    setPaymentSectionExpanded(false);
                  }
                }
              }}
              className={`w-full flex items-center justify-between bg-white rounded-xl shadow-sm border-2 border-orange-300 p-6 transition-shadow ${
                deliveryConfirmed ? 'hover:shadow-md cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  deliveryConfirmed ? 'bg-green-600' : 'bg-orange-600'
                }`}>
                  {deliveryConfirmed ? (
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  ) : (
                    <TruckIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl font-semibold text-stone-800 mb-1">
                    {deliveryConfirmed ? '✓ Delivery Options' : '1. Delivery Options'}
                  </h2>
                  {deliveryConfirmed && !deliverySectionExpanded && (
                    <div className="text-sm text-stone-600 space-y-1">
                      {/* Delivery Method Summary */}
                      <p className="font-medium">
                        {Object.values(selectedDeliveryMethods)[0] === 'pickup' ? '📦 Pickup' : 
                         Object.values(selectedDeliveryMethods)[0] === 'personalDelivery' ? '🚗 Personal Delivery' :
                         '🚚 Professional Delivery'}
                      </p>
                      {/* Delivery Address Summary */}
                      {(selectedAddress || deliveryForm.street || newAddressForm.street) && (
                        <p className="text-xs text-stone-500">
                          {selectedAddress 
                            ? `${selectedAddress.street}, ${selectedAddress.city}`
                            : deliveryForm.street 
                            ? `${deliveryForm.street}, ${deliveryForm.city}`
                            : `${newAddressForm.street}, ${newAddressForm.city}`
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deliveryConfirmed && (
                  <span className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                    Edit
                  </span>
                )}
                {deliveryConfirmed ? (
                  deliverySectionExpanded ? <ChevronUpIcon className="w-5 h-5 text-stone-400" /> : <ChevronDownIcon className="w-5 h-5 text-stone-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-stone-400" />
                )}
              </div>
            </div>

            {deliverySectionExpanded && (
              <div className="mt-4">
      <DeliveryInformation
                  cartByArtisan={cartByArtisan}
        deliveryOptions={deliveryOptions}
        selectedDeliveryMethods={selectedDeliveryMethods}
        onDeliveryMethodChange={handleDeliveryMethodChange}
        deliveryForm={deliveryForm}
        onDeliveryFormChange={handleDeliveryFormChange}
        selectedAddress={selectedAddress}
        onAddressSelect={handleAddressSelect}
        useSavedAddress={useSavedAddress}
        onUseSavedAddressChange={handleUseSavedAddressChange}
        newAddressForm={newAddressForm}
        onNewAddressChange={setNewAddressForm}
        userProfile={userProfile}
        uberDirectQuotes={uberDirectQuotes}
        loadingUberQuotes={loadingUberQuotes}
                  onContinue={handleContinueToPayment}
                  onBack={() => navigate('/cart')}
        isGuest={isGuest}
        user={user}
        userLocation={userLocation}
        deliveryValidationResults={deliveryValidationResults}
        pickupTimeWindows={pickupTimeWindows}
        selectedPickupTimes={selectedPickupTimes}
        onPickupTimeChange={handlePickupTimeChange}
        enhancedProducts={enhancedProducts}
                  embedded={true}
                />
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div id="payment-section" className="mb-6">
            <button
              onClick={() => {
                if (deliveryConfirmed) {
                  setPaymentSectionExpanded(!paymentSectionExpanded);
                  if (paymentSectionExpanded) {
                    setDeliverySectionExpanded(false);
                  }
                }
              }}
              disabled={!deliveryConfirmed}
              className={`w-full flex items-center justify-between rounded-xl shadow-sm border-2 p-6 transition-all ${
                deliveryConfirmed 
                  ? 'bg-white border-purple-300 hover:shadow-md cursor-pointer' 
                  : 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  deliveryConfirmed ? 'bg-purple-600' : 'bg-gray-400'
                }`}>
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-stone-800">
                    2. Payment
                  </h2>
                  {!deliveryConfirmed && (
                    <p className="text-sm text-stone-500">Complete delivery options first</p>
                  )}
                  {deliveryConfirmed && paymentSectionExpanded && (
                    <p className="text-sm text-purple-600">
                      {userProfile?.role === 'artisan' ? 'Wallet Payment' : 'Card Payment'}
                    </p>
                  )}
                </div>
              </div>
              {deliveryConfirmed && (
                paymentSectionExpanded ? <ChevronUpIcon className="w-5 h-5 text-stone-400" /> : <ChevronDownIcon className="w-5 h-5 text-stone-400" />
              )}
            </button>

            {paymentSectionExpanded && deliveryConfirmed && (
              <div className="mt-4">
                {userProfile?.role === 'artisan' ? (
                  // Artisan Wallet Payment
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    {/* Wallet Payment Method */}
                    <WalletPaymentSection 
                      totalAmount={totalAmount} 
                      onTopUpClick={handleTopUpClick}
                      onBalanceLoaded={handleBalanceLoaded}
                      externalBalance={currentWalletBalance}
                      userRole={userProfile?.role}
                    />

                    {/* Complete Payment Button */}
                    <button
                      onClick={handleWalletCheckout}
                      disabled={paymentLoading}
                      className={`w-full py-4 rounded-lg font-semibold text-lg transition-all mt-6 ${
                        paymentLoading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {paymentLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing Payment...</span>
                        </div>
                      ) : (
                        'Complete Payment'
                      )}
                    </button>
                    <p className="text-center text-stone-500 text-sm mt-4">
                      💳 Payment will be deducted from your wallet balance
                    </p>
                  </div>
                ) : (
                  // Patron/Guest Stripe Payment
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    {isCreatingPaymentIntent ? (
                      // Loading state while payment intent is being created
                      <div className="text-center py-12">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-stone-800 mb-2 font-display">Preparing Payment</h2>
                        <p className="text-stone-600">Setting up secure payment processing...</p>
                      </div>
                    ) : paymentIntent && stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.client_secret, locale: 'en-CA' }}>
                        <StripeOrderPayment
                          paymentIntent={paymentIntent}
                          clientSecret={paymentIntent.client_secret}
                          totalAmount={paymentIntent.totalAmount}
                          orderData={paymentOrderData}
                          onPaymentSuccess={(result) => {
                            console.log('✅ Payment success callback received:', result);
                            console.log('✅ Result type:', typeof result);
                            console.log('✅ Result keys:', Object.keys(result || {}));
                            
                            // Extract order ID - result.data contains the order
                            let orderId = null;
                            if (result._id) {
                              orderId = result._id.toString();
                            } else if (result.orderId) {
                              orderId = result.orderId.toString();
                            } else if (result.data?._id) {
                              orderId = result.data._id.toString();
                            } else if (result.data?.orderId) {
                              orderId = result.data.orderId.toString();
                            } else if (typeof result === 'string') {
                              orderId = result;
                            }
                            
                            console.log('✅ Extracted order ID:', orderId, 'Type:', typeof orderId);
                            
                            if (!orderId) {
                              console.error('❌ Could not extract order ID from result');
                              toast.error('Order created but navigation failed. Check your Orders page.');
                              navigate('/orders');
                              return;
                            }
                            
                            setOrderConfirmation({ orderId });
                            setCheckoutStep('success');
                            
                            // Navigate to order confirmation with state
                            navigate('/order-confirmation', {
                              state: {
                                orderId: orderId,
                                message: 'Order placed successfully!',
                                fromCart: true
                              }
                            });
                          }}
                          userProfile={userProfile}
                          isGuest={isGuest}
                          savedPaymentMethods={userProfile?.paymentMethods || []}
                        />
                      </Elements>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CreditCardIcon className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-stone-800 mb-2 font-display">Payment System Configuration Error</h2>
                        <p className="text-stone-600 mb-4">Stripe payment processing is not properly configured.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Wallet Top-Up Modal Overlay */}
        {showWalletTopUp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header with balance info */}
                {pendingPaymentData && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-red-900 mb-2">Insufficient Wallet Balance</h3>
                        <div className="text-sm text-red-800 space-y-1">
                          <p>Current Balance: <span className="font-semibold">${pendingPaymentData.currentBalance.toFixed(2)}</span></p>
                          <p>Order Total: <span className="font-semibold">${pendingPaymentData.totalAmount.toFixed(2)}</span></p>
                          <p>Amount Needed: <span className="font-semibold text-red-600">${pendingPaymentData.shortfall.toFixed(2)}</span></p>
                        </div>
                        <p className="text-sm text-red-700 mt-2">
                          Please add at least ${pendingPaymentData.shortfall.toFixed(2)} to complete your purchase.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Wallet top-up form */}
                <WalletTopUp 
                  onSuccess={handleWalletTopUpSuccess} 
                  onCancel={handleWalletTopUpCancel}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // OLD MULTI-PAGE FLOW - KEEPING FOR FALLBACK
  // Render payment page (old flow, will be removed after testing)
  if (checkoutStep === 'payment-old') {
    // Show wallet payment confirmation for artisans
    if (userProfile?.role === 'artisan') {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDeliveryFee = Object.values(uberDirectQuotes).reduce((sum, quote) => sum + (quote.fee || 0), 0) || 
        Object.values(selectedDeliveryMethods).reduce((sum, method, idx) => {
          const artisanId = Object.keys(selectedDeliveryMethods)[idx];
          if (method === 'personalDelivery') {
            return sum + (deliveryOptions[artisanId]?.personalDelivery?.fee || 0);
          }
          return sum;
        }, 0);
      const totalAmount = subtotal + totalDeliveryFee;
      
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
              <p className="text-xl text-stone-600">Review your order and confirm payment</p>
            </div>

            {/* Products in Order */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-stone-800 mb-4">Items in Your Order</h2>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg">
                    <img
                      src={getImageUrl(item.images?.[0])}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-800">{item.name}</h3>
                      <p className="text-sm text-stone-600">
                        ${Number(item.price || 0).toFixed(2)} × {item.quantity}
                      </p>
                      {item.artisan?.artisanName && (
                        <p className="text-xs text-stone-500 mt-1">
                          From: {item.artisan.artisanName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-800">
                        ${(Number(item.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-stone-800 mb-4">Price Breakdown</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                
                {totalDeliveryFee > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Fee</span>
                    <span className="font-medium">${totalDeliveryFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between text-xl font-bold text-stone-800">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Payment Method */}
            <WalletPaymentSection 
              totalAmount={totalAmount} 
              onTopUpClick={handleTopUpClick}
              onBalanceLoaded={handleBalanceLoaded}
              externalBalance={currentWalletBalance}
              userRole={userProfile?.role}
            />

            {/* Delivery Information Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-stone-800 mb-4">Delivery Information</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">Method:</span>
                  <span className="font-medium text-stone-800 capitalize">
                    {Object.values(selectedDeliveryMethods)[0]?.replace(/([A-Z])/g, ' $1').trim() || 'Pickup'}
                  </span>
                </div>
                
                {(selectedAddress || deliveryForm.street) && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Address:</span>
                    <span className="font-medium text-stone-800 text-right max-w-xs">
                      {selectedAddress ? 
                        `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zipCode}` :
                        `${deliveryForm.street}, ${deliveryForm.city}, ${deliveryForm.state} ${deliveryForm.zipCode}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Payment Button */}
            <button
              onClick={handleWalletCheckout}
              disabled={paymentLoading}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                paymentLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {paymentLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </div>
              ) : (
                `Complete Payment - $${totalAmount.toFixed(2)}`
              )}
            </button>

            <p className="text-center text-stone-500 text-sm mt-4">
              💳 Payment will be deducted from your wallet balance
            </p>
          </div>
        </div>
      );
    }
    
    // Show loading while creating payment intent (for non-artisans)
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

    // Show Stripe payment form (for non-artisans)
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
                  deliveryAddress: useSavedAddress ? (selectedAddress || deliveryForm) : (newAddressForm.street ? newAddressForm : deliveryForm),
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
                  // Include delivery pricing data from buffered quotes (for professional delivery)
                  deliveryPricing: (() => {
                    const professionalDeliveryArtisan = Object.entries(selectedDeliveryMethods)
                      .find(([artisanId, method]) => method === 'professionalDelivery');
                    
                    if (professionalDeliveryArtisan) {
                      const [artisanId] = professionalDeliveryArtisan;
                      const quote = uberDirectQuotes[artisanId];
                      
                      if (quote) {
                        return {
                          estimatedFee: quote.estimatedFee || 0,
                          buffer: quote.buffer || 0,
                          bufferPercentage: quote.bufferPercentage || 20,
                          chargedAmount: quote.fee || 0,
                          uberQuoteId: quote.quote_id,
                          uberQuoteExpiry: quote.expires_at
                        };
                      }
                    }
                    return null;
                  })(),
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
