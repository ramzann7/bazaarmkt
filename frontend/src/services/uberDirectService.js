// src/services/uberDirectService.js
import axios from 'axios';
import config from '../config/environment.js';

const API_URL = config.API_URL;

export const uberDirectService = {
  // Get delivery quote from backend (which calls Uber Direct API)
  async getDeliveryQuote(pickupLocation, dropoffLocation, packageDetails = {}) {
    try {
      const response = await axios.post(`${API_URL}/delivery/uber-direct/quote`, {
        pickupLocation,
        dropoffLocation,
        packageDetails
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error getting Uber Direct quote:', error);
      
      // Fallback to local calculation if API fails
      const distance = uberDirectService.calculateDistance(pickupLocation, dropoffLocation);
      return {
        success: false,
        fallback: {
          fee: uberDirectService.calculateFallbackFee(distance, packageDetails),
          currency: 'CAD',
          duration: Math.max(30, distance * 3),
          pickup_eta: 15,
          estimated: true
        },
        error: 'Unable to connect to delivery service'
      };
    }
  },

  // Calculate delivery fee (fallback when API is unavailable)
  calculateFallbackFee: (distance, packageDetails = {}) => {
    const baseFee = 8; // Base delivery fee
    const perKmFee = 1.5; // Per kilometer fee
    
    // Add package size/weight surcharge
    let surcharge = 0;
    if (packageDetails.weight > 5) {
      surcharge += 3;
    }
    if (packageDetails.dimensions?.length > 50 || packageDetails.dimensions?.width > 50) {
      surcharge += 2;
    }
    
    return Math.round((baseFee + (distance * perKmFee) + surcharge) * 100) / 100;
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

  // Get estimated delivery time using realistic car driving speeds
  getEstimatedDeliveryTime: (origin, destination) => {
    const distance = uberDirectService.calculateDistance(origin, destination);
    
    if (!distance || distance <= 0) {
      return {
        min: 30,
        max: 60,
        unit: 'minutes'
      };
    }
    
    // Use centralized delivery time estimator with professional delivery speeds
    const { getDeliveryTimeRange } = require('../utils/deliveryTimeEstimator');
    const timeRange = getDeliveryTimeRange(distance, 'professionalDelivery');
    
    if (timeRange) {
      return {
        min: timeRange.min,
        max: timeRange.max,
        unit: 'minutes',
        formatted: timeRange.formatted,
        distance: distance
      };
    }
    
    // Fallback calculation
    return {
      min: 30,
      max: 60,
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

  // Create delivery request
  async createDeliveryRequest(quoteId, orderDetails, pickupLocation, dropoffLocation) {
    try {
      const response = await axios.post(`${API_URL}/delivery/uber-direct/create`, {
        quoteId,
        orderDetails,
        pickupLocation,
        dropoffLocation
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error creating Uber Direct delivery:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create delivery request'
      };
    }
  },

  // Get delivery tracking information
  async getDeliveryTracking(deliveryId) {
    try {
      const response = await axios.get(`${API_URL}/delivery/uber-direct/tracking/${deliveryId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting delivery tracking:', error);
      return {
        success: false,
        error: 'Unable to get tracking information'
      };
    }
  },

  // Cancel delivery
  async cancelDelivery(deliveryId, reason = 'Order cancelled') {
    try {
      const response = await axios.post(`${API_URL}/delivery/uber-direct/cancel/${deliveryId}`, {
        reason
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error cancelling delivery:', error);
      return {
        success: false,
        error: 'Failed to cancel delivery'
      };
    }
  },

  // Check availability in area
  async checkAvailability(location) {
    try {
      const response = await axios.post(`${API_URL}/delivery/uber-direct/availability`, {
        location
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error checking availability:', error);
      return {
        available: false,
        reason: 'Unable to check availability'
      };
    }
  }
};
