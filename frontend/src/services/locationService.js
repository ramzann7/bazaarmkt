// Location service for managing user location data
import { geocodingService } from './geocodingService';

class LocationService {
  constructor() {
    this.locationKey = 'user_location';
    this.promptShownKey = 'location_prompt_shown';
  }

  // Get cached user location
  getUserLocation() {
    try {
      // Try memory cache first for immediate access
      if (typeof window !== 'undefined' && window.__cachedUserLocation) {
        const cached = window.__cachedUserLocation;
        // Check if still valid (not older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (cached.timestamp && cached.timestamp > thirtyDaysAgo) {
          console.log('📍 Using memory-cached location');
          return cached;
        }
      }

      const locationData = localStorage.getItem(this.locationKey);
      if (locationData) {
        const location = JSON.parse(locationData);
        
        // Check if location is still valid (not older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (location.timestamp && location.timestamp > thirtyDaysAgo) {
          // Cache in memory for next access
          if (typeof window !== 'undefined') {
            window.__cachedUserLocation = location;
          }
          console.log('📍 Using localStorage-cached location');
          return location;
        } else {
          // Location is too old, remove it
          console.log('⚠️ Cached location is too old, clearing...');
          this.clearUserLocation();
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user location:', error);
      return null;
    }
  }

  // Save user location
  saveUserLocation(locationData) {
    try {
      // Validate location data
      if (!locationData || !locationData.lat || !locationData.lng) {
        console.error('❌ Invalid location data provided:', locationData);
        return false;
      }

      // Validate coordinates are valid numbers
      const lat = parseFloat(locationData.lat);
      const lng = parseFloat(locationData.lng);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('❌ Invalid coordinates:', { lat, lng });
        return false;
      }

      const dataToSave = {
        ...locationData,
        lat,
        lng,
        timestamp: Date.now()
      };
      
      console.log('💾 Saving location to cache:', dataToSave);
      localStorage.setItem(this.locationKey, JSON.stringify(dataToSave));
      
      // Also cache the geocoding result for future use with coordinates as key
      const cacheKey = `user_location_${lat.toFixed(4)}_${lng.toFixed(4)}`;
      localStorage.setItem(cacheKey, JSON.stringify(dataToSave));
      
      // Cache in memory for immediate access
      if (typeof window !== 'undefined') {
        window.__cachedUserLocation = dataToSave;
      }
      
      console.log('✅ Location saved successfully to cache');
      return true;
    } catch (error) {
      console.error('❌ Error saving user location:', error);
      return false;
    }
  }

  // Clear user location
  clearUserLocation() {
    try {
      localStorage.removeItem(this.locationKey);
      // Also clear memory cache
      if (typeof window !== 'undefined') {
        delete window.__cachedUserLocation;
      }
      return true;
    } catch (error) {
      console.error('Error clearing user location:', error);
      return false;
    }
  }

  // Save location from simple coordinates object (used by Find Near Me button)
  saveLocation(locationData) {
    // Normalize the data format
    const normalizedData = {
      lat: locationData.latitude || locationData.lat,
      lng: locationData.longitude || locationData.lng,
      address: locationData.address || 'Current location',
      confidence: locationData.confidence || 90,
      formattedAddress: locationData.address || 'Current location'
    };
    
    return this.saveUserLocation(normalizedData);
  }

  // Check if location prompt has been shown
  hasLocationPromptBeenShown() {
    try {
      return localStorage.getItem(this.promptShownKey) === 'true';
    } catch (error) {
      console.error('Error checking location prompt status:', error);
      return false;
    }
  }

  // Mark location prompt as shown
  markLocationPromptAsShown() {
    try {
      localStorage.setItem(this.promptShownKey, 'true');
      return true;
    } catch (error) {
      console.error('Error marking location prompt as shown:', error);
      return false;
    }
  }

  // Get user coordinates
  getUserCoordinates() {
    const location = this.getUserLocation();
    if (location && location.lat && location.lng) {
      return {
        latitude: location.lat,
        longitude: location.lng
      };
    }
    return null;
  }

  // Check if user has a valid location
  hasValidLocation() {
    const location = this.getUserLocation();
    return !!(location && location.lat && location.lng);
  }

  // Get location for nearby products
  getLocationForNearbyProducts() {
    const location = this.getUserLocation();
    if (location && location.lat && location.lng) {
      return {
        latitude: location.lat,
        longitude: location.lng,
        address: location.address,
        confidence: location.confidence || 0
      };
    }
    return null;
  }

  // Update location from GPS coordinates
  async updateLocationFromGPS(latitude, longitude) {
    try {
      // Get address from coordinates
      const addressData = await geocodingService.reverseGeocode(latitude, longitude);
      
      const locationData = {
        address: addressData?.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        lat: latitude,
        lng: longitude,
        confidence: 100, // GPS coordinates are highly accurate
        formattedAddress: addressData?.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      };

      return this.saveUserLocation(locationData);
    } catch (error) {
      console.error('Error updating location from GPS:', error);
      return false;
    }
  }

  // Update location from address
  async updateLocationFromAddress(address) {
    try {
      // Geocode the address
      const coordinates = await geocodingService.geocodeAddress(address);
      
      if (coordinates && coordinates.latitude && coordinates.longitude) {
        const locationData = {
          address: coordinates.display_name || address,
          lat: coordinates.latitude,
          lng: coordinates.longitude,
          confidence: coordinates.confidence || 0,
          formattedAddress: coordinates.display_name || address
        };

        return this.saveUserLocation(locationData);
      }
      
      return false;
    } catch (error) {
      console.error('Error updating location from address:', error);
      return false;
    }
  }

  // Get location display text
  getLocationDisplayText() {
    const location = this.getUserLocation();
    if (location) {
      return location.formattedAddress || location.address || 'Location set';
    }
    return 'No location set';
  }

  // Check if location is recent (within last 7 days)
  isLocationRecent() {
    const location = this.getUserLocation();
    if (!location || !location.timestamp) {
      return false;
    }
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return location.timestamp > sevenDaysAgo;
  }

  // Get location age in days
  getLocationAgeInDays() {
    const location = this.getUserLocation();
    if (!location || !location.timestamp) {
      return null;
    }
    
    const ageInMs = Date.now() - location.timestamp;
    return Math.floor(ageInMs / (24 * 60 * 60 * 1000));
  }
}

// Create singleton instance
export const locationService = new LocationService();
export default locationService;
