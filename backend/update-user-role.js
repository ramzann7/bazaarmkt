const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const User = require('./src/models/user');

async function updateUserRole() {
  try {
    // Update the existing test user to have artisan role
    const result = await User.findOneAndUpdate(
      { email: 'test@example.com' },
      { role: 'artisan' },
      { new: true }
    );

    if (result) {
      console.log('✅ User role updated successfully!');
      console.log('User:', {
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role
      });
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error updating user role:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateUserRole();
