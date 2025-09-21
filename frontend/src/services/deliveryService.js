// src/services/deliveryService.js

export const deliveryService = {
  // Calculate delivery fee based on distance and artisan settings
  calculateDeliveryFee: (distance, artisanDeliveryOptions, deliveryType = 'personalDelivery') => {
    if (deliveryType === 'personalDelivery') {
      if (!artisanDeliveryOptions.delivery) {
        return 0; // No personal delivery available
      }

      const { deliveryFee, deliveryRadius, freeDeliveryThreshold } = artisanDeliveryOptions;
      
      if (distance > deliveryRadius) {
        return null; // Outside delivery radius
      }

      // Check if order qualifies for free delivery
      if (freeDeliveryThreshold > 0) {
        // This would need to be passed from the cart total
        // For now, we'll return the base fee
      }

      // Base delivery fee
      let fee = deliveryFee || 0;

      // Add distance-based fee (optional enhancement)
      if (distance > 5) { // If delivery is more than 5km
        fee += Math.ceil((distance - 5) / 5) * 2; // $2 per additional 5km
      }

      return fee;
    } else if (deliveryType === 'professionalDelivery') {
      if (!artisanDeliveryOptions.professionalDelivery?.enabled) {
        return 0; // No professional delivery available
      }

      const { serviceRadius } = artisanDeliveryOptions.professionalDelivery;
      
      if (distance > serviceRadius) {
        return null; // Outside service radius
      }

      // For professional delivery, we'll use Uber Direct pricing
      // This would typically be calculated by Uber's API
      // For now, we'll use a base fee plus distance-based calculation
      const baseFee = 8; // Base Uber Direct fee
      const perKmFee = 1.5; // Per kilometer fee
      
      return baseFee + (distance * perKmFee);
    }

    return 0;
  },

  // Check if delivery is available based on distance
  isDeliveryAvailable: (distance, artisanDeliveryOptions, deliveryType = 'personalDelivery') => {
    if (deliveryType === 'personalDelivery') {
      if (!artisanDeliveryOptions.delivery) {
        return false;
      }
      return distance <= artisanDeliveryOptions.deliveryRadius;
    } else if (deliveryType === 'professionalDelivery') {
      if (!artisanDeliveryOptions.professionalDelivery?.enabled) {
        return false;
      }
      return distance <= artisanDeliveryOptions.professionalDelivery.serviceRadius;
    }
    return false;
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  },

  // Get delivery options for an artisan
  getDeliveryOptions: (artisan, userLocation = null) => {
    console.log('🔄 deliveryService.getDeliveryOptions called for artisan:', artisan);
    console.log('🔄 Artisan deliveryOptions:', artisan.deliveryOptions);
    console.log('🔄 User location:', userLocation);
    
    const options = artisan.deliveryOptions || {
      pickup: true,
      delivery: false,
      deliveryRadius: 0,
      deliveryFee: 0,
      freeDeliveryThreshold: 0,
      professionalDelivery: {
        enabled: false,
        uberDirectEnabled: false,
        serviceRadius: 25,
        regions: [],
        packaging: '',
        restrictions: ''
      }
    };

    // Debug logging for delivery options
    console.log('🔄 deliveryService.getDeliveryOptions called for artisan:', artisan.artisanName);
    console.log('🔄 Raw delivery options:', options);
    console.log('🔄 Personal delivery availability check:', {
      delivery: options.delivery,
      deliveryRadius: options.deliveryRadius,
      deliveryFee: options.deliveryFee,
      willBeAvailable: options.delivery || (options.deliveryRadius > 0 && options.deliveryFee >= 0)
    });

    // Determine pickup address
    let pickupAddress = artisan.pickupLocation || '';
    let pickupAddressDetails = null;
    
    if (artisan.pickupUseBusinessAddress && artisan.address) {
      // Use business address from overview
      pickupAddress = `${artisan.address.street}, ${artisan.address.city}, ${artisan.address.state} ${artisan.address.zipCode}`;
      pickupAddressDetails = artisan.address;
    } else if (artisan.pickupAddress) {
      // Use custom pickup address
      pickupAddress = `${artisan.pickupAddress.street}, ${artisan.pickupAddress.city}, ${artisan.pickupAddress.state} ${artisan.pickupAddress.zipCode}`;
      pickupAddressDetails = artisan.pickupAddress;
    }

    // Check if personal delivery is available based on user location and artisan radius
    let personalDeliveryAvailable = false;
    let personalDeliveryReason = '';
    
    if (options.delivery && options.deliveryRadius > 0) {
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        // Calculate distance between user and artisan
        const artisanLat = artisan.address?.latitude || artisan.coordinates?.latitude;
        const artisanLng = artisan.address?.longitude || artisan.coordinates?.longitude;
        
        if (artisanLat && artisanLng) {
          const distance = deliveryService.calculateDistance(
            userLocation.latitude, 
            userLocation.longitude, 
            artisanLat, 
            artisanLng
          );
          
          console.log('📍 Distance calculation:', {
            userLocation: { lat: userLocation.latitude, lng: userLocation.longitude },
            artisanLocation: { lat: artisanLat, lng: artisanLng },
            distance: distance,
            deliveryRadius: options.deliveryRadius,
            withinRadius: distance <= options.deliveryRadius
          });
          
          if (distance <= options.deliveryRadius) {
            personalDeliveryAvailable = true;
            personalDeliveryReason = `Within ${options.deliveryRadius}km delivery radius (${distance.toFixed(1)}km away)`;
          } else {
            personalDeliveryAvailable = false;
            personalDeliveryReason = `Outside ${options.deliveryRadius}km delivery radius (${distance.toFixed(1)}km away)`;
          }
        } else {
          personalDeliveryAvailable = false;
          personalDeliveryReason = 'Artisan location not available for distance calculation';
        }
      } else {
        personalDeliveryAvailable = false;
        personalDeliveryReason = 'User location required to check delivery availability';
      }
    } else {
      personalDeliveryAvailable = false;
      personalDeliveryReason = 'Personal delivery not configured by artisan';
    }

    return {
      pickup: {
        available: options.pickup,
        label: 'Pickup',
        description: 'Pick up your order from the artisan\'s location',
        icon: '🏪',
        location: pickupAddress,
        address: pickupAddressDetails,
        instructions: artisan.pickupInstructions || '',
        hours: artisan.pickupHours || '',
        schedule: artisan.pickupSchedule || null,
        useBusinessAddress: artisan.pickupUseBusinessAddress || false
      },
      personalDelivery: {
        available: personalDeliveryAvailable,
        label: 'Personal Delivery',
        description: personalDeliveryAvailable 
          ? personalDeliveryReason 
          : personalDeliveryReason || 'Personal delivery not available',
        fee: options.deliveryFee || 0,
        radius: options.deliveryRadius || 0,
        freeThreshold: options.freeDeliveryThreshold || 0,
        icon: '🚚',
        instructions: artisan.deliveryInstructions || '',
        properlyConfigured: options.delivery && options.deliveryRadius > 0 && options.deliveryFee >= 0,
        reason: personalDeliveryReason
      },
      professionalDelivery: {
        available: artisan.professionalDelivery?.enabled || false,
        label: 'Professional Delivery',
        description: 'Professional delivery via Uber Direct',
        icon: '🚛',
        uberDirectEnabled: artisan.professionalDelivery?.uberDirectEnabled || false,
        serviceRadius: artisan.professionalDelivery?.serviceRadius || 25,
        regions: artisan.professionalDelivery?.regions || [],
        packaging: artisan.professionalDelivery?.packaging || '',
        restrictions: artisan.professionalDelivery?.restrictions || ''
      }
    };
  },

  // Validate delivery address against artisan location
  validateDeliveryAddress: (deliveryAddress, artisanLocation) => {
    if (!artisanLocation || !deliveryAddress) {
      return { valid: false, error: 'Missing location information' };
    }

    // For now, we'll assume delivery is valid if artisan offers delivery
    // In a real implementation, you'd geocode the addresses and calculate distance
    return { valid: true, distance: null };
  },

  // Get estimated delivery time
  getEstimatedDeliveryTime: (deliveryOption, artisanHours) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[currentDay];
    
    const todayHours = artisanHours?.[currentDayName];
    
    if (!todayHours || todayHours.closed) {
      return { available: false, message: 'Artisan is closed today' };
    }

    if (deliveryOption === 'pickup') {
      // For pickup, check if artisan is currently open
      const openHour = parseInt(todayHours.open.split(':')[0]);
      const closeHour = parseInt(todayHours.close.split(':')[0]);
      
      if (currentHour >= openHour && currentHour < closeHour) {
        return { 
          available: true, 
          estimatedTime: '1-2 hours',
          message: 'Ready for pickup in 1-2 hours'
        };
      } else {
        return { 
          available: false, 
          message: `Artisan is open ${todayHours.open} - ${todayHours.close}` 
        };
      }
    } else if (deliveryOption === 'delivery') {
      // For delivery, add extra time
      return { 
        available: true, 
        estimatedTime: '2-4 hours',
        message: 'Estimated delivery in 2-4 hours'
      };
    }

    return { available: false, message: 'Invalid delivery option' };
  },

  // Format delivery address for display
  formatDeliveryAddress: (address) => {
    if (!address) return '';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
  },

  // Get delivery method label
  getDeliveryMethodLabel: (method) => {
    switch (method) {
      case 'pickup':
        return 'Pickup';
      case 'personalDelivery':
        return 'Personal Delivery';
      case 'professionalDelivery':
        return 'Professional Delivery';
      default:
        return 'Unknown';
    }
  },

  // Get delivery method icon
  getDeliveryMethodIcon: (method) => {
    switch (method) {
      case 'pickup':
        return '🏪';
      case 'personalDelivery':
        return '🚚';
      case 'professionalDelivery':
        return '🚛';
      default:
        return '📦';
    }
  },

  // Structure delivery options for consistent use across components
  structureDeliveryOptions: (artisanDeliveryOptions, userLocation = null, artisan = null, isGuestUser = false, isPatronUser = false) => {
    if (!artisanDeliveryOptions) {
      return {
        pickup: { available: false },
        personalDelivery: { available: false },
        professionalDelivery: { available: false }
      };
    }

    const { pickup, delivery, deliveryRadius, deliveryFee, freeDeliveryThreshold } = artisanDeliveryOptions;
    
    // Check if personal delivery is available based on user location and artisan radius
    let personalDeliveryAvailable = false;
    let personalDeliveryReason = '';
    
    if (delivery && deliveryRadius > 0) {
      if (userLocation && userLocation.latitude && userLocation.longitude && artisan) {
        // Calculate distance between user and artisan
        const artisanLat = artisan.address?.latitude || artisan.coordinates?.latitude;
        const artisanLng = artisan.address?.longitude || artisan.coordinates?.longitude;
        
        if (artisanLat && artisanLng) {
          const distance = deliveryService.calculateDistance(
            userLocation.latitude, 
            userLocation.longitude, 
            artisanLat, 
            artisanLng
          );
          
          if (distance <= deliveryRadius) {
            personalDeliveryAvailable = true;
            personalDeliveryReason = `Within ${deliveryRadius}km delivery radius (${distance.toFixed(1)}km away)`;
          } else {
            personalDeliveryAvailable = false;
            personalDeliveryReason = `Outside ${deliveryRadius}km delivery radius (${distance.toFixed(1)}km away)`;
          }
        } else {
          personalDeliveryAvailable = false;
          personalDeliveryReason = 'Artisan location not available for distance calculation';
        }
      } else if (isGuestUser || isPatronUser) {
        // For guest users and patrons without location, show as available but pending validation
        personalDeliveryAvailable = true;
        personalDeliveryReason = `Available within ${deliveryRadius}km radius (address validation required)`;
      } else {
        personalDeliveryAvailable = false;
        personalDeliveryReason = 'User location required to check delivery availability';
      }
    } else {
      personalDeliveryAvailable = false;
      personalDeliveryReason = 'Personal delivery not configured by artisan';
    }
    
    return {
      pickup: {
        available: pickup || false,
        location: artisanDeliveryOptions.pickupLocation || 'Artisan location',
        instructions: artisanDeliveryOptions.pickupInstructions || '',
        hours: artisanDeliveryOptions.pickupHours || 'Business hours'
      },
      personalDelivery: {
        available: personalDeliveryAvailable,
        radius: deliveryRadius || 0,
        fee: deliveryFee || 0,
        freeThreshold: freeDeliveryThreshold || 0,
        instructions: artisanDeliveryOptions.deliveryInstructions || '',
        reason: personalDeliveryReason
      },
      professionalDelivery: {
        available: artisanDeliveryOptions.professionalDelivery?.enabled || false,
        serviceRadius: artisanDeliveryOptions.professionalDelivery?.serviceRadius || 25,
        packaging: artisanDeliveryOptions.professionalDelivery?.packaging || 'Standard',
        restrictions: artisanDeliveryOptions.professionalDelivery?.restrictions || 'None'
      }
    };
  }
};
