// Geocoding service using Nominatim for address-to-coordinates conversion
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';

class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'TheBazaar/1.0 (https://github.com/ramzann7/bazaarmkt)';
    this.rateLimitDelay = 1000; // 1 second delay between requests
    this.lastRequestTime = 0;
  }

  // Convert address to coordinates (latitude, longitude)
  async geocodeAddress(address) {
    try {
      // Check cache first
      const cacheKey = `geocode_${this.hashAddress(address)}`;
      const cached = cacheService.get(cacheKey);
      if (cached) {
        console.log('📍 Using cached geocode for:', address);
        return cached;
      }

      // Rate limiting
      await this.rateLimit();

      console.log('🌍 Geocoding address:', address);
      
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        countrycodes: 'ca' // Focus on Canada
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No geocoding results for:', address);
        return null;
      }

      const result = data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
        address: result.address,
        confidence: this.calculateConfidence(result)
      };

      console.log('✅ Geocoded successfully:', coordinates);
      
      // Cache the result
      cacheService.set(cacheKey, coordinates, CACHE_TTL.GEOCODING);
      
      return coordinates;
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }

  // Convert coordinates to address (reverse geocoding)
  async reverseGeocode(latitude, longitude) {
    try {
      const cacheKey = `reverse_geocode_${latitude}_${longitude}`;
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      await this.rateLimit();

      const params = new URLSearchParams({
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      const result = {
        display_name: data.display_name,
        address: data.address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      cacheService.set(cacheKey, result, CACHE_TTL.GEOCODING);
      return result;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return null;
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  // Calculate distance between two coordinate objects
  calculateDistanceBetween(coords1, coords2) {
    if (!coords1 || !coords2 || 
        !coords1.latitude || !coords1.longitude || 
        !coords2.latitude || !coords2.longitude) {
      return null;
    }

    return this.calculateDistance(
      coords1.latitude, coords1.longitude,
      coords2.latitude, coords2.longitude
    );
  }

  // Format address for geocoding
  formatAddress(addressComponents) {
    const parts = [];
    
    if (addressComponents.street) parts.push(addressComponents.street);
    if (addressComponents.city) parts.push(addressComponents.city);
    if (addressComponents.state) parts.push(addressComponents.state);
    if (addressComponents.zipCode) parts.push(addressComponents.zipCode);
    if (addressComponents.country) parts.push(addressComponents.country);
    
    return parts.join(', ');
  }

  // Geocode user address and save to profile
  async geocodeUserAddress(userId, addressComponents) {
    try {
      const formattedAddress = this.formatAddress(addressComponents);
      const coordinates = await this.geocodeAddress(formattedAddress);
      
      if (coordinates) {
        // Save coordinates to user profile
        await this.saveUserCoordinates(userId, coordinates);
        return coordinates;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error geocoding user address:', error);
      return null;
    }
  }

  // Save coordinates to user profile
  async saveUserCoordinates(userId, coordinates) {
    try {
      const { profileService } = await import('./profileService');
      
      await profileService.updateProfile({
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          lastUpdated: new Date().toISOString()
        }
      });
      
      console.log('✅ Saved coordinates for user:', userId);
    } catch (error) {
      console.error('❌ Error saving coordinates:', error);
    }
  }

  // Get user coordinates
  async getUserCoordinates(userId) {
    try {
      const { getProfile } = await import('./authservice');
      const profile = await getProfile();
      
      if (profile.coordinates) {
        return {
          latitude: profile.coordinates.latitude,
          longitude: profile.coordinates.longitude,
          lastUpdated: profile.coordinates.lastUpdated
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting user coordinates:', error);
      return null;
    }
  }

  // Calculate confidence score for geocoding result
  calculateConfidence(result) {
    let confidence = 0;
    
    // Check if we have detailed address components
    if (result.address) {
      if (result.address.house_number) confidence += 20;
      if (result.address.street) confidence += 20;
      if (result.address.city) confidence += 20;
      if (result.address.state) confidence += 20;
      if (result.address.postcode) confidence += 20;
    }
    
    // Check importance score (Nominatim's relevance score)
    if (result.importance) {
      confidence += Math.min(result.importance * 100, 50);
    }
    
    return Math.min(confidence, 100);
  }

  // Rate limiting to respect Nominatim's usage policy
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Hash address for cache key
  hashAddress(address) {
    return btoa(address).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get distance in human-readable format
  formatDistance(distance) {
    if (distance === null || distance === undefined) {
      return 'Unknown distance';
    }
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  }

  // Check if coordinates are valid
  isValidCoordinates(latitude, longitude) {
    return latitude >= -90 && latitude <= 90 && 
           longitude >= -180 && longitude <= 180;
  }

  // Batch geocode multiple addresses
  async batchGeocode(addresses) {
    const results = [];
    
    for (const address of addresses) {
      try {
        const coordinates = await this.geocodeAddress(address);
        results.push({ address, coordinates });
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('❌ Error in batch geocoding:', error);
        results.push({ address, coordinates: null });
      }
    }
    
    return results;
  }
}

// Create singleton instance
export const geocodingService = new GeocodingService();
export default geocodingService;
