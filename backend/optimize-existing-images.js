const { MongoClient } = require('mongodb');
const imageOptimizationService = require('./services/imageOptimizationService');
require('dotenv').config();

/**
 * Migration script to optimize all existing artisan images in the database
 * This will reduce storage and improve performance
 */

async function optimizeExistingImages() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    // Find all artisans with businessImage or profileImage
    const artisansWithImages = await artisansCollection.find({
      $or: [
        { businessImage: { $exists: true, $ne: null } },
        { profileImage: { $exists: true, $ne: null } }
      ]
    }).toArray();
    
    console.log(`\n📊 Found ${artisansWithImages.length} artisans with images\n`);
    
    let optimizedCount = 0;
    let errorCount = 0;
    let totalSavings = 0;
    
    for (const artisan of artisansWithImages) {
      console.log(`\n🎨 Processing: ${artisan.artisanName || 'Unknown'} (${artisan._id})`);
      
      const updates = {};
      
      // Optimize businessImage
      if (artisan.businessImage && typeof artisan.businessImage === 'string' && artisan.businessImage.startsWith('data:image')) {
        const originalSize = artisan.businessImage.length;
        console.log(`  📸 businessImage original size: ${Math.round(originalSize / 1024)} KB`);
        
        try {
          const optimized = await imageOptimizationService.optimizeBusinessImage(artisan.businessImage);
          const newSize = optimized.length;
          const savings = originalSize - newSize;
          const savingsPercent = Math.round((savings / originalSize) * 100);
          
          updates.businessImage = optimized;
          totalSavings += savings;
          
          console.log(`  ✅ businessImage optimized: ${Math.round(newSize / 1024)} KB (saved ${savingsPercent}%)`);
        } catch (error) {
          console.error(`  ❌ businessImage optimization failed:`, error.message);
          errorCount++;
        }
      }
      
      // Optimize profileImage
      if (artisan.profileImage && typeof artisan.profileImage === 'string' && artisan.profileImage.startsWith('data:image')) {
        const originalSize = artisan.profileImage.length;
        console.log(`  📸 profileImage original size: ${Math.round(originalSize / 1024)} KB`);
        
        try {
          const optimized = await imageOptimizationService.optimizeProfileImage(artisan.profileImage);
          const newSize = optimized.length;
          const savings = originalSize - newSize;
          const savingsPercent = Math.round((savings / originalSize) * 100);
          
          updates.profileImage = optimized;
          totalSavings += savings;
          
          console.log(`  ✅ profileImage optimized: ${Math.round(newSize / 1024)} KB (saved ${savingsPercent}%)`);
        } catch (error) {
          console.error(`  ❌ profileImage optimization failed:`, error.message);
          errorCount++;
        }
      }
      
      // Update database if we have optimized images
      if (Object.keys(updates).length > 0) {
        try {
          await artisansCollection.updateOne(
            { _id: artisan._id },
            { $set: updates }
          );
          optimizedCount++;
          console.log(`  💾 Database updated successfully`);
        } catch (error) {
          console.error(`  ❌ Database update failed:`, error.message);
          errorCount++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total artisans processed: ${artisansWithImages.length}`);
    console.log(`Successfully optimized: ${optimizedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total storage saved: ${Math.round(totalSavings / 1024)} KB (${Math.round(totalSavings / 1024 / 1024)} MB)`);
    console.log('='.repeat(60));
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

// Run if executed directly
if (require.main === module) {
  optimizeExistingImages();
}

module.exports = { optimizeExistingImages };

