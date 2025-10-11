// src/services/uberDirectService.js
import api from './apiClient';
import config from '../config/environment.js';

const API_URL = config.API_URL;

export const uberDirectService = {
  // Get delivery quote from backend (which calls Uber Direct API)
  async getDeliveryQuote(pickupLocation, dropoffLocation, packageDetails = {}) {
    try {
      const response = await api.post(`${API_URL}/delivery/uber-direct/quote`, {
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

  // Get delivery quote with buffer for surge protection
  async getDeliveryQuoteWithBuffer(pickupLocation, dropoffLocation, packageDetails = {}, bufferPercentage = 20) {
    try {
      console.log('🚛 Requesting Uber Direct quote with buffer:', { bufferPercentage });
      
      const response = await api.post(`${API_URL}/delivery/uber-direct/quote-with-buffer`, {
        pickupLocation,
        dropoffLocation,
        packageDetails,
        bufferPercentage
      });
      
      console.log('✅ Received buffered quote:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting Uber Direct quote with buffer:', error);
      
      // Fallback calculation with buffer
      const distance = uberDirectService.calculateDistance(pickupLocation, dropoffLocation);
      const baseFee = uberDirectService.calculateFallbackFee(distance, packageDetails);
      const buffer = baseFee * (bufferPercentage / 100);
      
      // Safety check for NaN
      const safeEstimatedFee = isNaN(baseFee) || baseFee === 0 ? 15.00 : baseFee;
      const safeBuffer = isNaN(buffer) ? safeEstimatedFee * 0.20 : buffer;
      const safeChargedAmount = safeEstimatedFee + safeBuffer;
      
      console.log('💰 Fallback calculation:', {
        distance,
        baseFee,
        safeEstimatedFee,
        safeBuffer,
        safeChargedAmount
      });
      
      return {
        success: false,
        fallback: true,
        estimatedFee: safeEstimatedFee.toFixed(2),
        buffer: safeBuffer.toFixed(2),
        bufferPercentage: bufferPercentage,
        chargedAmount: safeChargedAmount.toFixed(2),
        currency: 'CAD',
        duration: Math.max(30, distance * 3) || 45,
        pickupEta: 15,
        estimated: true,
        explanation: `Delivery fee includes ${bufferPercentage}% buffer for surge protection. Any unused amount will be refunded.`,
        error: 'Unable to connect to delivery service - using estimated pricing'
      };
    }
  },

  // Calculate delivery fee (fallback when API is unavailable)
  calculateFallbackFee: (distance, packageDetails = {}) => {
    const baseFee = 8; // Base delivery fee
    const perKmFee = 1.5; // Per kilometer fee
    
    // If distance is 0 or NaN, use a default estimate
    const safeDistance = (distance && !isNaN(distance) && distance > 0) ? distance : 10; // Default 10km if unknown
    
    // Add package size/weight surcharge
    let surcharge = 0;
    if (packageDetails.weight > 5) {
      surcharge += 3;
    }
    if (packageDetails.dimensions?.length > 50 || packageDetails.dimensions?.width > 50) {
      surcharge += 2;
    }
    
    const totalFee = baseFee + (safeDistance * perKmFee) + surcharge;
    return Math.round(totalFee * 100) / 100;
  },

  // Calculate distance between two coordinates
  calculateDistance: (origin, destination) => {
    // Support both lat/lng and latitude/longitude property names
    const originLat = origin?.lat || origin?.latitude;
    const originLng = origin?.lng || origin?.longitude;
    const destLat = destination?.lat || destination?.latitude;
    const destLng = destination?.lng || destination?.longitude;
    
    if (!originLat || !originLng || !destLat || !destLng) {
      console.warn('⚠️ Missing coordinates for distance calculation:', {
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng }
      });
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLng - originLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
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
      const response = await api.post(`${API_URL}/delivery/uber-direct/create`, {
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
      const response = await api.get(`${API_URL}/delivery/uber-direct/tracking/${deliveryId}`);
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
      const response = await api.post(`${API_URL}/delivery/uber-direct/cancel/${deliveryId}`, {
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
      const response = await api.post(`${API_URL}/delivery/uber-direct/availability`, {
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
