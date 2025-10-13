const https = require('https');

class GeocodingService {
  constructor() {
    this.baseUrl = 'nominatim.openstreetmap.org';
    this.userAgent = 'bazaar/1.0 (https://github.com/ramzann7/bazaarmkt)';
    this.lastRequestTime = 0;
    this.rateLimitDelay = 1000; // 1 second between requests
  }

  /**
   * Rate limit requests to respect Nominatim usage policy
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Geocode an address to get latitude/longitude coordinates
   * @param {Object} address - Address object with street, city, state, zipCode, country
   * @returns {Promise<Object|null>} - Coordinates object or null if failed
   */
  async geocodeAddress(address) {
    try {
      // Build full address string
      const addressParts = [
        address.street,
        address.city || address.province,
        address.state || address.province,
        address.zipCode || address.postalCode,
        address.country || 'Canada'
      ].filter(Boolean);
      
      const fullAddress = addressParts.join(', ');
      
      if (!fullAddress || fullAddress === 'Canada' || fullAddress.trim() === '') {
        console.log('⚠️  Geocoding skipped: No valid address');
        return null;
      }
      
      // Rate limiting
      await this.rateLimit();
      
      console.log(`🌍 Geocoding address: ${fullAddress}`);
      
      return new Promise((resolve, reject) => {
        const path = `/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&addressdetails=1&countrycodes=ca`;
        
        const options = {
          hostname: this.baseUrl,
          path: path,
          method: 'GET',
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json'
          }
        };
        
        const req = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              const results = JSON.parse(data);
              
              if (!results || results.length === 0) {
                console.log(`⚠️  No geocoding results for: ${fullAddress}`);
                resolve(null);
                return;
              }
              
              const result = results[0];
              const coordinates = {
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                display_name: result.display_name,
                address: result.address,
                confidence: this.calculateConfidence(result)
              };
              
              console.log(`✅ Geocoded successfully: ${coordinates.latitude}, ${coordinates.longitude}`);
              console.log(`   Location: ${coordinates.display_name}`);
              
              resolve(coordinates);
            } catch (error) {
              console.error('❌ Error parsing geocoding response:', error);
              resolve(null);
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('❌ Geocoding request error:', error);
          resolve(null); // Don't reject, just return null
        });
        
        req.end();
      });
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate confidence score for geocoding result
   * @param {Object} result - Nominatim result object
   * @returns {number} - Confidence score 0-100
   */
  calculateConfidence(result) {
    let confidence = 50; // Base confidence
    
    // Increase confidence based on place type
    const placeType = result.type || '';
    if (placeType === 'house' || placeType === 'building') {
      confidence += 30;
    } else if (placeType === 'street' || placeType === 'residential') {
      confidence += 20;
    } else if (placeType === 'city' || placeType === 'town') {
      confidence += 10;
    }
    
    // Increase confidence if we have detailed address components
    if (result.address) {
      if (result.address.house_number) confidence += 10;
      if (result.address.road) confidence += 5;
      if (result.address.postcode) confidence += 5;
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Reverse geocode coordinates to get address
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async reverseGeocode(latitude, longitude) {
    try {
      await this.rateLimit();
      
      console.log(`🌍 Reverse geocoding: ${latitude}, ${longitude}`);
      
      return new Promise((resolve, reject) => {
        const path = `/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
        
        const options = {
          hostname: this.baseUrl,
          path: path,
          method: 'GET',
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json'
          }
        };
        
        const req = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              const result = JSON.parse(data);
              
              if (!result || result.error) {
                console.log(`⚠️  No reverse geocoding results`);
                resolve(null);
                return;
              }
              
              console.log(`✅ Reverse geocoded successfully: ${result.display_name}`);
              resolve(result);
            } catch (error) {
              console.error('❌ Error parsing reverse geocoding response:', error);
              resolve(null);
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('❌ Reverse geocoding request error:', error);
          resolve(null);
        });
        
        req.end();
      });
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new GeocodingService();
