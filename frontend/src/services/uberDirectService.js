// src/services/uberDirectService.js

export const uberDirectService = {
  // Calculate Uber Direct delivery fee (simplified version)
  // In a real implementation, this would call Uber's API
  calculateDeliveryFee: (origin, destination, packageDetails = {}) => {
    // This is a simplified calculation
    // In production, you would integrate with Uber Direct API
    const baseFee = 8; // Base delivery fee
    const perKmFee = 1.5; // Per kilometer fee
    
    // Calculate distance (simplified)
    const distance = uberDirectService.calculateDistance(origin, destination);
    
    // Add package size/weight surcharge
    let surcharge = 0;
    if (packageDetails.weight > 5) { // If package is over 5kg
      surcharge += 3;
    }
    if (packageDetails.dimensions?.length > 50 || packageDetails.dimensions?.width > 50) {
      surcharge += 2; // Large package surcharge
    }
    
    return baseFee + (distance * perKmFee) + surcharge;
  },

  // Calculate distance between two coordinates
  calculateDistance: (origin, destination) => {
    if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLon = (destination.lng - origin.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  },

  // Check if Uber Direct is available in the area
  isAvailable: (location) => {
    // This would typically check Uber's coverage API
    // For now, we'll assume it's available in major cities
    const majorCities = ['toronto', 'mississauga', 'brampton', 'vaughan', 'markham', 'richmond hill'];
    const city = location?.city?.toLowerCase() || '';
    return majorCities.includes(city);
  },

  // Get estimated delivery time
  getEstimatedDeliveryTime: (origin, destination) => {
    const distance = uberDirectService.calculateDistance(origin, destination);
    
    // Base time is 30 minutes
    let baseTime = 30;
    
    // Add time based on distance
    if (distance > 10) {
      baseTime += Math.ceil(distance / 10) * 15; // 15 minutes per 10km
    }
    
    return {
      min: baseTime,
      max: baseTime + 30, // Add 30 minutes buffer
      unit: 'minutes'
    };
  },

  // Validate delivery request
  validateDeliveryRequest: (origin, destination, packageDetails) => {
    const errors = [];
    
    if (!origin || !origin.lat || !origin.lng) {
      errors.push('Invalid origin address');
    }
    
    if (!destination || !destination.lat || !destination.lng) {
      errors.push('Invalid destination address');
    }
    
    if (!uberDirectService.isAvailable(destination)) {
      errors.push('Uber Direct is not available in this area');
    }
    
    if (packageDetails.weight > 20) {
      errors.push('Package weight exceeds maximum limit (20kg)');
    }
    
    if (packageDetails.dimensions) {
      const { length, width, height } = packageDetails.dimensions;
      if (length > 100 || width > 100 || height > 100) {
        errors.push('Package dimensions exceed maximum limits');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Create delivery request (placeholder for Uber Direct API integration)
  createDeliveryRequest: async (deliveryDetails) => {
    // This would integrate with Uber Direct API
    // For now, we'll return a mock response
    return {
      success: true,
      deliveryId: `uber_${Date.now()}`,
      estimatedPickup: new Date(Date.now() + 15 * 60000).toISOString(), // 15 minutes from now
      estimatedDelivery: new Date(Date.now() + 45 * 60000).toISOString(), // 45 minutes from now
      fee: deliveryDetails.calculatedFee,
      trackingUrl: `https://uber.com/track/${Date.now()}`
    };
  }
};
