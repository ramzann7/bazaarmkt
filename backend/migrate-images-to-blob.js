const fs = require('fs');
const path = require('path');
const blobStorage = require('./src/services/blobStorage');

async function migrateImagesToBlob() {
  console.log('🚀 Starting image migration to Vercel Blob Storage...');
  
  // Check if blob storage is enabled
  if (!blobStorage.isBlobStorageEnabled()) {
    console.error('❌ Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.');
    process.exit(1);
  }

  const uploadsDir = path.join(__dirname, 'public/uploads/products');
  
  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ Uploads directory does not exist:', uploadsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(uploadsDir);
  console.log(`📁 Found ${files.length} files to migrate`);

  const results = {
    successful: [],
    failed: [],
    skipped: []
  };

  for (const filename of files) {
    try {
      const filePath = path.join(uploadsDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      
      // Determine MIME type based on extension
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'image/jpeg'; // default
      
      switch (ext) {
        case '.png':
          mimeType = 'image/png';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.avif':
          mimeType = 'image/avif';
          break;
        case '.jpeg':
        case '.jpg':
          mimeType = 'image/jpeg';
          break;
      }

      console.log(`📤 Uploading ${filename}...`);
      
      const blobResult = await blobStorage.uploadFile(fileBuffer, filename, mimeType);
      
      results.successful.push({
        originalFilename: filename,
        blobUrl: blobResult.url,
        blobPathname: blobResult.pathname
      });
      
      console.log(`✅ Successfully uploaded ${filename} to ${blobResult.url}`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to upload ${filename}:`, error.message);
      results.failed.push({
        filename: filename,
        error: error.message
      });
    }
  }

  // Save results to file
  const resultsPath = path.join(__dirname, 'migration-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log('\n📊 Migration Results:');
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️ Skipped: ${results.skipped.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    results.failed.forEach(f => console.log(`  - ${f.filename}: ${f.error}`));
  }
  
  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
  console.log('\n🔧 Next steps:');
  console.log('1. Update your database to use the new blob URLs');
  console.log('2. Test image serving from blob storage');
  console.log('3. Remove local image files after verification');
}

// Run migration if called directly
if (require.main === module) {
  migrateImagesToBlob().catch(console.error);
}

module.exports = migrateImagesToBlob;
