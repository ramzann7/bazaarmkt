// src/services/deliveryService.js

export const deliveryService = {
  // Calculate delivery fee based on distance and artisan settings
  calculateDeliveryFee: (distance, artisanDeliveryOptions) => {
    if (!artisanDeliveryOptions.delivery) {
      return 0; // No delivery available
    }

    const { deliveryFee, deliveryRadius } = artisanDeliveryOptions;
    
    if (distance > deliveryRadius) {
      return null; // Outside delivery radius
    }

    // Base delivery fee
    let fee = deliveryFee || 0;

    // Add distance-based fee (optional enhancement)
    if (distance > 5) { // If delivery is more than 5km
      fee += Math.ceil((distance - 5) / 5) * 2; // $2 per additional 5km
    }

    return fee;
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
      deliveryFee: 0
    };

    return {
      pickup: {
        available: options.pickup,
        label: 'Pickup',
        description: 'Pick up your order from the artisan\'s location',
        icon: '🏪'
      },
      delivery: {
        available: options.delivery,
        label: 'Delivery',
        description: `Delivery within ${options.deliveryRadius}km`,
        fee: options.deliveryFee,
        radius: options.deliveryRadius,
        icon: '🚚'
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
      case 'delivery':
        return 'Delivery';
      default:
        return 'Unknown';
    }
  },

  // Get delivery method icon
  getDeliveryMethodIcon: (method) => {
    switch (method) {
      case 'pickup':
        return '🏪';
      case 'delivery':
        return '🚚';
      default:
        return '📦';
    }
  }
};
