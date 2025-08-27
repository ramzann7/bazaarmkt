const { MongoClient, ObjectId } = require('mongodb');

// MongoDB Atlas connection string
const ATLAS_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

async function fixSellerReferencesToExistingUsers() {
  let client;
  
  try {
    console.log('🔧 Fixing seller references to existing users...');
    
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('bazarmkt');
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`👥 Found ${users.length} users in Atlas:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });
    
    // Find a producer user to use as the seller
    const producerUser = users.find(u => u.role === 'producer');
    
    if (!producerUser) {
      throw new Error('No producer user found in Atlas');
    }
    
    console.log(`🎯 Using producer user as seller: ${producerUser.firstName} ${producerUser.lastName} (${producerUser._id})`);
    
    // Update all products to use this producer as the seller
    const result = await db.collection('products').updateMany(
      {}, // Update all products
      { $set: { seller: producerUser._id } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} products to use the producer as seller`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedProducts = await db.collection('products').find({}).toArray();
    
    for (const product of updatedProducts) {
      console.log(`  ${product.name}: seller = ${product.seller}`);
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
fixSellerReferencesToExistingUsers().catch(console.error);
