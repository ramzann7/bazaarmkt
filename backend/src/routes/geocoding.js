const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocodingService');
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/user');

// Geocode an address
router.post('/geocode', verifyToken, async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const coordinates = await geocodingService.geocodeAddress(address);
    
    if (!coordinates) {
      return res.status(404).json({ message: 'Could not geocode address' });
    }

    res.json({
      success: true,
      coordinates
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ message: 'Geocoding failed' });
  }
});

// Reverse geocode coordinates
router.post('/reverse-geocode', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    if (!geocodingService.isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const address = await geocodingService.reverseGeocode(latitude, longitude);
    
    if (!address) {
      return res.status(404).json({ message: 'Could not reverse geocode coordinates' });
    }

    res.json({
      success: true,
      address
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ message: 'Reverse geocoding failed' });
  }
});

// Update user coordinates
router.post('/update-user-coordinates', verifyToken, async (req, res) => {
  try {
    const { addressComponents } = req.body;
    
    if (!addressComponents) {
      return res.status(400).json({ message: 'Address components are required' });
    }

    const formattedAddress = geocodingService.formatAddress(addressComponents);
    const coordinates = await geocodingService.geocodeAddress(formattedAddress);
    
    if (!coordinates) {
      return res.status(404).json({ message: 'Could not geocode address' });
    }

    // Update user coordinates in database
    await User.findByIdAndUpdate(req.user._id, {
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        lastUpdated: new Date(),
        confidence: coordinates.confidence
      }
    });

    res.json({
      success: true,
      coordinates,
      message: 'User coordinates updated successfully'
    });
  } catch (error) {
    console.error('Update user coordinates error:', error);
    res.status(500).json({ message: 'Failed to update user coordinates' });
  }
});

// Get user coordinates
router.get('/user-coordinates', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.coordinates) {
      return res.status(404).json({ message: 'No coordinates found for user' });
    }

    res.json({
      success: true,
      coordinates: user.coordinates
    });
  } catch (error) {
    console.error('Get user coordinates error:', error);
    res.status(500).json({ message: 'Failed to get user coordinates' });
  }
});

// Calculate distance between two coordinates
router.post('/calculate-distance', verifyToken, async (req, res) => {
  try {
    const { coords1, coords2 } = req.body;
    
    if (!coords1 || !coords2) {
      return res.status(400).json({ message: 'Two coordinate sets are required' });
    }

    const distance = geocodingService.calculateDistanceBetween(coords1, coords2);
    
    if (distance === null) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    res.json({
      success: true,
      distance: {
        kilometers: distance,
        formatted: geocodingService.formatDistance(distance)
      }
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({ message: 'Failed to calculate distance' });
  }
});

// Get nearby artisans
router.get('/nearby-artisans', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50 } = req.query; // maxDistance in km
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    if (!geocodingService.isValidCoordinates(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Find artisans within the specified distance
    const artisans = await User.find({
      role: { $in: ['artisan', 'producer', 'food_maker'] },
      coordinates: { $exists: true },
      'coordinates.latitude': { $exists: true },
      'coordinates.longitude': { $exists: true }
    }).populate('artisanProfile');

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
          artisan,
          distance,
          formattedDistance: geocodingService.formatDistance(distance)
        };
      })
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      artisans: nearbyArtisans,
      count: nearbyArtisans.length,
      maxDistance: parseFloat(maxDistance)
    });
  } catch (error) {
    console.error('Get nearby artisans error:', error);
    res.status(500).json({ message: 'Failed to get nearby artisans' });
  }
});

// Batch geocode addresses
router.post('/batch-geocode', verifyToken, async (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({ message: 'Addresses array is required' });
    }

    if (addresses.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 addresses allowed per batch' });
    }

    const results = [];
    
    for (const address of addresses) {
      try {
        const coordinates = await geocodingService.geocodeAddress(address);
        results.push({ address, coordinates, success: !!coordinates });
      } catch (error) {
        console.error('Batch geocoding error for address:', address, error);
        results.push({ address, coordinates: null, success: false, error: error.message });
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      results,
      total: addresses.length,
      successful: results.filter(r => r.success).length
    });
  } catch (error) {
    console.error('Batch geocoding error:', error);
    res.status(500).json({ message: 'Batch geocoding failed' });
  }
});

module.exports = router;
