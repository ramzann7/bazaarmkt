const GeographicSettings = require('../models/geographicSettings');

class GeographicSettingsService {
  // Get current geographic settings
  async getCurrentSettings() {
    try {
      const settings = await GeographicSettings.getCurrentSettings();
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      console.error('Error getting geographic settings:', error);
      return {
        success: false,
        error: 'Failed to retrieve geographic settings'
      };
    }
  }

  // Update geographic settings
  async updateSettings(settingsData, userId) {
    try {
      // Validate settings data
      const validation = this.validateSettings(settingsData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid settings data',
          details: validation.errors
        };
      }

      // Deactivate current settings if new ones are being enabled
      if (settingsData.isEnabled) {
        await GeographicSettings.updateMany(
          { isEnabled: true },
          { isEnabled: false }
        );
      }

      // Ensure we have a valid user ID
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required for creating geographic settings'
        };
      }

      // Create new settings
      const newSettings = new GeographicSettings({
        ...settingsData,
        createdBy: userId,
        lastModifiedBy: userId
      });

      await newSettings.save();

      return {
        success: true,
        data: newSettings,
        message: 'Geographic settings updated successfully'
      };
    } catch (error) {
      console.error('Error updating geographic settings:', error);
      return {
        success: false,
        error: 'Failed to update geographic settings'
      };
    }
  }

  // Validate settings data
  validateSettings(settings) {
    const errors = [];

    // Validate restriction type
    if (settings.restrictions && settings.restrictions.type) {
      const validTypes = ['none', 'country', 'region', 'coordinates'];
      if (!validTypes.includes(settings.restrictions.type)) {
        errors.push('Invalid restriction type');
      }

      // Validate country restrictions
      if (settings.restrictions.type === 'country') {
        if (!Array.isArray(settings.restrictions.allowedCountries)) {
          errors.push('Allowed countries must be an array');
        }
      }

      // Validate region restrictions
      if (settings.restrictions.type === 'region') {
        if (!Array.isArray(settings.restrictions.allowedRegions)) {
          errors.push('Allowed regions must be an array');
        } else {
          settings.restrictions.allowedRegions.forEach((region, index) => {
            if (!region.country) {
              errors.push(`Region ${index}: country is required`);
            }
            if (!Array.isArray(region.regions)) {
              errors.push(`Region ${index}: regions must be an array`);
            }
          });
        }
      }

      // Validate coordinate restrictions
      if (settings.restrictions.type === 'coordinates') {
        if (!Array.isArray(settings.restrictions.allowedCoordinates)) {
          errors.push('Allowed coordinates must be an array');
        } else {
          settings.restrictions.allowedCoordinates.forEach((coord, index) => {
            if (!coord.name) {
              errors.push(`Coordinate ${index}: name is required`);
            }
            if (!coord.bounds || typeof coord.bounds !== 'object') {
              errors.push(`Coordinate ${index}: bounds is required`);
            } else {
              const { north, south, east, west } = coord.bounds;
              if (typeof north !== 'number' || typeof south !== 'number' || 
                  typeof east !== 'number' || typeof west !== 'number') {
                errors.push(`Coordinate ${index}: bounds must contain valid numbers`);
              }
              if (north <= south || east <= west) {
                errors.push(`Coordinate ${index}: invalid bounds (north > south, east > west)`);
              }
            }
          });
        }
      }
    }

    // Validate address validation rules
    if (settings.addressValidation && settings.addressValidation.countryRules) {
      if (!Array.isArray(settings.addressValidation.countryRules)) {
        errors.push('Country rules must be an array');
      } else {
        settings.addressValidation.countryRules.forEach((rule, index) => {
          if (!rule.country) {
            errors.push(`Country rule ${index}: country is required`);
          }
          if (rule.postalCodePattern && typeof rule.postalCodePattern !== 'string') {
            errors.push(`Country rule ${index}: postal code pattern must be a string`);
          }
        });
      }
    }

    // Validate testing settings
    if (settings.testing) {
      if (settings.testing.testCoordinates) {
        const { latitude, longitude } = settings.testing.testCoordinates;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          errors.push('Test coordinates must contain valid latitude and longitude');
        }
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          errors.push('Test coordinates must be within valid ranges');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if location is allowed
  async checkLocationAccess(latitude, longitude, country, region) {
    try {
      const settings = await GeographicSettings.getCurrentSettings();
      const isAllowed = settings.isLocationAllowed(latitude, longitude, country, region);
      
      return {
        success: true,
        data: {
          isAllowed,
          settings: {
            isEnabled: settings.isEnabled,
            restrictionType: settings.restrictions.type,
            message: isAllowed ? settings.userExperience.welcomeMessage : settings.userExperience.restrictionMessage
          }
        }
      };
    } catch (error) {
      console.error('Error checking location access:', error);
      return {
        success: false,
        error: 'Failed to check location access'
      };
    }
  }

  // Get address validation rules for a country
  async getAddressValidationRules(country) {
    try {
      const settings = await GeographicSettings.getCurrentSettings();
      
      // If settings is a Mongoose model instance, use the method
      if (settings && typeof settings.getAddressValidationRules === 'function') {
        const rules = settings.getAddressValidationRules(country);
        return {
          success: true,
          data: rules
        };
      }
      
      // If settings is a plain object (default settings), check manually
      if (settings && settings.addressValidation && settings.addressValidation.enabled) {
        const rule = settings.addressValidation.countryRules.find(r => r.country === country);
        return {
          success: true,
          data: rule || null
        };
      }
      
      // No validation rules found
      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('Error getting address validation rules:', error);
      return {
        success: false,
        error: 'Failed to get address validation rules'
      };
    }
  }

  // Get settings history
  async getSettingsHistory(limit = 10) {
    try {
      const history = await GeographicSettings.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .select('-__v');

      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('Error getting settings history:', error);
      return {
        success: false,
        error: 'Failed to get settings history'
      };
    }
  }

  // Test geographic settings
  async testSettings(testData) {
    try {
      const { latitude, longitude, country, region } = testData;
      
      // Get current settings
      const settings = await GeographicSettings.getCurrentSettings();
      
      // Create temporary settings for testing
      const tempSettings = new GeographicSettings({
        ...settings.toObject(),
        testing: {
          enabled: true,
          testCoordinates: { latitude, longitude },
          testCountry: country,
          testRegion: region,
          bypassRestrictions: false
        }
      });

      // Test the location
      const isAllowed = tempSettings.isLocationAllowed(latitude, longitude, country, region);
      
      return {
        success: true,
        data: {
          isAllowed,
          testData: { latitude, longitude, country, region },
          restrictionType: settings.restrictions.type,
          message: isAllowed ? 'Location would be allowed' : 'Location would be blocked'
        }
      };
    } catch (error) {
      console.error('Error testing settings:', error);
      return {
        success: false,
        error: 'Failed to test settings'
      };
    }
  }
}

module.exports = new GeographicSettingsService();
