// Quebec validation middleware
const QUEBEC_POSTAL_PATTERN = /^[HJK][0-9][A-Z][0-9][A-Z][0-9]$/i;

// Major Quebec cities
const QUEBEC_CITIES = [
  'Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke',
  'Saguenay', 'Levis', 'Trois-Rivieres', 'Terrebonne', 'Saint-Jean-sur-Richelieu',
  'Repentigny', 'Brossard', 'Drummondville', 'Saint-Jerome', 'Granby',
  'Blainville', 'Saint-Hyacinthe', 'Dollard-des-Ormeaux', 'Rimouski',
  'Saint-Eustache', 'Victoriaville', 'Mirabel', 'Boucherville', 'Salaberry-de-Valleyfield',
  'Saint-Constant', 'Mascouche', 'Saint-Bruno-de-Montarville', 'Châteauguay',
  'Saint-Laurent', 'Candiac', 'Kirkland', 'Pointe-Claire', 'Dorval',
  'Westmount', 'Outremont', 'Mount Royal', 'Beaconsfield', 'Baie-D\'Urfé',
  'Sainte-Anne-de-Bellevue', 'Dollard-des-Ormeaux', 'Pierrefonds-Roxboro'
];

// Quebec province boundaries (approximate)
const QUEBEC_BOUNDS = {
  north: 62.5,
  south: 44.8,
  east: -57.1,
  west: -79.8
};

/**
 * Validates if a postal code is a valid Quebec postal code
 * @param {string} postalCode - The postal code to validate
 * @returns {boolean} - True if valid Quebec postal code
 */
const isValidQuebecPostalCode = (postalCode) => {
  if (!postalCode) return false;
  return QUEBEC_POSTAL_PATTERN.test(postalCode.trim());
};

/**
 * Validates if a city is in Quebec
 * @param {string} city - The city name to validate
 * @returns {boolean} - True if city is in Quebec
 */
const isQuebecCity = (city) => {
  if (!city) return false;
  const cityLower = city.toLowerCase();
  return QUEBEC_CITIES.some(quebecCity => 
    cityLower.includes(quebecCity.toLowerCase()) ||
    quebecCity.toLowerCase().includes(cityLower)
  );
};

/**
 * Validates if coordinates are within Quebec bounds
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {boolean} - True if within Quebec bounds
 */
const isWithinQuebecBounds = (latitude, longitude) => {
  return (
    latitude >= QUEBEC_BOUNDS.south &&
    latitude <= QUEBEC_BOUNDS.north &&
    longitude >= QUEBEC_BOUNDS.west &&
    longitude <= QUEBEC_BOUNDS.east
  );
};

/**
 * Validates a Quebec address
 * @param {Object} address - Address object to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validateQuebecAddress = (address) => {
  const errors = [];

  // Check country
  if (address.country && address.country.toLowerCase() !== 'canada') {
    errors.push('Country must be Canada');
  }

  // Check province/state
  if (address.state && !address.state.toLowerCase().includes('quebec')) {
    errors.push('Province must be Quebec');
  }

  // Check postal code
  if (address.zipCode && !isValidQuebecPostalCode(address.zipCode)) {
    errors.push('Postal code must be a valid Quebec postal code (starts with H, J, G, or K)');
  }

  // Check city
  if (address.city && !isQuebecCity(address.city)) {
    errors.push('City must be in Quebec province');
  }

  // Check required fields
  if (!address.street || address.street.trim() === '') {
    errors.push('Street address is required');
  }

  if (!address.city || address.city.trim() === '') {
    errors.push('City is required');
  }

  if (!address.zipCode || address.zipCode.trim() === '') {
    errors.push('Postal code is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Middleware to validate Quebec address in request body
 */
const validateQuebecAddressMiddleware = (req, res, next) => {
  const { addresses, artisanData } = req.body;

  // Check user addresses
  if (addresses && Array.isArray(addresses)) {
    for (const address of addresses) {
      const validation = validateQuebecAddress(address);
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Invalid Quebec address',
          errors: validation.errors
        });
      }
    }
  }

  // Check artisan address
  if (artisanData && artisanData.address) {
    const validation = validateQuebecAddress(artisanData.address);
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Invalid Quebec artisan address',
        errors: validation.errors
      });
    }
  }

  next();
};

/**
 * Middleware to enforce Quebec-only access
 */
const quebecOnlyMiddleware = (req, res, next) => {
  // Get client IP for geolocation check
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  
  // For now, we'll allow access but log the request
  // In production, you might want to integrate with a geolocation service
  console.log(`Quebec access check for IP: ${clientIP}`);
  
  // You can add IP-based geolocation checks here
  // For now, we'll rely on address validation during registration
  
  next();
};

module.exports = {
  validateQuebecAddress,
  validateQuebecAddressMiddleware,
  quebecOnlyMiddleware,
  isValidQuebecPostalCode,
  isQuebecCity,
  isWithinQuebecBounds,
  QUEBEC_CITIES,
  QUEBEC_POSTAL_PATTERN
};
