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
  getDeliveryOptions: (artisan) => {
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
        available: options.delivery,
        label: 'Personal Delivery',
        description: `Personal delivery within ${options.deliveryRadius}km`,
        fee: options.deliveryFee || 0,
        radius: options.deliveryRadius || 0,
        freeThreshold: options.freeDeliveryThreshold || 0,
        icon: '🚚',
        instructions: artisan.deliveryInstructions || ''
      },
      professionalDelivery: {
        available: options.professionalDelivery?.enabled || false,
        label: 'Professional Delivery',
        description: 'Professional delivery via Uber Direct',
        icon: '🚛',
        uberDirectEnabled: options.professionalDelivery?.uberDirectEnabled || false,
        serviceRadius: options.professionalDelivery?.serviceRadius || 25,
        regions: options.professionalDelivery?.regions || [],
        packaging: options.professionalDelivery?.packaging || '',
        restrictions: options.professionalDelivery?.restrictions || ''
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
  }
};
