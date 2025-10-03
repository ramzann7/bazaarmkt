/**
 * Geocoding Routes Validation
 * Validation rules for geocoding endpoints
 */

const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validation');

/**
 * Validate geocode address request
 */
const validateGeocodeAddress = [
  body('address')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address is required and must be less than 500 characters'),
  handleValidationErrors
];

/**
 * Validate reverse geocode request
 */
const validateReverseGeocode = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180'),
  handleValidationErrors
];

/**
 * Validate distance calculation request
 */
const validateDistanceCalculation = [
  body('lat1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat1 must be a valid number between -90 and 90'),
  body('lon1')
    .isFloat({ min: -180, max: 180 })
    .withMessage('lon1 must be a valid number between -180 and 180'),
  body('lat2')
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat2 must be a valid number between -90 and 90'),
  body('lon2')
    .isFloat({ min: -180, max: 180 })
    .withMessage('lon2 must be a valid number between -180 and 180'),
  handleValidationErrors
];

/**
 * Validate nearby artisans query parameters
 */
const validateNearbyArtisans = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90'),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180'),
  query('maxDistance')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Max distance must be between 0.1 and 1000 km'),
  handleValidationErrors
];

module.exports = {
  validateGeocodeAddress,
  validateReverseGeocode,
  validateDistanceCalculation,
  validateNearbyArtisans
};
