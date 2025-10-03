const { MongoClient } = require('mongodb');
const imageUploadService = require('../../../backend/services/imageUploadService');
require('dotenv').config();

/**
 * Migration Script: Move Images from Base64 to Vercel Blob
 * 
 * This script:
 * 1. Finds all artisans with base64 images
 * 2. Optimizes each image
 * 3. Uploads to Vercel Blob
 * 4. Updates database with Vercel Blob URLs
 * 5. Reduces database size and improves performance
 */

async function migrateImagesToVercelBlob() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Check if Vercel Blob is available
    if (!imageUploadService.isAvailable()) {
      console.error('\n❌ VERCEL BLOB NOT CONFIGURED');
      console.error('Please set BLOB_READ_WRITE_TOKEN in your .env file');
      console.error('Get your token from: https://vercel.com/dashboard/stores');
      process.exit(1);
    }
    
    console.log('✅ Vercel Blob is configured and available\n');
    
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    // Find artisans with base64 images
    const artisansWithBase64Images = await artisansCollection.find({
      $or: [
        { businessImage: { $regex: '^data:image', $options: 'i' } },
        { profileImage: { $regex: '^data:image', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${artisansWithBase64Images.length} artisans with base64 images to migrate\n`);
    
    if (artisansWithBase64Images.length === 0) {
      console.log('✅ No images to migrate. All images are already using Vercel Blob!');
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    let totalSavings = 0;
    
    for (const artisan of artisansWithBase64Images) {
      console.log(`\n🎨 Migrating: ${artisan.artisanName || 'Unknown'} (${artisan._id})`);
      
      const updates = {};
      
      // Migrate businessImage
      if (artisan.businessImage && artisan.businessImage.startsWith('data:image')) {
        const originalSize = artisan.businessImage.length;
        console.log(`  📸 businessImage: ${Math.round(originalSize / 1024)} KB (base64)`);
        
        try {
          const blobUrl = await imageUploadService.uploadBusinessImage(
            artisan.businessImage,
            `business-${artisan._id}-migrated.jpg`
          );
          
          updates.businessImage = blobUrl;
          totalSavings += originalSize;
          
          console.log(`  ✅ businessImage uploaded to Vercel Blob`);
          console.log(`  🔗 URL: ${blobUrl}`);
        } catch (error) {
          console.error(`  ❌ businessImage migration failed:`, error.message);
          errorCount++;
        }
      }
      
      // Migrate profileImage
      if (artisan.profileImage && artisan.profileImage.startsWith('data:image')) {
        const originalSize = artisan.profileImage.length;
        console.log(`  📸 profileImage: ${Math.round(originalSize / 1024)} KB (base64)`);
        
        try {
          const blobUrl = await imageUploadService.uploadProfileImage(
            artisan.profileImage,
            `profile-${artisan._id}-migrated.jpg`
          );
          
          updates.profileImage = blobUrl;
          totalSavings += originalSize;
          
          console.log(`  ✅ profileImage uploaded to Vercel Blob`);
          console.log(`  🔗 URL: ${blobUrl}`);
        } catch (error) {
          console.error(`  ❌ profileImage migration failed:`, error.message);
          errorCount++;
        }
      }
      
      // Update database if we have migrated images
      if (Object.keys(updates).length > 0) {
        try {
          await artisansCollection.updateOne(
            { _id: artisan._id },
            { $set: updates }
          );
          migratedCount++;
          console.log(`  💾 Database updated with Vercel Blob URLs`);
        } catch (error) {
          console.error(`  ❌ Database update failed:`, error.message);
          errorCount++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total artisans found:        ${artisansWithBase64Images.length}`);
    console.log(`Successfully migrated:       ${migratedCount}`);
    console.log(`Errors:                      ${errorCount}`);
    console.log(`Database size reduction:     ${Math.round(totalSavings / 1024)} KB (${Math.round(totalSavings / 1024 / 1024)} MB)`);
    console.log('='.repeat(70));
    console.log('\n✅ Migration complete!');
    console.log('\n📌 IMPORTANT:');
    console.log('   • Images are now stored in Vercel Blob');
    console.log('   • Database only stores URLs (not base64)');
    console.log('   • Much better performance and scalability');
    console.log('   • Images are served from global CDN');
    console.log('   • All future uploads will use Vercel Blob automatically\n');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if executed directly
if (require.main === module) {
  migrateImagesToVercelBlob();
}

module.exports = { migrateImagesToVercelBlob };

