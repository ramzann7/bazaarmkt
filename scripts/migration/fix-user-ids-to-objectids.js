const { MongoClient, ObjectId } = require('mongodb');

// MongoDB Atlas connection string
const ATLAS_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

async function fixUserIdsToObjectIds() {
  let client;
  
  try {
    console.log('🔧 Fixing user IDs to ObjectIds...');
    
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('bazarmkt');
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`👥 Found ${users.length} users to fix`);
    
    let fixedCount = 0;
    
    for (const user of users) {
      if (typeof user._id === 'string') {
        try {
          // Convert string ID to ObjectId
          const objectId = new ObjectId(user._id);
          
          // Create new user document with ObjectId
          const newUser = { ...user, _id: objectId };
          
          // Remove the old user and insert the new one
          await db.collection('users').deleteOne({ _id: user._id });
          await db.collection('users').insertOne(newUser);
          
          console.log(`✅ Fixed user ID: ${user.firstName} ${user.lastName} (${user._id} → ${objectId})`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing user ${user._id}:`, error.message);
        }
      } else {
        console.log(`ℹ️ User ${user.firstName} ${user.lastName} already has ObjectId`);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} user IDs`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedUsers = await db.collection('users').find({}).toArray();
    
    for (const user of updatedUsers) {
      console.log(`  ${user.firstName} ${user.lastName}: ID type = ${typeof user._id}, value = ${user._id}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing user IDs:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed Atlas connection');
    }
  }
}

// Run the fix
fixUserIdsToObjectIds().catch(console.error);
