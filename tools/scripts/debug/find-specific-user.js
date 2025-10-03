const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/user');

async function findSpecificUser() {
  try {
    console.log('🔍 Finding specific user...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = '68a72f074b78eb31b9af9e75';
    
    // Find user by ID
    const user = await User.findById(userId);
    console.log('User found:', user ? {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    } : 'null');
    
    // Find user by string ID
    const userByString = await User.findById(userId.toString());
    console.log('User by string ID:', userByString ? {
      _id: userByString._id,
      firstName: userByString.firstName,
      lastName: userByString.lastName,
      email: userByString.email,
      role: userByString.role
    } : 'null');
    
    // Find all users
    const allUsers = await User.find({});
    console.log('\nAll users:');
    allUsers.forEach((u, index) => {
      console.log(`${index + 1}. ID: ${u._id}, Name: ${u.firstName} ${u.lastName}, Role: ${u.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
findSpecificUser().catch(console.error);
