const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string - updated with new credentials
const ATLAS_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

async function testConnection() {
  let client;
  
  try {
    console.log('🧪 Testing MongoDB Atlas connection...');
    console.log('🔗 Connection string:', ATLAS_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    const db = client.db('bazarmkt');
    
    // Test basic operations
    console.log('🔍 Testing database operations...');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    // Test ping
    await db.command({ ping: 1 });
    console.log('✅ Database ping successful');
    
    // Test read operation
    const userCount = await db.collection('users').countDocuments();
    console.log(`👥 Users collection: ${userCount} documents`);
    
    const productCount = await db.collection('products').countDocuments();
    console.log(`📦 Products collection: ${productCount} documents`);
    
    const producerCount = await db.collection('producers').countDocuments();
    console.log(`🏭 Producers collection: ${producerCount} documents`);
    
    console.log('\n🎉 Atlas connection test completed successfully!');
    console.log('✅ Your application is ready to use MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ Atlas connection test failed:', error.message);
    
    if (error.code === 8000) {
      console.log('\n🔧 Authentication failed. Please check:');
      console.log('1. Username and password are correct');
      console.log('2. IP address is whitelisted in Atlas');
      console.log('3. Database user has proper permissions');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 Network error. Please check:');
      console.log('1. Internet connection is working');
      console.log('2. Atlas cluster is accessible');
      console.log('3. Connection string format is correct');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed Atlas connection');
    }
  }
}

// Run the test
testConnection().catch(console.error);
