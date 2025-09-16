// Address configuration for different regions and countries
// This allows easy extension to new regions without hardcoding

export const ADDRESS_CONFIG = {
  // Default configuration (no restrictions)
  default: {
    name: 'Global',
    countries: [],
    states: [],
    cities: [],
    postalCodePattern: null,
    postalCodePlaceholder: 'Postal Code',
    requiredFields: ['street', 'city', 'state', 'zipCode', 'country'],
    validation: {
      country: { required: true },
      state: { required: true },
      city: { required: true },
      zipCode: { required: true },
      street: { required: true }
    }
  },

  // Canada configuration
  canada: {
    name: 'Canada',
    countries: ['Canada'],
    states: [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
      'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 
      'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
    ],
    cities: [],
    postalCodePattern: /^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/i,
    postalCodePlaceholder: 'A1A 1A1',
    requiredFields: ['street', 'city', 'state', 'zipCode', 'country'],
    validation: {
      country: { required: true, value: 'Canada' },
      state: { required: true },
      city: { required: true },
      zipCode: { required: true, pattern: /^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/i },
      street: { required: true }
    }
  },

  // United States configuration
  usa: {
    name: 'United States',
    countries: ['United States', 'USA'],
    states: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming'
    ],
    cities: [],
    postalCodePattern: /^[0-9]{5}(-[0-9]{4})?$/,
    postalCodePlaceholder: '12345 or 12345-6789',
    requiredFields: ['street', 'city', 'state', 'zipCode', 'country'],
    validation: {
      country: { required: true, value: 'United States' },
      state: { required: true },
      city: { required: true },
      zipCode: { required: true, pattern: /^[0-9]{5}(-[0-9]{4})?$/ },
      street: { required: true }
    }
  },

  // United Kingdom configuration
  uk: {
    name: 'United Kingdom',
    countries: ['United Kingdom', 'UK', 'Great Britain'],
    states: [
      'England', 'Scotland', 'Wales', 'Northern Ireland'
    ],
    cities: [],
    postalCodePattern: /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i,
    postalCodePlaceholder: 'SW1A 1AA',
    requiredFields: ['street', 'city', 'state', 'zipCode', 'country'],
    validation: {
      country: { required: true, value: 'United Kingdom' },
      state: { required: true },
      city: { required: true },
      zipCode: { required: true, pattern: /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i },
      street: { required: true }
    }
  }
};

// Helper functions for address validation
export const addressValidation = {
  // Get configuration for a specific country
  getConfigForCountry: (country) => {
    const normalizedCountry = country?.toLowerCase();
    
    // Find matching configuration
    for (const [key, config] of Object.entries(ADDRESS_CONFIG)) {
      if (key === 'default') continue;
      
      if (config.countries.some(c => c.toLowerCase() === normalizedCountry)) {
        return config;
      }
    }
    
    return ADDRESS_CONFIG.default;
  },

  // Validate address based on country configuration
  validateAddress: (address) => {
    const config = addressValidation.getConfigForCountry(address.country);
    const errors = [];

    // Check required fields
    config.requiredFields.forEach(field => {
      if (!address[field] || !address[field].trim()) {
        errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    });

    // Country-specific validation
    if (config.validation.country.value && address.country) {
      if (address.country.toLowerCase() !== config.validation.country.value.toLowerCase()) {
        errors.push(`Country must be ${config.validation.country.value}`);
      }
    }

    // State validation
    if (config.states.length > 0 && address.state) {
      const isValidState = config.states.some(state => 
        state.toLowerCase() === address.state.toLowerCase()
      );
      if (!isValidState) {
        errors.push(`State must be one of: ${config.states.join(', ')}`);
      }
    }

    // Postal code validation
    if (config.postalCodePattern && address.zipCode) {
      if (!config.postalCodePattern.test(address.zipCode.trim())) {
        errors.push(`Postal code format is invalid. Expected format: ${config.postalCodePlaceholder}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      config
    };
  },

  // Get state options for a country
  getStateOptions: (country) => {
    const config = addressValidation.getConfigForCountry(country);
    return config.states.map(state => ({
      value: state,
      label: state
    }));
  },

  // Get postal code placeholder for a country
  getPostalCodePlaceholder: (country) => {
    const config = addressValidation.getConfigForCountry(country);
    return config.postalCodePlaceholder;
  }
};

// Default export
export default ADDRESS_CONFIG;
