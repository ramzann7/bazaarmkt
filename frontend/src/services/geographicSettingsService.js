import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class GeographicSettingsService {
  constructor() {
    this.baseURL = `${API_URL}/geographic-settings`;
  }

  // Get current geographic settings
  async getCurrentSettings() {
    try {
      const response = await axios.get(`${this.baseURL}/current`);
      return response.data;
    } catch (error) {
      console.error('Error getting geographic settings:', error);
      throw error;
    }
  }

  // Check location access
  async checkLocationAccess(latitude, longitude, country = null, region = null) {
    try {
      const response = await axios.post(`${this.baseURL}/check-access`, {
        latitude,
        longitude,
        country,
        region
      });
      return response.data;
    } catch (error) {
      console.error('Error checking location access:', error);
      throw error;
    }
  }

  // Get address validation rules for a country
  async getAddressValidationRules(country) {
    try {
      const response = await axios.get(`${this.baseURL}/address-validation/${encodeURIComponent(country)}`);
      return response.data;
    } catch (error) {
      console.error('Error getting address validation rules:', error);
      throw error;
    }
  }

  // Admin methods (require authentication)
  
  // Get all settings (admin only)
  async getSettings() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${this.baseURL}/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  // Update settings (admin only)
  async updateSettings(settingsData) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${this.baseURL}/`, settingsData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Get settings history (admin only)
  async getSettingsHistory(limit = 10) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${this.baseURL}/history?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting settings history:', error);
      throw error;
    }
  }

  // Test settings (admin only)
  async testSettings(testData) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${this.baseURL}/test`, testData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error testing settings:', error);
      throw error;
    }
  }

  // Get default settings template (admin only)
  async getDefaultSettings() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${this.baseURL}/defaults`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting default settings:', error);
      throw error;
    }
  }

  // Helper methods for frontend use

  // Check if user location is allowed
  async checkUserLocation() {
    try {
      // Try to get user's current location
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      // Try to get country from coordinates (reverse geocoding)
      let country = null;
      let region = null;
      
      try {
        const geocodingResponse = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );
        
        if (geocodingResponse.data && geocodingResponse.data.address) {
          country = geocodingResponse.data.address.country;
          region = geocodingResponse.data.address.state || geocodingResponse.data.address.province;
        }
      } catch (geocodingError) {
        console.warn('Could not determine country from coordinates:', geocodingError);
      }

      // Check access with our API
      const result = await this.checkLocationAccess(latitude, longitude, country, region);
      return result;
    } catch (error) {
      console.error('Error checking user location:', error);
      // Fallback: allow access if we can't determine location
      return {
        success: true,
        data: {
          isAllowed: true,
          settings: {
            isEnabled: false,
            restrictionType: 'none',
            message: 'Location could not be determined - access allowed'
          }
        }
      };
    }
  }

  // Get current position using browser geolocation
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Validate address using current settings
  async validateAddress(address) {
    try {
      if (!address.country) {
        return {
          isValid: false,
          errors: ['Country is required']
        };
      }

      const rules = await this.getAddressValidationRules(address.country);
      
      if (!rules.success || !rules.data) {
        // No specific rules for this country, use basic validation
        return this.basicAddressValidation(address);
      }

      return this.validateAddressWithRules(address, rules.data);
    } catch (error) {
      console.error('Error validating address:', error);
      return this.basicAddressValidation(address);
    }
  }

  // Basic address validation
  basicAddressValidation(address) {
    const errors = [];
    const requiredFields = ['street', 'city', 'state', 'zipCode', 'country'];
    
    requiredFields.forEach(field => {
      if (!address[field] || !address[field].trim()) {
        errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate address with specific rules
  validateAddressWithRules(address, rules) {
    const errors = [];

    // Check required fields
    if (rules.requiredFields) {
      rules.requiredFields.forEach(field => {
        if (!address[field] || !address[field].trim()) {
          errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
      });
    }

    // Check postal code pattern
    if (rules.postalCodePattern && address.zipCode) {
      try {
        const pattern = new RegExp(rules.postalCodePattern);
        if (!pattern.test(address.zipCode.trim())) {
          errors.push(`Postal code format is invalid. Expected format: ${rules.postalCodePlaceholder || 'varies by country'}`);
        }
      } catch (patternError) {
        console.warn('Invalid postal code pattern:', patternError);
      }
    }

    // Check state/province
    if (rules.states && rules.states.length > 0 && address.state) {
      const isValidState = rules.states.some(state => 
        state.toLowerCase() === address.state.toLowerCase()
      );
      if (!isValidState) {
        errors.push(`State/Province must be one of: ${rules.states.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const geographicSettingsService = new GeographicSettingsService();
export default geographicSettingsService;
