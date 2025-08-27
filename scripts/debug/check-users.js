const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/user');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });
    
    // Check if the seller ID exists
    const sellerId = '68a733164b78eb31b9af9ef3';
    const sellerExists = users.some(u => u._id.toString() === sellerId);
    console.log(`🔗 Seller ID ${sellerId} exists: ${sellerExists}`);
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkUsers().catch(console.error);
