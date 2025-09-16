const mongoose = require('mongoose');

const geographicSettingsSchema = new mongoose.Schema({
  // Basic settings
  isEnabled: {
    type: Boolean,
    default: false,
    required: true
  },
  
  // Geographic restrictions
  restrictions: {
    type: {
      type: String,
      enum: ['none', 'country', 'region', 'coordinates'],
      default: 'none'
    },
    
    // Country-based restrictions
    allowedCountries: [{
      type: String,
      trim: true
    }],
    
    // Region-based restrictions (states/provinces)
    allowedRegions: [{
      country: {
        type: String,
        required: true
      },
      regions: [{
        type: String,
        trim: true
      }]
    }],
    
    // Coordinate-based restrictions (bounding boxes)
    allowedCoordinates: [{
      name: {
        type: String,
        required: true
      },
      bounds: {
        north: { type: Number, required: true },
        south: { type: Number, required: true },
        east: { type: Number, required: true },
        west: { type: Number, required: true }
      }
    }]
  },
  
  // Address validation settings
  addressValidation: {
    enabled: {
      type: Boolean,
      default: true
    },
    
    // Country-specific validation rules
    countryRules: [{
      country: {
        type: String,
        required: true
      },
      states: [{
        type: String,
        trim: true
      }],
      postalCodePattern: {
        type: String,
        trim: true
      },
      postalCodePlaceholder: {
        type: String,
        trim: true
      },
      requiredFields: [{
        type: String,
        enum: ['street', 'city', 'state', 'zipCode', 'country']
      }]
    }]
  },
  
  // User experience settings
  userExperience: {
    showWelcomeMessage: {
      type: Boolean,
      default: true
    },
    welcomeMessage: {
      type: String,
      default: 'Welcome to our platform!'
    },
    restrictionMessage: {
      type: String,
      default: 'This application is not available in your region.'
    },
    allowLocationPrompt: {
      type: Boolean,
      default: true
    },
    fallbackToIP: {
      type: Boolean,
      default: true
    }
  },
  
  // Testing and debugging
  testing: {
    enabled: {
      type: Boolean,
      default: false
    },
    testCoordinates: {
      latitude: Number,
      longitude: Number
    },
    testCountry: String,
    testRegion: String,
    bypassRestrictions: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for efficient queries
geographicSettingsSchema.index({ isEnabled: 1 });
geographicSettingsSchema.index({ 'restrictions.type': 1 });

// Static method to get current settings
geographicSettingsSchema.statics.getCurrentSettings = async function() {
  const settings = await this.findOne({ isEnabled: true }).sort({ createdAt: -1 });
  return settings || this.getDefaultSettings();
};

// Static method to get default settings
geographicSettingsSchema.statics.getDefaultSettings = function() {
  return {
    isEnabled: false,
    restrictions: {
      type: 'none',
      allowedCountries: [],
      allowedRegions: [],
      allowedCoordinates: []
    },
    addressValidation: {
      enabled: true,
      countryRules: []
    },
    userExperience: {
      showWelcomeMessage: true,
      welcomeMessage: 'Welcome to our platform!',
      restrictionMessage: 'This application is not available in your region.',
      allowLocationPrompt: true,
      fallbackToIP: true
    },
    testing: {
      enabled: false,
      testCoordinates: null,
      testCountry: null,
      testRegion: null,
      bypassRestrictions: false
    }
  };
};

// Method to check if location is allowed
geographicSettingsSchema.methods.isLocationAllowed = function(latitude, longitude, country, region) {
  if (!this.isEnabled) return true;
  
  // Testing mode - bypass restrictions if enabled
  if (this.testing.enabled && this.testing.bypassRestrictions) {
    return true;
  }
  
  // Use test coordinates if in testing mode
  if (this.testing.enabled && this.testing.testCoordinates) {
    latitude = this.testing.testCoordinates.latitude;
    longitude = this.testing.testCoordinates.longitude;
  }
  
  // Use test country/region if in testing mode
  if (this.testing.enabled) {
    if (this.testing.testCountry) country = this.testing.testCountry;
    if (this.testing.testRegion) region = this.testing.testRegion;
  }
  
  switch (this.restrictions.type) {
    case 'none':
      return true;
      
    case 'country':
      return this.restrictions.allowedCountries.length === 0 || 
             this.restrictions.allowedCountries.includes(country);
             
    case 'region':
      const regionRule = this.restrictions.allowedRegions.find(r => r.country === country);
      return !regionRule || regionRule.regions.length === 0 || 
             regionRule.regions.includes(region);
             
    case 'coordinates':
      return this.restrictions.allowedCoordinates.some(coord => 
        latitude >= coord.bounds.south && latitude <= coord.bounds.north &&
        longitude >= coord.bounds.west && longitude <= coord.bounds.east
      );
      
    default:
      return true;
  }
};

// Method to get address validation rules for a country
geographicSettingsSchema.methods.getAddressValidationRules = function(country) {
  if (!this.addressValidation.enabled) {
    return null;
  }
  
  const rule = this.addressValidation.countryRules.find(r => r.country === country);
  return rule || null;
};

module.exports = mongoose.model('GeographicSettings', geographicSettingsSchema);
