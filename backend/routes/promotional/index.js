const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

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
    const { db } = req;
    const { limit = 6 } = req.query;
    
    const products = await db.collection('products')
      .find({ isPromotional: true, isFeatured: true })
      .limit(parseInt(limit))
      .toArray();
    
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get featured promotional products error:', error);
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

module.exports = router;
