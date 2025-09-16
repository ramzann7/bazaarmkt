import { toast } from 'react-hot-toast';
import { addressValidation } from '../config/addressConfig';

class GeolocationService {
  constructor() {
    this.userLocation = null;
    this.supportedRegions = ['canada', 'usa', 'uk']; // Easily extensible
  }

  // Get user's current location using browser geolocation
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = { latitude, longitude };
          resolve({ latitude, longitude });
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Get location from IP address (fallback)
  async getLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        this.userLocation = { 
          latitude: data.latitude, 
          longitude: data.longitude 
        };
        return { latitude: data.latitude, longitude: data.longitude };
      }
      
      return null;
    } catch (error) {
      console.error('IP geolocation error:', error);
      return null;
    }
  }

  // Get user's location (try multiple methods)
  async getUserLocation() {
    try {
      // First try browser geolocation
      try {
        await this.getCurrentLocation();
        return this.userLocation;
      } catch (error) {
        console.log('Browser geolocation failed, trying IP geolocation');
      }

      // Fallback to IP geolocation
      await this.getLocationFromIP();
      return this.userLocation;
    } catch (error) {
      console.error('All geolocation methods failed:', error);
      return null;
    }
  }

  // Validate address using flexible configuration
  validateAddress(address) {
    return addressValidation.validateAddress(address);
  }

  // Get state options for a country
  getStateOptions(country) {
    return addressValidation.getStateOptions(country);
  }

  // Get postal code placeholder for a country
  getPostalCodePlaceholder(country) {
    return addressValidation.getPostalCodePlaceholder(country);
  }

  // Check if a region is supported (for future use)
  isRegionSupported(region) {
    return this.supportedRegions.includes(region.toLowerCase());
  }

  // Add support for a new region (for future use)
  addRegionSupport(region) {
    if (!this.supportedRegions.includes(region.toLowerCase())) {
      this.supportedRegions.push(region.toLowerCase());
    }
  }

  // Show generic location restriction message
  showLocationRestrictionMessage(region = 'this region') {
    toast.error(
      `This application is currently only available in ${region}`,
      {
        duration: 8000,
        style: {
          background: '#dc2626',
          color: '#ffffff',
          fontSize: '16px',
          padding: '16px'
        }
      }
    );
  }

  // Show generic welcome message
  showWelcomeMessage(region = 'this region') {
    toast.success(
      `Welcome to ${region}!`,
      {
        duration: 5000,
        style: {
          background: '#059669',
          color: '#ffffff',
          fontSize: '16px',
          padding: '16px'
        }
      }
    );
  }

  // Get form validation configuration for a country
  getFormValidationConfig(country) {
    const config = addressValidation.getConfigForCountry(country);
    return config.validation;
  }

  // Format postal code based on country
  formatPostalCode(postalCode, country) {
    const config = addressValidation.getConfigForCountry(country);
    
    if (!postalCode) return '';
    
    const cleanCode = postalCode.replace(/\s+/g, '').toUpperCase();
    
    // Canada: H1A1A1 -> H1A 1A1
    if (config.postalCodePattern && config.postalCodePattern.source.includes('A-Z.*A-Z')) {
      return cleanCode.replace(/([A-Z][0-9][A-Z])([0-9][A-Z][0-9])/, '$1 $2');
    }
    
    // USA: 123456789 -> 12345-6789
    if (config.postalCodePattern && config.postalCodePattern.source.includes('5.*4')) {
      if (cleanCode.length === 9) {
        return cleanCode.replace(/([0-9]{5})([0-9]{4})/, '$1-$2');
      }
      return cleanCode;
    }
    
    return cleanCode;
  }
}

// Create singleton instance
const geolocationService = new GeolocationService();
export default geolocationService;
