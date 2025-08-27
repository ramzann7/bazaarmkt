const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function testUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import User model
    const User = require('./src/models/user');

    // Find all users and their roles
    const users = await User.find({}).select('firstName lastName email role');
    console.log('\n📋 All Users:');
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}): ${user.role}`);
    });

    // Find producers specifically
    const producers = await User.find({ role: 'producer' }).select('firstName lastName email role');
    console.log('\n👨‍🌾 Producers:');
    producers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}): ${user.role}`);
    });

    // Find sellers specifically
    const sellers = await User.find({ role: 'seller' }).select('firstName lastName email role');
    console.log('\n🏪 Sellers:');
    sellers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}): ${user.role}`);
    });

    // Find buyers specifically
    const buyers = await User.find({ role: 'buyer' }).select('firstName lastName email role');
    console.log('\n🛒 Buyers:');
    buyers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}): ${user.role}`);
    });

    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testUserRole();
