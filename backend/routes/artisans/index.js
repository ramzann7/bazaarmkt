const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const imageUploadService = require('../../services/imageUploadService');
const { mergeWithInventoryFilter } = require('../../utils/inventoryQueryHelper');

// Get artisan by ID or short ID from slug
router.get('/:id', async (req, res) => {
  try {
    const { db } = req;
    const { id } = req.params;
    
    let artisan = null;
    let artisanObjectId = null;
    
    // Check if it's a valid 24-character ObjectId
    if (/^[a-f\d]{24}$/i.test(id)) {
      // Full ObjectId - use directly
      artisanObjectId = new ObjectId(id);
      artisan = await db.collection('artisans').findOne({ _id: artisanObjectId });
    } else if (/^[a-f\d]{8,}$/i.test(id)) {
      // Short ID from slug (8+ hex chars) - find by matching end of ObjectId
      // Since ObjectId is stored as ObjectId type, we need to search by converting to string
      // We'll use a regex on the stringified _id to match the ending
      const regex = new RegExp(`${id.toLowerCase()}$`, 'i');
      
      // Use aggregation to convert _id to string and match
      const results = await db.collection('artisans').aggregate([
        {
          $addFields: {
            idString: { $toString: '$_id' }
          }
        },
        {
          $match: {
            idString: regex
          }
        },
        {
          $limit: 1
        }
      ]).toArray();
      
      if (results.length > 0) {
        artisan = results[0];
        artisanObjectId = artisan._id;
        // Remove the temporary idString field
        delete artisan.idString;
      }
    }
    
    if (!artisan) {
      return res.status(404).json({ success: false, message: 'Artisan not found' });
    }
    
    // Get artisan's products if requested
    if (req.query.includeProducts === 'true') {
      const query = mergeWithInventoryFilter({ 
        artisan: artisanObjectId
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
