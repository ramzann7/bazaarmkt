const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user');

    // Find the producer user
    const user = await User.findOne({ email: 'ramz@hotmail.com' });
    
    if (user) {
      console.log('User found:');
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Password hash:', user.password);
      console.log('- Created:', user.createdAt);
    } else {
      console.log('User not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserPassword();
