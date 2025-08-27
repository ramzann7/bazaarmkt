const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string
const ATLAS_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

async function verifyAtlasData() {
  let client;
  
  try {
    console.log('🔍 Verifying Atlas data structure...');
    
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('bazarmkt');
    
    // Check products
    const products = await db.collection('products').find({}).toArray();
    console.log(`📦 Products in Atlas: ${products.length} documents`);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('📋 First product structure:');
      console.log('  - _id:', firstProduct._id);
      console.log('  - name:', firstProduct.name);
      console.log('  - seller:', firstProduct.seller);
      console.log('  - seller type:', typeof firstProduct.seller);
      
      // Check if all products have seller
      const productsWithSeller = products.filter(p => p.seller);
      console.log(`✅ Products with seller field: ${productsWithSeller.length}/${products.length}`);
    }
    
    // Check users
    const users = await db.collection('users').find({}).toArray();
    console.log(`👥 Users in Atlas: ${users.length} documents`);
    
    if (users.length > 0) {
      const firstUser = users[0];
      console.log('📋 First user structure:');
      console.log('  - _id:', firstUser._id);
      console.log('  - firstName:', firstUser.firstName);
      console.log('  - lastName:', firstUser.lastName);
    }
    
    // Check if seller ID exists in users
    if (products.length > 0 && users.length > 0) {
      const sellerId = products[0].seller;
      const sellerExists = users.some(u => u._id === sellerId);
      console.log(`🔗 Seller ID ${sellerId} exists in users: ${sellerExists}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying Atlas data:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed Atlas connection');
    }
  }
}

// Run the verification
verifyAtlasData().catch(console.error);
