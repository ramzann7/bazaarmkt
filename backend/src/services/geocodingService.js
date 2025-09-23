// Backend geocoding service using Nominatim
const axios = require('axios');

class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'bazaar/1.0 (https://github.com/ramzann7/bazaarmkt)';
    this.rateLimitDelay = 1000; // 1 second delay between requests
    this.lastRequestTime = 0;
  }

  // Convert address to coordinates
  async geocodeAddress(address) {
    try {
      // Rate limiting
      await this.rateLimit();

      console.log('🌍 Backend geocoding address:', address);
      
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        countrycodes: 'ca' // Focus on Canada
      });

      const response = await axios.get(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.data || response.data.length === 0) {
        console.warn('⚠️ No geocoding results for:', address);
        return null;
      }

      const result = response.data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
        address: result.address,
        confidence: this.calculateConfidence(result)
      };

      console.log('✅ Backend geocoded successfully:', coordinates);
      return coordinates;
    } catch (error) {
      console.error('❌ Backend geocoding error:', error.message);
      return null;
    }
  }

  // Reverse geocoding
  async reverseGeocode(latitude, longitude) {
    try {
      await this.rateLimit();

      const params = new URLSearchParams({
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      });

      const response = await axios.get(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      
      const result = {
        display_name: data.display_name,
        address: data.address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      return result;
    } catch (error) {
      console.error('❌ Backend reverse geocoding error:', error.message);
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

  // Calculate confidence score
  calculateConfidence(result) {
    let confidence = 0;
    
    if (result.address) {
      if (result.address.house_number) confidence += 20;
      if (result.address.street) confidence += 20;
      if (result.address.city) confidence += 20;
      if (result.address.state) confidence += 20;
      if (result.address.postcode) confidence += 20;
    }
    
    if (result.importance) {
      confidence += Math.min(result.importance * 100, 50);
    }
    
    return Math.min(confidence, 100);
  }

  // Rate limiting
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Check if coordinates are valid
  isValidCoordinates(latitude, longitude) {
    return latitude >= -90 && latitude <= 90 && 
           longitude >= -180 && longitude <= 180;
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
}

module.exports = new GeocodingService();
