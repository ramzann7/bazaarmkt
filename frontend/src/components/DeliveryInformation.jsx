import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPinIcon, 
  TruckIcon, 
  ClockIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  StarIcon,
  ShieldCheckIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { geocodingService } from '../services/geocodingService';
import { guestService } from '../services/guestService';
import toast from 'react-hot-toast';

const DeliveryInformation = ({
  cartByArtisan,
  deliveryOptions,
  selectedDeliveryMethods,
  onDeliveryMethodChange,
  deliveryForm,
  onDeliveryFormChange,
  selectedAddress,
  onAddressSelect,
  useSavedAddress,
  onUseSavedAddressChange,
  newAddressForm,
  onNewAddressChange,
  userProfile,
  uberDirectQuotes = {},
  loadingUberQuotes = new Set(),
  onContinue,
  onBack,
  isGuest,
  user,
  userLocation,
  deliveryValidationResults,
  pickupTimeWindows,
  selectedPickupTimes,
  onPickupTimeChange,
  enhancedProducts,
  embedded = false // New prop to hide header/artisan card when embedded
}) => {
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showDeliveryAddress, setShowDeliveryAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState({});
  const [emailValidation, setEmailValidation] = useState({});
  const [deliveryValidation, setDeliveryValidation] = useState({});
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [pickupDistance, setPickupDistance] = useState(null);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [emailValidationTimeout, setEmailValidationTimeout] = useState(null);
  const [lastValidatedEmail, setLastValidatedEmail] = useState(null);
  const [showAddressOptions, setShowAddressOptions] = useState(false);
  const [showAllPickupTimes, setShowAllPickupTimes] = useState({}); // Track expanded state per artisan
  
  // Refs for debouncing
  const addressValidationTimeout = React.useRef(null);
  
  // Use Uber quotes from parent Cart component (passed as props)
  // This eliminates duplicate state and ensures consistency
  const uberQuotes = uberDirectQuotes;
  const isLoadingUberQuote = (artisanId) => loadingUberQuotes.has(artisanId);

  // Get the current artisan (assuming single artisan for now)
  const currentArtisanId = Object.keys(cartByArtisan)[0];
  const currentArtisan = cartByArtisan[currentArtisanId];

  // NOTE: Uber quote fetching is now handled by parent Cart component
  // DeliveryInformation receives quotes via uberDirectQuotes prop
  // No duplicate fetching logic needed here

  // Validate and geocode address - MUST BE BEFORE validateSavedAddress
  const validateAddress = async (address) => {
    if (!address || address.length < 10) return;
    
    // Only validate complete addresses (with comma or sufficient length)
    if (!geocodingService.isCompleteAddress(address)) {
      console.log('⏳ Waiting for complete address before validating:', address);
      return;
    }
    
    setIsValidatingAddress(true);
    try {
      // Geocode the address using the geocoding service
      const geocodeResult = await geocodingService.geocodeAddress(address);
      
      if (geocodeResult && geocodeResult.latitude && geocodeResult.longitude) {
        const { latitude, longitude, confidence } = geocodeResult;
        
        // Check if address is within delivery radius
        if (selectedDeliveryMethods[currentArtisanId] && selectedDeliveryMethods[currentArtisanId] !== 'pickup') {
          const artisanLocation = currentArtisan?.artisan?.coordinates;
          if (artisanLocation) {
            const distance = geocodingService.calculateDistanceBetween(
              artisanLocation,
              { latitude, longitude }
            );
            
            if (distance !== null) {
              setDeliveryDistance(distance);
              
              // Check if within delivery radius - use appropriate radius based on delivery method
              let radius = 10; // Default fallback
              let deliveryMethod = 'delivery';
              
              if (selectedDeliveryMethods[currentArtisanId] === 'personalDelivery') {
                radius = deliveryOptions[currentArtisanId]?.personalDelivery?.radius || 10;
                deliveryMethod = 'personal delivery';
              } else if (selectedDeliveryMethods[currentArtisanId] === 'professionalDelivery') {
                radius = deliveryOptions[currentArtisanId]?.professionalDelivery?.serviceRadius || 25;
                deliveryMethod = 'professional delivery';
              } else {
                // Fallback to personal delivery radius if method not yet selected
                radius = deliveryOptions[currentArtisanId]?.personalDelivery?.radius || 10;
              }
              
              if (distance <= radius) {
                setAddressValidation({
                  isValid: true,
                  message: `✓ Address verified (${distance.toFixed(1)}km away)`,
                  coordinates: { latitude, longitude },
                  distance
                });
              } else {
                setAddressValidation({
                  isValid: false,
                  message: `Address is outside ${deliveryMethod} area (${distance.toFixed(1)}km away, max ${radius}km)`,
                  coordinates: { latitude, longitude },
                  distance
                });
              }
            }
          }
        } else {
          // Just validate geocoding for pickup
          setAddressValidation({
            isValid: true,
            message: '✓ Address verified',
            coordinates: { latitude, longitude }
          });
        }
      } else {
        setAddressValidation({
          isValid: false,
          message: 'Address could not be verified. Please check and try again.'
        });
      }
    } catch (error) {
      console.error('Address validation error:', error);
      setAddressValidation({
        isValid: false,
        message: 'Error validating address. Please try again.'
      });
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Validate saved address when selected
  const validateSavedAddress = async () => {
    if (useSavedAddress && deliveryForm.deliveryAddress?.street) {
      const address = deliveryForm.deliveryAddress;
      const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
      await validateAddress(fullAddress);
    }
  };

  // Validate saved address when selected
  useEffect(() => {
    if (useSavedAddress && deliveryForm.deliveryAddress?.street && selectedDeliveryMethods[currentArtisanId] !== 'pickup') {
      validateSavedAddress();
    }
  }, [useSavedAddress, selectedDeliveryMethods[currentArtisanId]]);

  // NOTE: Uber quote fetching removed from here - now handled by parent Cart component
  // Cart.jsx handles quote fetching when:
  // 1. User selects professional delivery
  // 2. User enters/selects an address
  // 3. Saved address is loaded

  // Calculate distance for pickup (only for authenticated users)
  useEffect(() => {
    if (!currentArtisan) return; // Guard clause inside useEffect instead of early return
    const calculatePickupDistance = async () => {
      // Only calculate distance for authenticated users selecting pickup
      if (!isGuest && user && selectedDeliveryMethods[currentArtisanId] === 'pickup') {
        try {
          const artisanCoords = currentArtisan?.artisan?.coordinates;
          const userCoords = user?.coordinates || userLocation;
          
          if (artisanCoords && userCoords) {
            const distance = geocodingService.calculateDistanceBetween(
              artisanCoords,
              userCoords
            );
            
            if (distance !== null) {
              setPickupDistance(distance);
              console.log(`📍 Distance to artisan for pickup: ${distance.toFixed(1)}km`);
            }
          }
        } catch (error) {
          console.error('❌ Error calculating pickup distance:', error);
        }
      } else {
        // Reset distance when not pickup or user is guest
        setPickupDistance(null);
      }
    };

    calculatePickupDistance();
  }, [selectedDeliveryMethods, currentArtisanId, currentArtisan, user, userLocation, isGuest]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (addressValidationTimeout.current) {
        clearTimeout(addressValidationTimeout.current);
      }
    };
  }, []);

  // Early return AFTER all hooks have been called
  if (!currentArtisan) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No items in cart</h1>
          <button
            onClick={onBack}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
          >
            Back to cart
          </button>
        </div>
      </div>
    );
  }

  // Helper function to validate email format
  const isValidEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate email against existing users
  const validateEmail = async (email) => {
    // Only validate if email format is valid and hasn't been validated yet
    if (!email || !isValidEmailFormat(email)) {
      return;
    }
    
    // Skip if this email was already validated
    if (email === lastValidatedEmail) {
      return;
    }
    
    setIsValidatingEmail(true);
    setLastValidatedEmail(email);
    
    try {
      const result = await guestService.checkExistingUser(email);
      
      if (result.exists) {
        if (result.isPatron) {
          // Patron account - ask them to login
          setEmailValidation({
            isValid: false,
            exists: true,
            isPatron: true,
            isGuest: false,
            message: 'This email is registered as a patron account. Please log in to continue.'
          });
          
          toast.error(
            'This email is registered as a patron account. Please log in to continue with your order.',
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
          // Guest account - welcome them back
          setEmailValidation({
            isValid: true,
            exists: true,
            isGuest: true,
            isPatron: false,
            message: `Welcome back, ${result.user.firstName || 'guest'}!`
          });
          
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
        // Email is available - new user
        setEmailValidation({
          isValid: true,
          exists: false,
          isGuest: false,
          isPatron: false,
          message: 'Email is available'
        });
      }
    } catch (error) {
      console.error('Email validation error:', error);
      // On error (like 404), treat as available email
      setEmailValidation({
        isValid: true,
        exists: false,
        isGuest: false,
        isPatron: false,
        message: 'Email is available'
      });
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Validate complete address when all fields are filled
  const validateCompleteAddress = async () => {
    const address = deliveryForm.deliveryAddress;
    if (address?.street && address?.city && address?.state && address?.zipCode) {
      const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
      await validateAddress(fullAddress);
    }
  };

  // Calculate costs for current artisan
  const calculateCosts = () => {
    const subtotal = currentArtisan.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const method = selectedDeliveryMethods[currentArtisanId];
    let deliveryFee = 0;

    if (method === 'pickup') {
      deliveryFee = 0;
    } else if (method === 'personalDelivery') {
      deliveryFee = deliveryOptions[currentArtisanId]?.personalDelivery?.fee || 0;
      // Check if free delivery threshold is met
      if (deliveryOptions[currentArtisanId]?.personalDelivery?.freeDeliveryThreshold && 
          subtotal >= deliveryOptions[currentArtisanId].personalDelivery.freeDeliveryThreshold) {
        deliveryFee = 0;
      }
    } else if (method === 'professionalDelivery') {
      // Use Uber quote if available, otherwise use default fee
      const uberQuote = uberQuotes[currentArtisanId];
      if (uberQuote && uberQuote.fee) {
        deliveryFee = uberQuote.fee;
      } else {
        deliveryFee = deliveryOptions[currentArtisanId]?.professionalDelivery?.fee || 0;
      }
    }

    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee
    };
  };

  const costs = calculateCosts();

  // Check if all selections are complete
  const methodSelected = selectedDeliveryMethods[currentArtisanId];
  const pickupTimeSelected = methodSelected !== 'pickup' || Boolean(selectedPickupTimes[currentArtisanId]);
  
  // For pickup, no address required. For delivery, need complete address or saved address selected
  const deliveryAddressComplete = methodSelected === 'pickup' || 
    (methodSelected !== 'pickup' && useSavedAddress && deliveryForm.deliveryAddress?.street) ||
    Boolean(
      deliveryForm.deliveryAddress?.street && 
      deliveryForm.deliveryAddress?.city &&
      deliveryForm.deliveryAddress?.state &&
      deliveryForm.deliveryAddress?.zipCode
    );
  
  // For guest info, check if email is valid format and not a patron account
  const isEmailFormatValid = deliveryForm.email && isValidEmailFormat(deliveryForm.email);
  const isEmailBlocked = emailValidation.isPatron === true; // Only block if patron detected
  
  const guestInfoComplete = !isGuest || Boolean(
    deliveryForm.firstName && 
    deliveryForm.lastName && 
    isEmailFormatValid &&
    !isEmailBlocked &&
    deliveryForm.phone
  );

  // Check if delivery is within radius
  const deliveryWithinRadius = methodSelected === 'pickup' || !deliveryValidation.distance || deliveryValidation.withinRadius;

  const canProceed = methodSelected && pickupTimeSelected && deliveryAddressComplete && guestInfoComplete && deliveryWithinRadius;

  const handleDeliveryMethodChange = (method) => {
    onDeliveryMethodChange(currentArtisanId, method);
    
    // Clear previous validation when changing method
    setDeliveryValidation({});
    
    // Re-validate address with new method's radius if address already exists
    if (method !== 'pickup' && deliveryForm.deliveryAddress?.street) {
      const address = deliveryForm.deliveryAddress;
      const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
      // Small delay to ensure state is updated
      setTimeout(() => validateAddress(fullAddress), 100);
    }
    
    // Show relevant sections based on selection
    if (method !== 'pickup') {
      setShowAddressOptions(true);
      setShowDeliveryAddress(false); // Don't show address form immediately
      if (isGuest) {
        setShowPersonalInfo(true);
      }
    } else {
      setShowAddressOptions(false);
      setShowDeliveryAddress(false);
      if (isGuest) {
        setShowPersonalInfo(true);
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const getDeliveryMethodIcon = (method) => {
    switch (method) {
      case 'pickup':
        return <MapPinIcon className="w-8 h-8 text-green-600" />;
      case 'personalDelivery':
        return <TruckIcon className="w-8 h-8 text-orange-600" />;
      case 'professionalDelivery':
        return <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />;
      default:
        return <TruckIcon className="w-8 h-8 text-gray-600" />;
    }
  };

  const getDeliveryMethodColor = (method) => {
    switch (method) {
      case 'pickup':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          borderSelected: 'border-green-500',
          bgSelected: 'bg-green-100',
          text: 'text-green-700',
          icon: 'bg-green-100'
        };
      case 'personalDelivery':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          borderSelected: 'border-orange-500',
          bgSelected: 'bg-orange-100',
          text: 'text-orange-700',
          icon: 'bg-orange-100'
        };
      case 'professionalDelivery':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          borderSelected: 'border-blue-500',
          bgSelected: 'bg-blue-100',
          text: 'text-blue-700',
          icon: 'bg-blue-100'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          borderSelected: 'border-gray-500',
          bgSelected: 'bg-gray-100',
          text: 'text-gray-700',
          icon: 'bg-gray-100'
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Delivery Method Selection - Mobile Optimized */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Choose Delivery Method</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {/* Pickup Option - Mobile Optimized */}
                {deliveryOptions[currentArtisanId]?.pickup?.available && (
                  <button 
                    className={`relative p-3 sm:p-4 border-2 rounded-xl text-left transition-all duration-200 min-h-[120px] sm:min-h-[140px] ${
                      selectedDeliveryMethods[currentArtisanId] === 'pickup'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-green-300 hover:shadow-sm active:scale-98'
                    }`}
                    onClick={() => handleDeliveryMethodChange('pickup')}
                  >
                    {selectedDeliveryMethods[currentArtisanId] === 'pickup' && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    )}
                    
                    <div className="flex sm:flex-col sm:text-center gap-3 sm:gap-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 sm:mx-auto sm:mb-3">
                        <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                      <input
                        type="radio"
                        name={`delivery-${currentArtisanId}`}
                        checked={selectedDeliveryMethods[currentArtisanId] === 'pickup'}
                        onChange={() => handleDeliveryMethodChange('pickup')}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Pickup</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">Visit artisan directly</p>
                        <div className="bg-green-100 text-green-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full inline-block font-bold text-xs sm:text-sm">
                          Free
                        </div>
                        <div className="mt-2 sm:mt-3 text-xs text-green-600 font-medium space-y-0.5 sm:space-y-1 hidden sm:block">
                          <div>✓ No delivery fees</div>
                          <div>✓ Meet the artisan</div>
                          <div>✓ Instant pickup</div>
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Personal Delivery Option - Mobile Optimized */}
                {deliveryOptions[currentArtisanId]?.personalDelivery?.available && (
                  <button 
                    className={`relative p-3 sm:p-4 border-2 rounded-xl text-left transition-all duration-200 min-h-[120px] sm:min-h-[140px] ${
                      selectedDeliveryMethods[currentArtisanId] === 'personalDelivery'
                        ? 'border-orange-500 bg-orange-50 shadow-md'
                        : 'border-gray-200 hover:border-orange-300 hover:shadow-sm active:scale-98'
                    }`}
                    onClick={() => handleDeliveryMethodChange('personalDelivery')}
                  >
                    {selectedDeliveryMethods[currentArtisanId] === 'personalDelivery' && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      </div>
                    )}
                    
                    <div className="flex sm:flex-col sm:text-center gap-3 sm:gap-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 sm:mx-auto sm:mb-3">
                        <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      </div>
                      <input
                        type="radio"
                        name={`delivery-${currentArtisanId}`}
                        checked={selectedDeliveryMethods[currentArtisanId] === 'personalDelivery'}
                        onChange={() => handleDeliveryMethodChange('personalDelivery')}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Personal</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">From artisan</p>
                        <div className="bg-orange-100 text-orange-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full inline-block font-bold text-xs sm:text-sm">
                          {deliveryOptions[currentArtisanId]?.personalDelivery?.freeDeliveryThreshold && 
                           costs.subtotal >= deliveryOptions[currentArtisanId].personalDelivery.freeDeliveryThreshold
                            ? 'Free'
                            : formatPrice(deliveryOptions[currentArtisanId]?.personalDelivery?.fee || 0)
                          }
                        </div>
                        <div className="mt-2 sm:mt-3 text-xs text-orange-600 font-medium space-y-0.5 sm:space-y-1 hidden sm:block">
                          <div>✓ Personal service</div>
                          <div>✓ 30-60 min</div>
                          <div>✓ {deliveryOptions[currentArtisanId]?.personalDelivery?.radius || 10}km</div>
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Professional Delivery Option - Mobile Optimized */}
                {deliveryOptions[currentArtisanId]?.professionalDelivery?.available && (
                  <button 
                    className={`relative p-3 sm:p-4 border-2 rounded-xl text-left transition-all duration-200 min-h-[120px] sm:min-h-[140px] ${
                      selectedDeliveryMethods[currentArtisanId] === 'professionalDelivery'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm active:scale-98'
                    }`}
                    onClick={() => handleDeliveryMethodChange('professionalDelivery')}
                  >
                    {selectedDeliveryMethods[currentArtisanId] === 'professionalDelivery' && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    )}
                    
                    <div className="flex sm:flex-col sm:text-center gap-3 sm:gap-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 sm:mx-auto sm:mb-3">
                        <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <input
                        type="radio"
                        name={`delivery-${currentArtisanId}`}
                        checked={selectedDeliveryMethods[currentArtisanId] === 'professionalDelivery'}
                        onChange={() => handleDeliveryMethodChange('professionalDelivery')}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Pro Courier</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                          <span className="font-semibold text-blue-800 sm:inline hidden">Courier Service</span>
                          <span className="font-semibold text-blue-800 sm:hidden">Fast delivery</span>
                        </p>
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full inline-block font-bold text-xs sm:text-sm">
                          {(() => {
                            // Check if we have a valid address with coordinates
                            const hasValidAddress = addressValidation.isValid && addressValidation.coordinates;
                            
                            if (!hasValidAddress) {
                              return "Enter address";
                            }
                            
                            // Show loading state
                            if (loadingUberQuotes.has(currentArtisanId)) {
                              return "Quote...";
                            }
                            
                            // Show quote if available
                            const uberQuote = uberQuotes[currentArtisanId];
                            if (uberQuote && uberQuote.fee) {
                              const estimatedText = uberQuote.estimated ? ' (est.)' : '';
                              return `${formatPrice(uberQuote.fee)}${estimatedText}`;
                            }
                            
                            return "Quote...";
                          })()}
                        </div>
                        <div className="mt-2 sm:mt-3 text-xs text-blue-600 font-medium space-y-0.5 sm:space-y-1 hidden sm:block">
                          <div>✓ Professional courier</div>
                          <div>✓ {(() => {
                            const uberQuote = uberQuotes[currentArtisanId];
                            if (uberQuote && uberQuote.duration) {
                              return `${Math.round(uberQuote.duration)} min`;
                            }
                            return '20-40 min';
                          })()}</div>
                          <div>✓ {deliveryOptions[currentArtisanId]?.professionalDelivery?.serviceRadius || 25}km</div>
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

      {/* Pickup Time Selection */}
      {selectedDeliveryMethods[currentArtisanId] === 'pickup' && pickupTimeWindows[currentArtisanId] && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Select Pickup Time</h3>
                </div>

                {/* Artisan Pickup Address and Distance */}
                <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-900 mb-3 text-lg">Pickup Location</h4>
                      
                      {/* Address Display */}
                      <div className="space-y-2">
                        {deliveryOptions[currentArtisanId]?.pickup?.address ? (
                          <p className="text-green-800 font-medium text-base">
                            📍 {typeof deliveryOptions[currentArtisanId].pickup.address === 'object' 
                              ? `${deliveryOptions[currentArtisanId].pickup.address.street || ''}, ${deliveryOptions[currentArtisanId].pickup.address.city || ''}, ${deliveryOptions[currentArtisanId].pickup.address.state || ''} ${deliveryOptions[currentArtisanId].pickup.address.zipCode || ''}`.trim()
                              : deliveryOptions[currentArtisanId].pickup.address}
                          </p>
                        ) : currentArtisan?.artisan?.address ? (
                          <p className="text-green-800 font-medium text-base">
                            📍 {`${currentArtisan.artisan.address.street || ''}, ${currentArtisan.artisan.address.city || ''}, ${currentArtisan.artisan.address.state || ''} ${currentArtisan.artisan.address.zipCode || ''}`}
                          </p>
                        ) : (
                          <p className="text-green-700 italic">Address not available</p>
                        )}

                        {/* Distance Display - Only for Authenticated Users */}
                        {!isGuest && pickupDistance !== null && (
                          <div className="flex items-center gap-2 mt-3 bg-white px-4 py-3 rounded-xl border border-green-300">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <span className="text-green-700 font-bold">📏</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Distance from your location:</p>
                              <p className="text-lg font-bold text-green-700">
                                {geocodingService.formatDistance(pickupDistance)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Pickup Hours */}
                        {deliveryOptions[currentArtisanId]?.pickup?.hours && (
                          <p className="text-green-700 text-sm mt-2">
                            🕒 <span className="font-semibold">Hours:</span> {deliveryOptions[currentArtisanId].pickup.hours}
                          </p>
                        )}

                        {/* Additional Instructions */}
                        {deliveryOptions[currentArtisanId]?.pickup?.instructions && (
                          <p className="text-green-700 text-sm mt-2">
                            ℹ️ <span className="font-semibold">Instructions:</span> {deliveryOptions[currentArtisanId].pickup.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(showAllPickupTimes[currentArtisanId] 
                      ? pickupTimeWindows[currentArtisanId] 
                      : pickupTimeWindows[currentArtisanId].slice(0, 6)
                    ).map((timeSlot, index) => (
                      <button
                        key={index}
                        onClick={() => onPickupTimeChange(currentArtisanId, timeSlot)}
                        className={`p-4 text-sm rounded-xl border-2 transition-all duration-200 ${
                          selectedPickupTimes[currentArtisanId]?.fullLabel === timeSlot.fullLabel
                            ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        <div className="font-bold text-base">{timeSlot.dateLabel}</div>
                        <div className="text-xs mt-1">{timeSlot.timeSlot.label}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Expand/Collapse Button */}
                  {pickupTimeWindows[currentArtisanId] && pickupTimeWindows[currentArtisanId].length > 6 && (
                    <button
                      onClick={() => setShowAllPickupTimes(prev => ({
                        ...prev,
                        [currentArtisanId]: !prev[currentArtisanId]
                      }))}
                      className="w-full mt-4 px-6 py-3 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl border-2 border-green-200 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {showAllPickupTimes[currentArtisanId] ? (
                        <>
                          <ChevronDownIcon className="w-5 h-5 rotate-180" />
                          <span>Show Less Time Slots</span>
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="w-5 h-5" />
                          <span>View More Time Slots (Next 5 Days - {pickupTimeWindows[currentArtisanId].length - 6} more available)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Address Options Section - Show when delivery method is selected */}
            {showAddressOptions && selectedDeliveryMethods[currentArtisanId] !== 'pickup' && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <MapPinIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-stone-800 font-display">Delivery Address</h3>
                </div>

                {/* Address Selection Options */}
                {!isGuest && (selectedAddress?.street || deliveryForm.deliveryAddress?.street) ? (
                  <div className="space-y-4">
                    <p className="text-stone-600 mb-4">Choose how you'd like to provide your delivery address:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Use Saved Address Option */}
                      <div 
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                          useSavedAddress 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-stone-200 hover:border-amber-300'
                        }`}
                        onClick={() => {
                          onUseSavedAddressChange(true);
                          setShowDeliveryAddress(false);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="radio"
                            checked={useSavedAddress}
                            onChange={() => {
                              onUseSavedAddressChange(true);
                              setShowDeliveryAddress(false);
                            }}
                            className="text-amber-600"
                          />
                          <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                          <h4 className="font-semibold text-stone-800">Use Saved Address</h4>
                        </div>
                        <div className="text-sm text-stone-600">
                          {selectedAddress ? (
                            <>
                              <p className="font-medium">{selectedAddress.street}</p>
                              <p>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium">{deliveryForm.deliveryAddress.street}</p>
                              <p>{deliveryForm.deliveryAddress.city}, {deliveryForm.deliveryAddress.state} {deliveryForm.deliveryAddress.zipCode}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Enter New Address Option */}
                      <div 
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                          !useSavedAddress 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-stone-200 hover:border-amber-300'
                        }`}
                        onClick={() => {
                          onUseSavedAddressChange(false);
                          setShowDeliveryAddress(true);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="radio"
                            checked={!useSavedAddress}
                            onChange={() => {
                              onUseSavedAddressChange(false);
                              setShowDeliveryAddress(true);
                            }}
                            className="text-amber-600"
                          />
                          <MapPinIcon className="w-6 h-6 text-amber-600" />
                          <h4 className="font-semibold text-stone-800">Enter New Address</h4>
                        </div>
                        <p className="text-sm text-stone-600">Provide a different delivery address</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // For guests or when no saved address, show address form directly
                  <div>
                    <p className="text-stone-600 mb-4">Please provide your delivery address:</p>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryAddress(true)}
                      className="btn-primary"
                    >
                      Enter Delivery Address
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Address Form - Show when new address is selected or for guests */}
            {showDeliveryAddress && selectedDeliveryMethods[currentArtisanId] !== 'pickup' && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <MapPinIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Delivery Address</h3>
                  </div>
                  
                  {/* Saved Address Indicator */}
                  {!isGuest && deliveryForm.deliveryAddress?.street && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <CheckCircleIcon className="w-4 h-4" />
                      Saved Address Loaded
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={useSavedAddress ? (deliveryForm.deliveryAddress?.street || '') : (newAddressForm?.street || '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (useSavedAddress) {
                          // Updating saved address fields (shouldn't normally happen)
                          onDeliveryFormChange('deliveryAddress', {
                            ...deliveryForm.deliveryAddress,
                            street: value
                          });
                        } else {
                          // Updating new address form (separate state)
                          onNewAddressChange({
                            ...newAddressForm,
                            street: value
                          });
                        }
                        // Validate address when user stops typing (debounced)
                        if (addressValidationTimeout.current) {
                          clearTimeout(addressValidationTimeout.current);
                        }
                        if (value.length > 10) {
                          addressValidationTimeout.current = setTimeout(() => validateAddress(value), 1000);
                        }
                      }}
                      className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 text-lg ${
                        addressValidation.isValid === false ? 'border-red-300' : 
                        addressValidation.isValid === true ? 'border-green-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter street address"
                    />
                    {/* Address Validation Feedback */}
                    {addressValidation.message && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${
                        addressValidation.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {addressValidation.isValid ? (
                          <CheckCircleIcon className="w-4 h-4" />
                        ) : (
                          <XCircleIcon className="w-4 h-4" />
                        )}
                        <span>{addressValidation.message}</span>
                        {isValidatingAddress && (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                        )}
                      </div>
                    )}
                    {/* Delivery Distance Info */}
                    {deliveryValidation.distance && (
                      <div className={`mt-2 p-3 rounded-lg border ${
                        deliveryValidation.withinRadius ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className={`flex items-center gap-2 text-sm ${
                          deliveryValidation.withinRadius ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {deliveryValidation.withinRadius ? (
                            <CheckCircleIcon className="w-4 h-4" />
                          ) : (
                            <XCircleIcon className="w-4 h-4" />
                          )}
                          <span>
                            Distance: {deliveryValidation.distance.toFixed(1)}km
                            {deliveryValidation.withinRadius ? 
                              ` (within ${deliveryValidation.maxRadius}km radius)` : 
                              ` (outside ${deliveryValidation.maxRadius}km radius)`
                            }
                          </span>
                        </div>
                        {!deliveryValidation.withinRadius && (
                          <p className="text-xs text-red-600 mt-1">
                            Please choose pickup or select a different address within the delivery radius.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        City *
                      </label>
                      <input
                        type="text"
                        value={useSavedAddress ? (deliveryForm.deliveryAddress?.city || '') : (newAddressForm?.city || '')}
                        onChange={(e) => {
                          if (useSavedAddress) {
                            onDeliveryFormChange('deliveryAddress', {
                              ...deliveryForm.deliveryAddress,
                              city: e.target.value
                            });
                          } else {
                            onNewAddressChange({
                              ...newAddressForm,
                              city: e.target.value
                            });
                          }
                        }}
                        className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        State/Province *
                      </label>
                      <input
                        type="text"
                        value={useSavedAddress ? (deliveryForm.deliveryAddress?.state || '') : (newAddressForm?.state || '')}
                        onChange={(e) => {
                          if (useSavedAddress) {
                            onDeliveryFormChange('deliveryAddress', {
                              ...deliveryForm.deliveryAddress,
                              state: e.target.value
                            });
                          } else {
                            onNewAddressChange({
                              ...newAddressForm,
                              state: e.target.value
                            });
                          }
                        }}
                        className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        ZIP/Postal Code *
                      </label>
                      <input
                        type="text"
                        value={useSavedAddress ? (deliveryForm.deliveryAddress?.zipCode || '') : (newAddressForm?.zipCode || '')}
                        onChange={(e) => {
                          if (useSavedAddress) {
                            onDeliveryFormChange('deliveryAddress', {
                              ...deliveryForm.deliveryAddress,
                              zipCode: e.target.value
                            });
                          } else {
                            onNewAddressChange({
                              ...newAddressForm,
                              zipCode: e.target.value
                            });
                          }
                        }}
                        onBlur={validateCompleteAddress}
                        className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                        placeholder="ZIP code"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Delivery Instructions (Optional)
                    </label>
                    <textarea
                      value={useSavedAddress ? (deliveryForm.deliveryAddress?.instructions || '') : (newAddressForm?.instructions || '')}
                      onChange={(e) => {
                        if (useSavedAddress) {
                          onDeliveryFormChange('deliveryAddress', {
                            ...deliveryForm.deliveryAddress,
                            instructions: e.target.value
                          });
                        } else {
                          onNewAddressChange({
                            ...newAddressForm,
                            instructions: e.target.value
                          });
                        }
                      }}
                      rows={4}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                      placeholder="Any special delivery instructions..."
                    />
                  </div>

                  {/* Use Different Address Button */}
                  {!isGuest && deliveryForm.deliveryAddress?.street && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onDeliveryFormChange('deliveryAddress', {
                            street: '',
                            city: '',
                            state: '',
                            zipCode: '',
                            country: 'Canada',
                            instructions: ''
                          });
                          toast.success('Address cleared - enter new address', { duration: 2000 });
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Use Different Address
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

      {/* Personal Information Section (Guest Users) */}
      {isGuest && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Your Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.firstName || ''}
                      onChange={(e) => onDeliveryFormChange('firstName', e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={deliveryForm.lastName || ''}
                      onChange={(e) => onDeliveryFormChange('lastName', e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={deliveryForm.email || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        onDeliveryFormChange('email', value);
                        
                        // Reset validation state when email changes
                        if (value !== lastValidatedEmail) {
                          setEmailValidation({});
                          setLastValidatedEmail(null);
                        }
                        
                        // Clear previous timeout
                        if (emailValidationTimeout) {
                          clearTimeout(emailValidationTimeout);
                        }
                        
                        // Validate email when user stops typing (debounced)
                        // Only if it's a valid email format
                        if (isValidEmailFormat(value)) {
                          const timeout = setTimeout(() => validateEmail(value), 500);
                          setEmailValidationTimeout(timeout);
                        }
                      }}
                      onBlur={(e) => {
                        // Trigger validation immediately on blur if email format is valid
                        const value = e.target.value;
                        if (isValidEmailFormat(value) && value !== lastValidatedEmail) {
                          // Clear any pending timeout first
                          if (emailValidationTimeout) {
                            clearTimeout(emailValidationTimeout);
                          }
                          validateEmail(value);
                        }
                      }}
                      className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 text-lg ${
                        emailValidation.isPatron ? 'border-red-300 bg-red-50' : 
                        emailValidation.isGuest ? 'border-green-300 bg-green-50' : 
                        emailValidation.exists === false ? 'border-green-300' :
                        'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                    {/* Email Validation Feedback */}
                    {isValidatingEmail && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        <span>Checking email...</span>
                      </div>
                    )}
                    {!isValidatingEmail && emailValidation.message && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${
                        emailValidation.isPatron ? 'text-red-600' : 
                        emailValidation.isGuest || emailValidation.exists === false ? 'text-green-600' : 
                        'text-gray-600'
                      }`}>
                        {emailValidation.isPatron ? (
                          <XCircleIcon className="w-4 h-4" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                        <span>{emailValidation.message}</span>
                      </div>
                    )}

                    {/* Login Prompt for Existing Users */}
                    {emailValidation.isPatron && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-red-800 mb-2">Account Found</h4>
                            <p className="text-sm text-red-700 mb-3">
                              This email is already registered. Please sign in to continue with your order and access your saved information.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <a
                                href="/login"
                                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Sign In to Continue
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailValidation({});
                                  setLastValidatedEmail(null);
                                }}
                                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Use Different Email
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Account Creation Suggestion for New Users */}
                    {emailValidation.exists === false && deliveryForm.email && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-800 mb-2">New to BazaarMkt?</h4>
                            <p className="text-sm text-blue-700 mb-3">
                              Create an account to save your information, track orders, and enjoy a faster checkout experience.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <a
                                href="/register?type=patron"
                                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Create Account
                              </a>
                              <span className="text-xs text-blue-600 self-center">
                                or continue as guest below
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={deliveryForm.phone || ''}
                      onChange={(e) => onDeliveryFormChange('phone', e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="mt-8">
        <button
          onClick={onContinue}
          disabled={!canProceed}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
            canProceed
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Payment
          <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
        </button>

        {/* Requirements Notice */}
        {!canProceed && (
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800 font-medium">
                {!methodSelected && "Please select a delivery method"}
                {methodSelected && !pickupTimeSelected && "Please select a pickup time"}
                {methodSelected && pickupTimeSelected && !deliveryAddressComplete && "Please complete and verify delivery address"}
                {methodSelected && pickupTimeSelected && deliveryAddressComplete && !guestInfoComplete && "Please complete and verify contact information"}
                {!deliveryWithinRadius && "Delivery address is outside the service radius"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryInformation;
