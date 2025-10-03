const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

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
