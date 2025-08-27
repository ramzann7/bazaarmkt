const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./src/models/product');
const User = require('./src/models/user');

async function simpleTest() {
  try {
    console.log('🔍 Simple test...');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Count users
    const userCount = await User.countDocuments();
    console.log(`👥 Users count: ${userCount}`);
    
    // Test 2: Count products
    const productCount = await Product.countDocuments();
    console.log(`📦 Products count: ${productCount}`);
    
    // Test 3: Get first product
    const firstProduct = await Product.findOne();
    console.log('First product:', firstProduct ? {
      _id: firstProduct._id,
      name: firstProduct.name,
      seller: firstProduct.seller,
      sellerType: typeof firstProduct.seller
    } : 'null');
    
    // Test 4: Get first user
    const firstUser = await User.findOne();
    console.log('First user:', firstUser ? {
      _id: firstUser._id,
      firstName: firstUser.firstName,
      lastName: firstUser.lastName,
      role: firstUser.role
    } : 'null');
    
    // Test 5: Try population
    if (firstProduct && firstProduct.seller) {
      console.log('\n📋 Testing population...');
      const populatedProduct = await Product.findById(firstProduct._id)
        .populate('seller', 'firstName lastName email');
      
      console.log('Populated product seller:', populatedProduct.seller);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
simpleTest().catch(console.error);
