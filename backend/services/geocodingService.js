/**
 * Geocoding Service
 * Handles geocoding, reverse geocoding, distance calculations, and location-based queries
 */

const BaseService = require('./BaseService');

class GeocodingService extends BaseService {
  constructor(db) {
    super(db);
    this.artisansCollection = 'artisans';
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address) {
    // This would typically call an external geocoding service
    // For now, return mock data
    return {
      latitude: 45.5017,
      longitude: -73.5673,
      display_name: `${address}, Montreal, QC, Canada`,
      confidence: 85
    };
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    // This would typically call an external reverse geocoding service
    // For now, return mock data
    return {
      address: '123 Main St, Montreal, QC, Canada',
      city: 'Montreal',
      province: 'Quebec',
      country: 'Canada',
      postal_code: 'H1A 1A1'
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
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
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
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
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  }

  /**
   * Get nearby artisans based on coordinates
   */
  async getNearbyArtisans(latitude, longitude, maxDistance = 50) {
    // Get all artisans with coordinates
    const artisans = await this.find(this.artisansCollection, {
      'coordinates.latitude': { $exists: true },
      'coordinates.longitude': { $exists: true }
    });
    
    // Calculate distances and filter
    const nearbyArtisans = artisans
      .map(artisan => {
        const distance = this.calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          artisan.coordinates.latitude,
          artisan.coordinates.longitude
        );
        
        return {
          artisan: artisan,
          distance: distance,
          formattedDistance: this.formatDistance(distance)
        };
      })
      .filter(item => item.distance <= parseFloat(maxDistance))
      .sort((a, b) => a.distance - b.distance);
    
    return {
      artisans: nearbyArtisans,
      count: nearbyArtisans.length,
      searchParams: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        maxDistance: parseFloat(maxDistance)
      }
    };
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid coordinates format');
    }
    
    if (lat < -90 || lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    
    if (lon < -180 || lon > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    
    return { latitude: lat, longitude: lon };
  }

  /**
   * Get distance between two addresses
   */
  async getDistanceBetweenAddresses(address1, address2) {
    try {
      const coords1 = await this.geocodeAddress(address1);
      const coords2 = await this.geocodeAddress(address2);
      
      const distance = this.calculateDistance(
        coords1.latitude,
        coords1.longitude,
        coords2.latitude,
        coords2.longitude
      );
      
      return {
        distance,
        formattedDistance: this.formatDistance(distance),
        coordinates: {
          from: coords1,
          to: coords2
        }
      };
    } catch (error) {
      this.handleError(error, 'Distance calculation between addresses');
    }
  }

  /**
   * Search artisans by location
   */
  async searchArtisansByLocation(latitude, longitude, radius = 25, options = {}) {
    const { limit = 20, category, type } = options;
    
    // Get nearby artisans
    const result = await this.getNearbyArtisans(latitude, longitude, radius);
    
    // Apply additional filters
    let filteredArtisans = result.artisans;
    
    if (category) {
      filteredArtisans = filteredArtisans.filter(item => 
        item.artisan.category === category
      );
    }
    
    if (type) {
      filteredArtisans = filteredArtisans.filter(item => 
        item.artisan.type === type
      );
    }
    
    // Apply limit
    filteredArtisans = filteredArtisans.slice(0, limit);
    
    return {
      artisans: filteredArtisans,
      count: filteredArtisans.length,
      searchParams: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        category,
        type,
        limit
      }
    };
  }

  /**
   * Get location statistics
   */
  async getLocationStats() {
    const artisans = await this.find(this.artisansCollection, {
      'coordinates.latitude': { $exists: true },
      'coordinates.longitude': { $exists: true }
    });
    
    const cities = {};
    const provinces = {};
    
    artisans.forEach(artisan => {
      if (artisan.location) {
        const city = artisan.location.city;
        const province = artisan.location.province;
        
        if (city) {
          cities[city] = (cities[city] || 0) + 1;
        }
        
        if (province) {
          provinces[province] = (provinces[province] || 0) + 1;
        }
      }
    });
    
    return {
      totalArtisansWithLocation: artisans.length,
      cities: Object.entries(cities)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
      provinces: Object.entries(provinces)
        .map(([province, count]) => ({ province, count }))
        .sort((a, b) => b.count - a.count)
    };
  }
}

module.exports = GeocodingService;