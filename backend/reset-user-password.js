const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetUserPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user');

    // Find the producer user
    const user = await User.findOne({ email: 'ramz@hotmail.com' });
    
    if (user) {
      // Set a new password
      const newPassword = 'test123';
      user.password = newPassword;
      await user.save();
      
      console.log('✅ Password reset successfully');
      console.log('New password:', newPassword);
      console.log('User email:', user.email);
      console.log('User role:', user.role);
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetUserPassword();
