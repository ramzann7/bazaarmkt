/**
 * Geocoding Service - Nominatim Integration
 * Uses OpenStreetMap's Nominatim API for free geocoding
 */

const axios = require('axios');

class GeocodingService {
  constructor() {
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'bazaarMKT/1.0 (https://github.com/ramzann7/bazaarmkt)';
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // Nominatim requires 1 request per second
  }

  /**
   * Respect rate limiting - 1 request per second for Nominatim
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Format address for geocoding
   */
  formatAddress(addressComponents) {
    if (typeof addressComponents === 'string') {
      return addressComponents;
    }

    const parts = [];
    if (addressComponents.street) parts.push(addressComponents.street);
    if (addressComponents.city) parts.push(addressComponents.city);
    if (addressComponents.state) parts.push(addressComponents.state);
    if (addressComponents.zipCode) parts.push(addressComponents.zipCode);
    if (addressComponents.country) parts.push(addressComponents.country);
    
    return parts.join(', ');
  }

  /**
   * Geocode an address to coordinates using Nominatim
   */
  async geocodeAddress(address) {
    try {
      await this.rateLimit();

      const formattedAddress = typeof address === 'string' ? address : this.formatAddress(address);
      
      console.log(`🗺️  Geocoding address: ${formattedAddress}`);

      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params: {
          q: formattedAddress,
          format: 'json',
          addressdetails: 1,
          limit: 1
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      if (!response.data || response.data.length === 0) {
        console.warn(`⚠️  No results found for address: ${formattedAddress}`);
        return null;
      }

      const result = response.data[0];
      const confidence = this.calculateConfidence(result);

      const geocodeResult = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
        confidence: confidence,
        address_components: result.address,
        place_id: result.place_id,
        osm_type: result.osm_type,
        osm_id: result.osm_id
      };

      console.log(`✅ Geocoded: ${geocodeResult.latitude}, ${geocodeResult.longitude} (confidence: ${confidence}%)`);
      
      return geocodeResult;
    } catch (error) {
      console.error('❌ Geocoding error:', error.message);
      
      // Return null instead of throwing to allow graceful degradation
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      await this.rateLimit();

      console.log(`🗺️  Reverse geocoding: ${latitude}, ${longitude}`);

      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      if (!response.data) {
        console.warn(`⚠️  No results found for coordinates: ${latitude}, ${longitude}`);
        return null;
      }

      const result = response.data;

      const reverseGeocodeResult = {
        display_name: result.display_name,
        address: result.address,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        place_id: result.place_id,
        osm_type: result.osm_type,
        osm_id: result.osm_id
      };

      console.log(`✅ Reverse geocoded: ${reverseGeocodeResult.display_name}`);
      
      return reverseGeocodeResult;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Calculate confidence score based on geocoding result
   */
  calculateConfidence(result) {
    let confidence = 50; // Base confidence

    // Increase confidence based on place rank (0-30 scale, lower is better)
    if (result.place_rank) {
      confidence += Math.max(0, 30 - result.place_rank);
    }

    // Increase confidence if we have detailed address components
    if (result.address) {
      if (result.address.house_number) confidence += 10;
      if (result.address.road) confidence += 5;
      if (result.address.city || result.address.town || result.address.village) confidence += 5;
      if (result.address.postcode) confidence += 5;
    }

    // Cap at 100
    return Math.min(100, confidence);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Batch geocode multiple addresses (with rate limiting)
   */
  async batchGeocode(addresses) {
    const results = [];
    
    for (const address of addresses) {
      const result = await this.geocodeAddress(address);
      results.push({
        address: address,
        result: result
      });
    }
    
    return results;
  }
}

module.exports = new GeocodingService();
