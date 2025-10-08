/**
 * Spotlight Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 * Updated to use service layer
 */

const { ObjectId } = require('mongodb');
const { catchAsync } = require('../../middleware/errorHandler');
const { createSpotlightService } = require('../../services');

/**
 * Get spotlight status for artisan
 */
const getSpotlightStatus = catchAsync(async (req, res) => {
  const spotlightService = await createSpotlightService();
  const result = await spotlightService.getSpotlightStatus(req.user.userId);
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * Purchase spotlight subscription
 */
const purchaseSpotlight = catchAsync(async (req, res) => {
  const spotlightService = await createSpotlightService();
  const result = await spotlightService.purchaseSpotlight(
    req.user.userId, 
    req.body.days, 
    req.body.paymentMethod || 'wallet'
  );
  
  res.json({
    success: true,
    message: 'Spotlight subscription purchased successfully',
    data: result
  });
});

/**
 * Get active public spotlights
 */
const getActivePublicSpotlights = catchAsync(async (req, res) => {
  const spotlightService = await createSpotlightService();
  const result = await spotlightService.getActivePublicSpotlights();
  
  res.json({
    success: true,
    data: result.spotlights,
    count: result.count
  });
});

module.exports = {
  getSpotlightStatus,
  purchaseSpotlight,
  getActivePublicSpotlights
};
