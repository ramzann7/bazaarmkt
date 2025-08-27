const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetTestBuyerPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user');

    const user = await User.findOne({ email: 'testbuyer@example.com' });

    if (user) {
      const newPassword = 'test123';
      user.password = newPassword; // Mongoose pre-save hook will hash this
      await user.save();

      console.log('✅ Test buyer password reset successfully');
      console.log('New password:', newPassword);
      console.log('User email:', user.email);
      console.log('User role:', user.role);
    } else {
      console.log('❌ Test buyer not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetTestBuyerPassword();
