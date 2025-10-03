/**
 * Geocoding Service - Microservices Foundation
 * Handles address geocoding, location services, and geographic data
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class GeocodingService {
  constructor() {
    this.serviceName = 'geocoding-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Geocoding Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Geocoding Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Geocoding Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Geocoding Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Geocoding Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Geocoding Service cache connected');

      this.isInitialized = true;
      console.log('✅ Geocoding Service initialized successfully');
    } catch (error) {
      console.error('❌ Geocoding Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address) {
    try {
      // Check cache first
      const cacheKey = `geocode:${address}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      // For now, we'll use a simple mock geocoding service
      // In production, you would integrate with Google Maps API, OpenStreetMap, etc.
      const mockCoordinates = this.generateMockCoordinates(address);
      
      const geocodeResult = {
        address: address,
        coordinates: {
          latitude: mockCoordinates.latitude,
          longitude: mockCoordinates.longitude
        },
        formattedAddress: address,
        accuracy: 'approximate',
        geocodedAt: new Date()
      };

      // Cache the result for 24 hours
      await CacheService.set(cacheKey, geocodeResult, 86400);

      return {
        success: true,
        data: geocodeResult
      };
    } catch (error) {
      console.error('Geocoding Service - Geocode address error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      // Check cache first
      const cacheKey = `reverse_geocode:${latitude},${longitude}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      // Mock reverse geocoding
      const address = this.generateMockAddress(latitude, longitude);
      
      const reverseGeocodeResult = {
        coordinates: {
          latitude: latitude,
          longitude: longitude
        },
        address: address,
        formattedAddress: address,
        accuracy: 'approximate',
        reverseGeocodedAt: new Date()
      };

      // Cache the result for 24 hours
      await CacheService.set(cacheKey, reverseGeocodeResult, 86400);

      return {
        success: true,
        data: reverseGeocodeResult
      };
    } catch (error) {
      console.error('Geocoding Service - Reverse geocode error:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  async calculateDistance(coord1, coord2, unit = 'km') {
    try {
      const distance = this.haversineDistance(coord1, coord2, unit);
      
      return {
        success: true,
        data: {
          distance: distance,
          unit: unit,
          from: coord1,
          to: coord2,
          calculatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Geocoding Service - Calculate distance error:', error);
      throw error;
    }
  }

  /**
   * Find nearby locations
   */
  async findNearbyLocations(centerCoord, radius = 10, type = 'any') {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const locationsCollection = db.collection('locations');
      
      // For now, return mock nearby locations
      // In production, you would query the database with geospatial queries
      const nearbyLocations = this.generateMockNearbyLocations(centerCoord, radius, type);
      
      await client.close();
      
      return {
        success: true,
        data: {
          center: centerCoord,
          radius: radius,
          type: type,
          locations: nearbyLocations,
          count: nearbyLocations.length,
          searchedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Geocoding Service - Find nearby locations error:', error);
      throw error;
    }
  }

  /**
   * Validate address format
   */
  async validateAddress(address) {
    try {
      const isValid = this.isValidAddressFormat(address);
      const suggestions = isValid ? [] : this.generateAddressSuggestions(address);
      
      return {
        success: true,
        data: {
          address: address,
          isValid: isValid,
          suggestions: suggestions,
          validatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Geocoding Service - Validate address error:', error);
      throw error;
    }
  }

  /**
   * Helper: Generate mock coordinates for an address
   */
  generateMockCoordinates(address) {
    // Simple hash-based coordinate generation for consistent results
    const hash = this.simpleHash(address);
    const latitude = 40.7128 + (hash % 1000) / 10000; // NYC area
    const longitude = -74.0060 + (hash % 1000) / 10000;
    
    return { latitude, longitude };
  }

  /**
   * Helper: Generate mock address from coordinates
   */
  generateMockAddress(latitude, longitude) {
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const streetNames = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Cedar Blvd'];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    
    return `${streetNumber} ${streetName}, City, State, 12345`;
  }

  /**
   * Helper: Generate mock nearby locations
   */
  generateMockNearbyLocations(centerCoord, radius, type) {
    const locations = [];
    const count = Math.floor(Math.random() * 10) + 1;
    
    for (let i = 0; i < count; i++) {
      const offsetLat = (Math.random() - 0.5) * (radius / 111); // Rough conversion to degrees
      const offsetLng = (Math.random() - 0.5) * (radius / 111);
      
      locations.push({
        id: `location_${i}`,
        name: `${type} Location ${i + 1}`,
        coordinates: {
          latitude: centerCoord.latitude + offsetLat,
          longitude: centerCoord.longitude + offsetLng
        },
        distance: Math.random() * radius,
        type: type
      });
    }
    
    return locations.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Helper: Calculate distance using Haversine formula
   */
  haversineDistance(coord1, coord2, unit = 'km') {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Helper: Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Helper: Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Helper: Validate address format
   */
  isValidAddressFormat(address) {
    // Simple validation - check if address has minimum components
    const components = address.split(',').map(c => c.trim());
    return components.length >= 3; // At least street, city, state/country
  }

  /**
   * Helper: Generate address suggestions
   */
  generateAddressSuggestions(address) {
    // Simple suggestions based on common address patterns
    const suggestions = [];
    
    if (!address.includes(',')) {
      suggestions.push(`${address}, City, State`);
      suggestions.push(`${address}, City, State, ZIP`);
    }
    
    if (!address.match(/\d/)) {
      suggestions.push(`123 ${address}`);
    }
    
    return suggestions;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        service: this.serviceName,
        status: 'healthy',
        version: this.version,
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.serviceName,
      version: this.version,
      initialized: this.isInitialized,
      endpoints: [
        'POST /api/geocoding/address',
        'GET /api/geocoding/reverse',
        'POST /api/geocoding/distance',
        'GET /api/geocoding/nearby',
        'POST /api/geocoding/validate'
      ]
    };
  }
}

module.exports = new GeocodingService();
