const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./src/models/product');
const User = require('./src/models/user');

async function testWorkingPopulation() {
  try {
    console.log('🔍 Testing working population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all users first
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    // Use the first user as the seller
    const workingUserId = users[0]._id;
    console.log(`🎯 Using user as seller: ${users[0].firstName} ${users[0].lastName} (${workingUserId})`);
    
    // Update all products to use this working user as seller
    const updateResult = await Product.updateMany(
      {}, // Update all products
      { $set: { seller: workingUserId } }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} products to use working user as seller`);
    
    // Test population
    const products = await Product.find({}).populate('seller', 'firstName lastName email');
    
    console.log('\n📋 Products with populated sellers:');
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}:`);
      console.log(`   Seller: ${product.seller ? `${product.seller.firstName} ${product.seller.lastName}` : 'null'}`);
      console.log(`   Seller ID: ${product.seller ? product.seller._id : 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testWorkingPopulation().catch(console.error);
