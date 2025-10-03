/**
 * Geocoding Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 */

const { catchAsync } = require('../../middleware/errorHandler');

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
  
  const geocodingService = require('../../services/geocodingService');
  const result = await geocodingService.geocodeAddress(address);
  
  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Address could not be geocoded'
    });
  }
  
  res.json({
    success: true,
    data: {
      latitude: result.latitude,
      longitude: result.longitude,
      display_name: result.display_name,
      confidence: result.confidence
    }
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
  
  const geocodingService = require('../../services/geocodingService');
  const result = await geocodingService.reverseGeocode(latitude, longitude);
  
  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Coordinates could not be reverse geocoded'
    });
  }
  
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
  
  const geocodingService = require('../../services/geocodingService');
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
  
  const db = req.db;
  const artisansCollection = db.collection('artisans');
  const geocodingService = require('../../services/geocodingService');
  
  // Get all artisans with coordinates
  const artisans = await artisansCollection.find({
    'coordinates.latitude': { $exists: true },
    'coordinates.longitude': { $exists: true }
  }).toArray();
  
  // Calculate distances and filter
  const nearbyArtisans = artisans
    .map(artisan => {
      const distance = geocodingService.calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        artisan.coordinates.latitude,
        artisan.coordinates.longitude
      );
      
      return {
        artisan: artisan,
        distance: distance,
        formattedDistance: geocodingService.formatDistance(distance)
      };
    })
    .filter(item => item.distance <= parseFloat(maxDistance))
    .sort((a, b) => a.distance - b.distance);
  
  res.json({
    success: true,
    data: nearbyArtisans,
    count: nearbyArtisans.length,
    searchParams: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      maxDistance: parseFloat(maxDistance)
    }
  });
});

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getNearbyArtisans
};
