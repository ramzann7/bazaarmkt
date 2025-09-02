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
    await cleanupDatabase();
    console.log('✅ Database cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
});

async function cleanupDatabase() {
  console.log('🔄 Starting database cleanup...');
  
  // Import models
  const Product = require('./src/models/product');
  const Artisan = require('./src/models/artisan');
  const User = require('./src/models/user');
  
  // Step 1: Find all products with missing or invalid seller data
  console.log('\n📋 Step 1: Analyzing products with missing seller data...');
  
  const productsWithIssues = await Product.find({
    $or: [
      { seller: null },
      { 'seller._id': null },
      { 'seller.firstName': null },
      { 'seller.lastName': null }
    ]
  });
  
  console.log(`Found ${productsWithIssues.length} products with missing seller data`);
  
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
  
  // Step 4: Fix products with missing seller data
  console.log('\n📋 Step 4: Fixing products with missing seller data...');
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const product of productsWithIssues) {
    try {
      // Check if product has a valid seller ID that maps to an artisan
      if (product.seller && product.seller._id) {
        const sellerId = product.seller._id.toString();
        const artisanData = sellerToArtisanMap.get(sellerId);
        
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
                'artisan': {
                  _id: artisanData.artisanId,
                  artisanName: artisanData.artisanName,
                  type: 'other' // Default type
                }
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
                  'artisan': {
                    _id: defaultArtisan._id,
                    artisanName: defaultArtisan.artisanName,
                    type: 'other'
                  }
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
      } else {
        // Product has no seller ID at all
        // Assign to Test Business Profile
        const defaultArtisan = validArtisans.find(a => a.artisanName === 'Test Business Profile');
        
        if (defaultArtisan) {
          await Product.updateOne(
            { _id: product._id },
            {
              $set: {
                seller: {
                  _id: defaultArtisan.user._id,
                  firstName: 'Test',
                  lastName: 'Business',
                  email: 'test@business.com'
                },
                'artisan': {
                  _id: defaultArtisan._id,
                  artisanName: defaultArtisan.artisanName,
                  type: 'other'
                }
              }
            }
          );
          
          console.log(`✅ Fixed product: ${product.name} -> ${defaultArtisan.artisanName} (no seller)`);
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
      { 'seller.lastName': null }
    ]
  });
  
  if (remainingIssues.length === 0) {
    console.log('✅ All products now have complete seller data!');
  } else {
    console.log(`⚠️  ${remainingIssues.length} products still have issues:`);
    remainingIssues.forEach(product => {
      console.log(`   - ${product.name}: seller=${product.seller?._id}, firstName=${product.seller?.firstName}, lastName=${product.seller?.lastName}`);
    });
  }
  
  // Step 6: Test that featured products endpoint works
  console.log('\n📋 Step 6: Testing featured products endpoint...');
  
  try {
    const testProducts = await Product.find({ status: 'active' }).limit(3);
    console.log(`✅ Found ${testProducts.length} active products for testing`);
    
    for (const product of testProducts) {
      console.log(`   - ${product.name}: seller=${product.seller?._id}, artisan=${product.artisan?._id}`);
    }
  } catch (error) {
    console.error('❌ Error testing products:', error);
  }
  
  console.log('\n🎉 Database cleanup completed!');
}
