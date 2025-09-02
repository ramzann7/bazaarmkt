const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB Atlas');
  
  try {
    await workingCleanup();
    console.log('✅ Working cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Working cleanup failed:', error);
    process.exit(1);
  }
});

async function workingCleanup() {
  console.log('🔄 Starting working database cleanup...');
  
  // Import models
  const Product = require('./src/models/product');
  const Artisan = require('./src/models/artisan');
  const User = require('./src/models/user');
  
  // Step 1: Get all products and ensure they have complete data
  console.log('\n📋 Step 1: Getting all products...');
  
  const allProducts = await Product.find({});
  console.log(`Found ${allProducts.length} total products`);
  
  // Step 2: Get all valid artisan profiles
  console.log('\n📋 Step 2: Getting valid artisan profiles...');
  
  const validArtisans = await Artisan.find({}).populate('user', 'firstName lastName email');
  console.log(`Found ${validArtisans.length} valid artisan profiles`);
  
  // Step 3: Create a mapping of valid seller IDs to artisan data
  const sellerToArtisanMap = new Map();
  
  validArtisans.forEach(artisan => {
    if (artisan.user && artisan.user._id) {
      sellerToArtisanMap.set(artisan.user._id.toString(), {
        artisanId: artisan._id,
        artisanName: artisan.artisanName,
        user: artisan.user
      });
    }
  });
  
  console.log(`Created mapping for ${sellerToArtisanMap.size} valid seller IDs`);
  
  // Step 4: Fix all products to ensure they have complete data
  console.log('\n📋 Step 4: Ensuring all products have complete data...');
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const product of allProducts) {
    try {
      let sellerId = null;
      let artisanData = null;
      
      // Check if product has a valid seller ID that maps to an artisan
      if (product.seller && typeof product.seller === 'object' && product.seller._id) {
        sellerId = product.seller._id.toString();
        artisanData = sellerToArtisanMap.get(sellerId);
      }
      
      if (artisanData) {
        // Product has a valid seller ID that maps to an artisan
        // Update the seller data with complete information
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              'seller.firstName': artisanData.user.firstName || 'Unknown',
              'seller.lastName': artisanData.user.lastName || 'Artisan',
              'seller.email': artisanData.user.email || '',
              'artisan._id': artisanData.artisanId,
              'artisan.artisanName': artisanData.artisanName,
              'artisan.type': 'other' // Default type
            }
          }
        );
        
        console.log(`✅ Fixed product: ${product.name} -> ${artisanData.artisanName}`);
        fixedCount++;
      } else {
        // Product has a seller ID but no matching artisan profile
        // Assign to a default artisan (Test Business Profile)
        const defaultArtisan = validArtisans.find(a => a.artisanName === 'Test Business Profile');
        
        if (defaultArtisan) {
          await Product.updateOne(
            { _id: product._id },
            {
              $set: {
                'seller.firstName': 'Test',
                'seller.lastName': 'Business',
                'seller.email': 'test@business.com',
                'artisan._id': defaultArtisan._id,
                'artisan.artisanName': defaultArtisan.artisanName,
                'artisan.type': 'other'
              }
            }
          );
          
          console.log(`✅ Fixed product: ${product.name} -> ${defaultArtisan.artisanName} (default)`);
          fixedCount++;
        } else {
          console.log(`⚠️  Skipped product: ${product.name} - no default artisan available`);
          skippedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error fixing product ${product.name}:`, error);
      skippedCount++;
    }
  }
  
  console.log(`\n📊 Cleanup Summary:`);
  console.log(`   ✅ Fixed: ${fixedCount} products`);
  console.log(`   ⚠️  Skipped: ${skippedCount} products`);
  
  // Step 5: Verify the cleanup worked
  console.log('\n📋 Step 5: Verifying cleanup results...');
  
  const remainingIssues = await Product.find({
    $or: [
      { seller: null },
      { 'seller._id': null },
      { 'seller.firstName': null },
      { 'seller.lastName': null },
      { 'artisan._id': null },
      { 'artisan.artisanName': null }
    ]
  });
  
  if (remainingIssues.length === 0) {
    console.log('✅ All products now have complete seller and artisan data!');
  } else {
    console.log(`⚠️  ${remainingIssues.length} products still have issues:`);
    remainingIssues.forEach(product => {
      console.log(`   - ${product.name}: seller=${product.seller?._id} (${product.seller?.firstName} ${product.seller?.lastName}), artisan=${product.artisan?._id} (${product.artisan?.artisanName})`);
    });
  }
  
  // Step 6: Test that featured products endpoint works
  console.log('\n📋 Step 6: Testing featured products endpoint...');
  
  try {
    const testProducts = await Product.find({ status: 'active' }).limit(5);
    console.log(`✅ Found ${testProducts.length} active products for testing`);
    
    for (const product of testProducts) {
      console.log(`   - ${product.name}: seller=${product.seller?._id} (${product.seller?.firstName} ${product.seller?.lastName}), artisan=${product.artisan?._id} (${product.artisan?.artisanName})`);
    }
  } catch (error) {
    console.error('❌ Error testing products:', error);
  }
  
  console.log('\n🎉 Working cleanup completed!');
}
