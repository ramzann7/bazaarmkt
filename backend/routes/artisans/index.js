const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const imageUploadService = require('../../services/imageUploadService');
const { mergeWithInventoryFilter } = require('../../utils/inventoryQueryHelper');

// Get artisan by ID
router.get('/:id', async (req, res) => {
  try {
    const { db } = req;
    const { id } = req.params;
    
    const artisan = await db.collection('artisans').findOne({ _id: new ObjectId(id) });
    
    if (!artisan) {
      return res.status(404).json({ success: false, message: 'Artisan not found' });
    }
    
    // Get artisan's products if requested
    if (req.query.includeProducts === 'true') {
      const query = mergeWithInventoryFilter({ 
        artisan: new ObjectId(id)
      });
      const products = await db.collection('products')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      artisan.products = products;
    }
    
    res.json({ success: true, data: artisan });
  } catch (error) {
    console.error('Get artisan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all artisans
router.get('/', async (req, res) => {
  try {
    const { db } = req;
    const artisans = await db.collection('artisans').find({}).toArray();
    
    // Get products for each artisan if requested
    if (req.query.includeProducts === 'true') {
      for (const artisan of artisans) {
        const query = mergeWithInventoryFilter({ 
          artisan: artisan._id
        });
        const products = await db.collection('products')
          .find(query)
          .sort({ createdAt: -1 })
          .limit(10) // Limit to 10 products per artisan for performance
          .toArray();
        artisan.products = products;
      }
    }
    
    res.json({ success: true, data: artisans });
  } catch (error) {
    console.error('Get artisans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create artisan
router.post('/', async (req, res) => {
  try {
    const { db } = req;
    const artisanData = req.body;
    
    const result = await db.collection('artisans').insertOne(artisanData);
    
    res.json({ success: true, data: { id: result.insertedId } });
  } catch (error) {
    console.error('Create artisan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update artisan
router.put('/:id', async (req, res) => {
  try {
    const { db } = req;
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Process and upload businessImage if present
    if (updateData.businessImage && typeof updateData.businessImage === 'string' && updateData.businessImage.startsWith('data:image')) {
      console.log('📸 Processing businessImage (optimize + upload to Vercel Blob)...');
      try {
        // This will optimize AND upload to Vercel Blob (or fallback to optimized base64)
        updateData.businessImage = await imageUploadService.handleImageUpload(
          updateData.businessImage,
          'business',
          `business-${id}-${Date.now()}.jpg`
        );
        console.log('✅ businessImage processed:', updateData.businessImage.substring(0, 50) + '...');
      } catch (uploadError) {
        console.error('⚠️ Image upload failed, keeping original:', uploadError.message);
        // Keep original if upload fails
      }
    }
    
    // Process and upload profileImage if present
    if (updateData.profileImage && typeof updateData.profileImage === 'string' && updateData.profileImage.startsWith('data:image')) {
      console.log('📸 Processing profileImage (optimize + upload to Vercel Blob)...');
      try {
        updateData.profileImage = await imageUploadService.handleImageUpload(
          updateData.profileImage,
          'profile',
          `profile-${id}-${Date.now()}.jpg`
        );
        console.log('✅ profileImage processed:', updateData.profileImage.substring(0, 50) + '...');
      } catch (uploadError) {
        console.error('⚠️ Image upload failed, keeping original:', uploadError.message);
      }
    }
    
    const result = await db.collection('artisans').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Artisan not found' });
    }
    
    res.json({ success: true, message: 'Artisan updated successfully' });
  } catch (error) {
    console.error('Update artisan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete artisan
router.delete('/:id', async (req, res) => {
  try {
    const { db } = req;
    const { id } = req.params;
    
    const result = await db.collection('artisans').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Artisan not found' });
    }
    
    res.json({ success: true, message: 'Artisan deleted successfully' });
  } catch (error) {
    console.error('Delete artisan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
