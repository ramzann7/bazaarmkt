/**
 * Spotlight Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 */

const { ObjectId } = require('mongodb');
const { catchAsync } = require('../../middleware/errorHandler');

/**
 * Get spotlight status for artisan
 */
const getSpotlightStatus = catchAsync(async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  
  // Get artisan profile
  const artisan = await db.collection('artisans').findOne({ user: new ObjectId(userId) });
  
  if (!artisan) {
    return res.json({
      success: true,
      data: {
        hasActiveSpotlight: false,
        spotlight: null
      }
    });
  }
  
  const now = new Date();
  const hasActiveSpotlight = artisan.spotlightEndDate && new Date(artisan.spotlightEndDate) > now;
  
  let spotlight = null;
  if (hasActiveSpotlight) {
    const endDate = new Date(artisan.spotlightEndDate);
    const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    spotlight = {
      startDate: artisan.spotlightStartDate,
      endDate: artisan.spotlightEndDate,
      remainingDays
    };
  }
  
  res.json({
    success: true,
    data: {
      hasActiveSpotlight,
      spotlight
    }
  });
});

/**
 * Purchase spotlight subscription
 */
const purchaseSpotlight = catchAsync(async (req, res) => {
  const { days, paymentMethod } = req.body;
  const userId = req.user.userId;
  const db = req.db;
  
  if (!days || days < 1 || days > 30) {
    return res.status(400).json({
      success: false,
      message: 'Days must be between 1 and 30'
    });
  }
  
  // Check if user already has an active spotlight
  const artisan = await db.collection('artisans').findOne({ user: new ObjectId(userId) });
  
  if (artisan && artisan.spotlightEndDate && new Date(artisan.spotlightEndDate) > new Date()) {
    return res.status(400).json({
      success: false,
      message: 'You already have an active spotlight subscription',
      error: 'ACTIVE_SPOTLIGHT_EXISTS',
      existingSpotlight: {
        endDate: artisan.spotlightEndDate
      }
    });
  }
  
  // Calculate cost (simplified pricing)
  const costPerDay = 10; // $10 per day
  const totalCost = days * costPerDay;
  
  // Check wallet balance
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  const currentBalance = user?.walletBalance || 0;
  
  if (currentBalance < totalCost) {
    const shortfall = totalCost - currentBalance;
    return res.status(400).json({
      success: false,
      message: 'Insufficient wallet balance',
      error: 'INSUFFICIENT_FUNDS',
      currentBalance,
      requiredAmount: totalCost,
      shortfall
    });
  }
  
  // Deduct from wallet
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $inc: { walletBalance: -totalCost } }
  );
  
  // Set spotlight dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + days);
  
  // Update artisan with spotlight info
  await db.collection('artisans').updateOne(
    { user: new ObjectId(userId) },
    {
      $set: {
        isSpotlight: true,
        spotlightStartDate: startDate,
        spotlightEndDate: endDate,
        status: 'active'
      }
    }
  );
  
  // Create transaction record
  await db.collection('transactions').insertOne({
    userId: new ObjectId(userId),
    type: 'spotlight_purchase',
    amount: -totalCost,
    description: `Spotlight subscription for ${days} days`,
    paymentMethod: paymentMethod || 'wallet',
    status: 'completed',
    createdAt: new Date(),
    metadata: {
      days,
      costPerDay,
      spotlightStartDate: startDate,
      spotlightEndDate: endDate
    }
  });
  
  res.json({
    success: true,
    message: 'Spotlight subscription purchased successfully',
    data: {
      days,
      totalCost,
      startDate,
      endDate,
      remainingBalance: currentBalance - totalCost
    }
  });
});

/**
 * Get active public spotlights
 */
const getActivePublicSpotlights = catchAsync(async (req, res) => {
  const db = req.db;
  
  // Get active spotlights from artisans collection
  const spotlights = await db.collection('artisans').aggregate([
    {
      $match: {
        isSpotlight: true,
        status: 'active'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userData',
        pipeline: [
          { $project: { firstName: 1, lastName: 1, profilePicture: 1, email: 1 } }
        ]
      }
    },
    { $unwind: '$userData' },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'artisan',
        as: 'featuredProducts',
        pipeline: [
          { $match: { status: 'active' } },
          { $limit: 3 },
          { $project: { name: 1, price: 1, primaryImage: 1, category: 1 } }
        ]
      }
    },
    {
      $project: {
        artisanName: 1,
        businessName: 1,
        type: 1,
        description: 1,
        profileImage: 1,
        location: 1,
        user: '$userData',
        featuredProducts: 1,
        spotlightStartDate: 1,
        spotlightEndDate: 1,
        isSpotlight: 1
      }
    },
    { $sort: { spotlightStartDate: -1 } }
  ]).toArray();
  
  res.json({
    success: true,
    data: spotlights,
    count: spotlights.length
  });
});

module.exports = {
  getSpotlightStatus,
  purchaseSpotlight,
  getActivePublicSpotlights
};
