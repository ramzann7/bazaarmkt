const mongoose = require('mongoose');
require('dotenv').config();

async function checkTestBuyer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user');

    // Find the test buyer
    const testBuyer = await User.findOne({ email: 'testbuyer@example.com' });
    
    if (testBuyer) {
      console.log('✅ Test buyer found:');
      console.log('ID:', testBuyer._id);
      console.log('Email:', testBuyer.email);
      console.log('Role:', testBuyer.role);
      console.log('Password hash:', testBuyer.password);
      console.log('Created:', testBuyer.createdAt);
    } else {
      console.log('❌ Test buyer not found');
      
      // List all users
      const allUsers = await User.find({}).select('email role');
      console.log('\nAll users in database:');
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.role})`);
      });
    }

  } catch (error) {
    console.error('Error checking test buyer:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTestBuyer();
