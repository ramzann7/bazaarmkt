const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/user');

async function checkUserValidation() {
  try {
    console.log('🔍 Checking user validation...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get raw data from the collection
    const db = mongoose.connection.db;
    const rawUsers = await db.collection('users').find({}).toArray();
    
    console.log(`📋 Found ${rawUsers.length} raw users in collection`);
    
    rawUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. Raw user data:`);
      console.log('   _id:', user._id);
      console.log('   firstName:', user.firstName);
      console.log('   lastName:', user.lastName);
      console.log('   email:', user.email);
      console.log('   role:', user.role);
      console.log('   password:', user.password ? 'Present' : 'Missing');
      
      // Try to create a User model instance
      try {
        const userModel = new User(user);
        console.log('   ✅ User model validation: PASSED');
      } catch (error) {
        console.log('   ❌ User model validation: FAILED');
        console.log('   Error:', error.message);
      }
    });
    
    // Test findById with each user
    console.log('\n📋 Testing findById with each user...');
    for (const rawUser of rawUsers) {
      const userById = await User.findById(rawUser._id);
      console.log(`User ${rawUser.firstName} ${rawUser.lastName}: ${userById ? 'Found' : 'Not found'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkUserValidation().catch(console.error);
