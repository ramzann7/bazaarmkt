const { MongoClient, ObjectId } = require('mongodb');

// MongoDB Atlas connection string
const ATLAS_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

async function fixSellerReferences() {
  let client;
  
  try {
    console.log('🔧 Fixing seller references in Atlas...');
    
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('bazarmkt');
    
    // Get all products
    const products = await db.collection('products').find({}).toArray();
    console.log(`📦 Found ${products.length} products to fix`);
    
    let fixedCount = 0;
    
    for (const product of products) {
      if (product.seller && typeof product.seller === 'string') {
        try {
          // Convert string to ObjectId
          const objectId = new ObjectId(product.seller);
          
          // Update the product with ObjectId
          await db.collection('products').updateOne(
            { _id: product._id },
            { $set: { seller: objectId } }
          );
          
          console.log(`✅ Fixed seller reference for product: ${product.name} (${product._id})`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing seller for product ${product._id}:`, error.message);
        }
      } else if (product.seller && typeof product.seller === 'object' && product.seller.$oid) {
        // Handle case where it's already an ObjectId object
        try {
          const objectId = new ObjectId(product.seller.$oid);
          
          await db.collection('products').updateOne(
            { _id: product._id },
            { $set: { seller: objectId } }
          );
          
          console.log(`✅ Fixed ObjectId reference for product: ${product.name} (${product._id})`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing ObjectId for product ${product._id}:`, error.message);
        }
      } else {
        console.log(`ℹ️ Product ${product.name} already has correct seller format or no seller`);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} seller references`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedProducts = await db.collection('products').find({}).toArray();
    
    for (const product of updatedProducts) {
      console.log(`  ${product.name}: seller type = ${typeof product.seller}, value = ${product.seller}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing seller references:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed Atlas connection');
    }
  }
}

// Run the fix
fixSellerReferences().catch(console.error);
