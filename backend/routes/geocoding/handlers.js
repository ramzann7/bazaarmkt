/**
 * Geocoding Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 * Updated to use service layer
 */

const { catchAsync } = require('../../middleware/errorHandler');
const { createGeocodingService } = require('../../services');

/**
 * Geocode an address to coordinates
 */
const geocodeAddress = catchAsync(async (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      message: 'Address is required'
    });
  }
  
  const geocodingService = await createGeocodingService();
  const result = await geocodingService.geocodeAddress(address);
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * Reverse geocode coordinates to address
 */
const reverseGeocode = catchAsync(async (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }
  
  const geocodingService = await createGeocodingService();
  const result = await geocodingService.reverseGeocode(latitude, longitude);
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * Calculate distance between two points
 */
const calculateDistance = catchAsync(async (req, res) => {
  const { lat1, lon1, lat2, lon2 } = req.body;
  
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return res.status(400).json({
      success: false,
      message: 'All coordinates (lat1, lon1, lat2, lon2) are required'
    });
  }
  
  const geocodingService = await createGeocodingService();
  const distance = geocodingService.calculateDistance(lat1, lon1, lat2, lon2);
  
  res.json({
    success: true,
    data: {
      distance: distance,
      formatted: geocodingService.formatDistance(distance),
      unit: 'km'
    }
  });
});

/**
 * Get nearby artisans based on coordinates
 */
const getNearbyArtisans = catchAsync(async (req, res) => {
  const { latitude, longitude, maxDistance = 50 } = req.query;
  
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }
  
  const geocodingService = await createGeocodingService();
  const result = await geocodingService.getNearbyArtisans(latitude, longitude, maxDistance);
  
  res.json({
    success: true,
    data: result.artisans,
    count: result.count,
    searchParams: result.searchParams
  });
});

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getNearbyArtisans
};
