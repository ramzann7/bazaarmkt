const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { mergeWithInventoryFilter } = require('../../utils/inventoryQueryHelper');

// Get promotional pricing
router.get('/pricing', async (req, res) => {
  try {
    // Return promotional pricing configuration
    const pricing = {
      featured_product: {
        pricePerDay: 5,
        currency: 'USD',
        description: 'Featured on homepage with distance-based ranking',
        benefits: [
          'Homepage visibility',
          'Distance-based ranking',
          'Priority placement',
          'Admin approval required'
        ],
        isActive: true
      },
      sponsored_product: {
        pricePerDay: 10,
        currency: 'USD',
        description: 'Sponsored placement with guaranteed visibility',
        benefits: [
          'Guaranteed visibility',
          'Top placement priority',
          'Enhanced product display',
          'Analytics dashboard access'
        ],
        isActive: true
      },
      spotlight_artisan: {
        pricePerDay: 15,
        currency: 'USD',
        description: 'Spotlight your entire artisan profile',
        benefits: [
          'Profile spotlight',
          'Featured artisan badge',
          'Priority in search results',
          'Enhanced profile display'
        ],
        isActive: true
      }
    };
    
    res.json({ 
      success: true, 
      data: pricing 
    });
  } catch (error) {
    console.error('Get promotional pricing error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get featured promotional products
router.get('/products/featured', async (req, res) => {
  try {
    const db = req.db; // Use req.db instead of destructuring
    if (!db) {
      console.error('Database not available in featured products endpoint');
      return res.status(503).json({ success: false, message: 'Database unavailable' });
    }
    
    const { limit = 6 } = req.query;
    
    const query = mergeWithInventoryFilter({ 
      isPromotional: true, 
      isFeatured: true 
    });
    
    const products = await db.collection('products')
      .find(query)
      .limit(parseInt(limit))
      .toArray();
    
    res.json({ success: true, data: products, products: products, count: products.length });
  } catch (error) {
    console.error('Get featured promotional products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sponsored products (spotlight artisans' products)
router.get('/products/sponsored', async (req, res) => {
  try {
    const { db } = req;
    const { limit = 3, category, searchQuery, userLat, userLng } = req.query;
    
    // Get active spotlight subscriptions
    const activeSpotlights = await db.collection('artisanspotlight')
      .find({
        status: 'active',
        endDate: { $gt: new Date() }
      })
      .toArray();
    
    if (activeSpotlights.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Get artisan IDs with active spotlights
    const spotlightArtisanIds = activeSpotlights.map(spotlight => spotlight.artisanId);
    
    // Build product query with inventory-aware filtering
    const baseQuery = {
      artisan: { $in: spotlightArtisanIds }
    };
    
    if (category) {
      baseQuery.category = category;
    }
    
    if (searchQuery) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      });
    }
    
    const productQuery = mergeWithInventoryFilter(baseQuery);
    
    // Get products with artisan information
    const products = await db.collection('products').aggregate([
      { $match: productQuery },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] },
          isSponsored: true,
          spotlightPriority: 100 // High priority for spotlight products
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0
        }
      },
      { $limit: parseInt(limit) }
    ]).toArray();
    
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get sponsored products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bulk promotional features for artisans
router.get('/artisans/bulk', async (req, res) => {
  try {
    const { artisanIds } = req.query;
    
    if (!artisanIds) {
      return res.status(400).json({
        success: false,
        message: 'artisanIds parameter is required'
      });
    }
    
    // For now, return empty promotional features to avoid 404 errors
    // This endpoint can be enhanced later when the promotional features system is implemented
    const artisanIdArray = artisanIds.split(',');
    const featuresByArtisan = {};
    
    artisanIdArray.forEach(id => {
      const trimmedId = id.trim();
      featuresByArtisan[trimmedId] = {
        isSpotlight: false,
        isFeatured: false,
        promotionalFeatures: [],
        featuredUntil: null,
        spotlightUntil: null
      };
    });
    
    res.json({
      success: true,
      data: featuresByArtisan,
      count: Object.keys(featuresByArtisan).length
    });
  } catch (error) {
    console.error('Error fetching bulk promotional features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bulk promotional features',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get promotional campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { db } = req;
    const campaigns = await db.collection('promotional_campaigns')
      .find({ isActive: true })
      .toArray();
    
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Get promotional campaigns error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create promotional campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { db } = req;
    const campaignData = req.body;
    
    const result = await db.collection('promotional_campaigns').insertOne({
      ...campaignData,
      createdAt: new Date(),
      isActive: true
    });
    
    res.json({ success: true, data: { id: result.insertedId } });
  } catch (error) {
    console.error('Create promotional campaign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update promotional campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { db } = req;
    const { id } = req.params;
    const updateData = req.body;
    
    const result = await db.collection('promotional_campaigns').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update promotional campaign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete promotional campaign
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { db } = req;
    const { id } = req.params;
    
    const result = await db.collection('promotional_campaigns').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete promotional campaign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create promotional feature for product
router.post('/create', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId, featureType, durationDays } = req.body;

    if (!productId || !featureType || !durationDays) {
      return res.status(400).json({
        success: false,
        message: 'productId, featureType, and durationDays are required'
      });
    }

    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    const walletsCollection = db.collection('wallets');
    const promotionalFeaturesCollection = db.collection('promotionalfeatures');

    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    // Get product and verify ownership
    const product = await productsCollection.findOne({
      _id: new ObjectId(productId),
      artisan: artisan._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }

    // Calculate cost based on feature type and duration
    const pricing = {
      featured_product: 5,
      sponsored_product: 10,
      spotlight_artisan: 15
    };

    const costPerDay = pricing[featureType] || 5;
    const totalCost = durationDays * costPerDay;

    // Check wallet balance
    const wallet = await walletsCollection.findOne({
      artisanId: artisan._id
    });

    if (!wallet || wallet.balance < totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Deduct from wallet
    await walletsCollection.updateOne(
      { artisanId: artisan._id },
      { 
        $inc: { balance: -totalCost },
        $set: { updatedAt: new Date() }
      }
    );

    // Record wallet transaction
    if (req.app && req.app.locals && req.app.locals.recordWalletTransaction) {
      await req.app.locals.recordWalletTransaction(db, {
        artisanId: artisan._id,
        type: 'purchase',
        amount: -totalCost,
        description: `${featureType.replace('_', ' ')} promotion for ${durationDays} day${durationDays > 1 ? 's' : ''}`,
        reference: `promo_${featureType}_${durationDays}days`,
        status: 'completed',
        balanceAfter: wallet.balance - totalCost
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + durationDays);

    // Create promotional feature
    const promotionalFeature = {
      productId: new ObjectId(productId),
      artisanId: artisan._id,
      featureType,
      startDate,
      endDate,
      durationDays,
      cost: totalCost,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await promotionalFeaturesCollection.insertOne(promotionalFeature);

    // Update product with promotional status
    const updateData = {};
    if (featureType === 'featured_product') {
      updateData.isFeatured = true;
      updateData.featuredUntil = endDate;
    } else if (featureType === 'sponsored_product') {
      updateData.isSponsored = true;
      updateData.sponsoredUntil = endDate;
    }

    await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${featureType.replace('_', ' ')} promotion activated for ${durationDays} day${durationDays > 1 ? 's' : ''}`,
      data: {
        promotionalFeature,
        cost: totalCost,
        endDate,
        remainingDays: durationDays
      }
    });
  } catch (error) {
    console.error('Create promotional feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promotional feature',
      error: error.message
    });
  }
});

// Get bulk promotional features for artisans (existing endpoint)
router.get('/artisans/bulk', async (req, res) => {
  try {
    const { artisanIds } = req.query;
    
    if (!artisanIds) {
      return res.status(400).json({
        success: false,
        message: 'artisanIds parameter is required'
      });
    }
    
    // For now, return empty promotional features to avoid 404 errors
    // This endpoint can be enhanced later when the promotional features system is implemented
    const artisanIdArray = artisanIds.split(',');
    const featuresByArtisan = {};
    
    artisanIdArray.forEach(id => {
      const trimmedId = id.trim();
      featuresByArtisan[trimmedId] = {
        isSpotlight: false,
        isFeatured: false,
        promotionalFeatures: [],
        featuredUntil: null,
        spotlightUntil: null
      };
    });
    
    res.json({
      success: true,
      data: featuresByArtisan,
      count: Object.keys(featuresByArtisan).length
    });
  } catch (error) {
    console.error('Error fetching bulk promotional features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bulk promotional features',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update promotional pricing (admin only)
router.put('/admin/pricing', async (req, res) => {
  try {
    const { db } = req;
    const pricingData = req.body;
    
    // Get or create pricing document
    const pricingCollection = db.collection('promotional_pricing');
    
    const result = await pricingCollection.updateOne(
      { _id: 'default' },
      { 
        $set: { 
          ...pricingData,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Promotional pricing updated successfully',
      data: pricingData
    });
  } catch (error) {
    console.error('Update promotional pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promotional pricing',
      error: error.message
    });
  }
});

// Initialize default promotional pricing (admin only)
router.post('/admin/pricing/initialize', async (req, res) => {
  try {
    const { db } = req;
    const pricingCollection = db.collection('promotional_pricing');
    
    // Check if pricing already exists
    const existing = await pricingCollection.findOne({ _id: 'default' });
    
    if (existing) {
      return res.json({
        success: true,
        message: 'Pricing already initialized',
        data: existing
      });
    }
    
    // Create default pricing
    const defaultPricing = {
      _id: 'default',
      featured_product: {
        pricePerDay: 5,
        currency: 'CAD',
        description: 'Featured on homepage with distance-based ranking',
        benefits: [
          'Homepage visibility',
          'Distance-based ranking',
          'Priority placement'
        ],
        isActive: true
      },
      sponsored_product: {
        pricePerDay: 10,
        currency: 'CAD',
        description: 'Sponsored placement with guaranteed visibility',
        benefits: [
          'Guaranteed visibility',
          'Top placement priority',
          'Enhanced product display'
        ],
        isActive: true
      },
      spotlight_artisan: {
        pricePerDay: 25,
        currency: 'CAD',
        description: 'Spotlight your entire artisan profile',
        benefits: [
          'Profile spotlight',
          'Featured artisan badge',
          'Priority in search results'
        ],
        isActive: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await pricingCollection.insertOne(defaultPricing);
    
    res.json({
      success: true,
      message: 'Default pricing initialized successfully',
      data: defaultPricing
    });
  } catch (error) {
    console.error('Initialize promotional pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize promotional pricing',
      error: error.message
    });
  }
});

module.exports = router;
