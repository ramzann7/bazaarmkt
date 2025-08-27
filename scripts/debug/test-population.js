const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Import models
const Product = require('./backend/src/models/product');
const User = require('./backend/src/models/user');

async function testPopulation() {
  try {
    console.log('🔍 Testing Mongoose population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Check if User model exists
    console.log('\n📋 Test 1: Checking User model...');
    const users = await User.find({}).limit(1);
    console.log(`Found ${users.length} users`);
    
    if (users.length > 0) {
      console.log('First user:', {
        _id: users[0]._id,
        firstName: users[0].firstName,
        lastName: users[0].lastName
      });
    }
    
    // Test 2: Check if Product model exists
    console.log('\n📋 Test 2: Checking Product model...');
    const products = await Product.find({}).limit(1);
    console.log(`Found ${products.length} products`);
    
    if (products.length > 0) {
      console.log('First product:', {
        _id: products[0]._id,
        name: products[0].name,
        seller: products[0].seller,
        sellerType: typeof products[0].seller
      });
    }
    
    // Test 3: Test population
    console.log('\n📋 Test 3: Testing population...');
    const productWithSeller = await Product.findById(products[0]._id)
      .populate('seller', 'firstName lastName email phone');
    
    console.log('Product with populated seller:', {
      _id: productWithSeller._id,
      name: productWithSeller.name,
      seller: productWithSeller.seller,
      sellerType: typeof productWithSeller.seller
    });
    
    if (productWithSeller.seller) {
      console.log('Seller details:', {
        _id: productWithSeller.seller._id,
        firstName: productWithSeller.seller.firstName,
        lastName: productWithSeller.seller.lastName
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing population:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPopulation().catch(console.error);
