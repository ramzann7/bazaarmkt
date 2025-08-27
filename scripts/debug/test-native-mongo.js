const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testNativeMongo() {
  let client;
  
  try {
    console.log('🔍 Testing native MongoDB driver...');
    
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('bazarmkt');
    
    // Test 1: Get users with native driver
    console.log('\n📋 Test 1: Getting users with native driver...');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users`);
    
    if (users.length > 0) {
      const firstUser = users[0];
      console.log('First user:', {
        _id: firstUser._id,
        firstName: firstUser.firstName,
        lastName: firstUser.lastName,
        email: firstUser.email
      });
      
      // Test 2: Get products with native driver
      console.log('\n📋 Test 2: Getting products with native driver...');
      const products = await db.collection('products').find({}).toArray();
      console.log(`Found ${products.length} products`);
      
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('First product:', {
          _id: firstProduct._id,
          name: firstProduct.name,
          seller: firstProduct.seller
        });
        
        // Test 3: Manual join using native driver
        console.log('\n📋 Test 3: Manual join...');
        const seller = await db.collection('users').findOne({ _id: firstProduct.seller });
        console.log('Seller found:', seller ? {
          _id: seller._id,
          firstName: seller.firstName,
          lastName: seller.lastName
        } : 'null');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed MongoDB connection');
    }
  }
}

// Run the test
testNativeMongo().catch(console.error);
