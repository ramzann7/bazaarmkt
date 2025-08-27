const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./src/models/product');
const User = require('./src/models/user');

async function debugPopulation() {
  try {
    console.log('🔍 Debugging population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Check if we can find users
    console.log('\n📋 Test 1: Finding users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    if (users.length > 0) {
      const firstUser = users[0];
      console.log('First user:', {
        _id: firstUser._id,
        firstName: firstUser.firstName,
        lastName: firstUser.lastName
      });
      
      // Test 2: Try to find user by ID
      console.log('\n📋 Test 2: Finding user by ID...');
      const userById = await User.findById(firstUser._id);
      console.log('User by ID:', userById ? 'Found' : 'Not found');
      
      // Test 3: Check products
      console.log('\n📋 Test 3: Finding products...');
      const products = await Product.find({});
      console.log(`Found ${products.length} products`);
      
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('First product:', {
          _id: firstProduct._id,
          name: firstProduct.name,
          seller: firstProduct.seller,
          sellerType: typeof firstProduct.seller
        });
        
        // Test 4: Try population with explicit reference
        console.log('\n📋 Test 4: Testing population...');
        const populatedProduct = await Product.findById(firstProduct._id)
          .populate({
            path: 'seller',
            select: 'firstName lastName email',
            model: 'User'
          });
        
        console.log('Populated product seller:', populatedProduct.seller);
        
        // Test 5: Try manual population
        console.log('\n📋 Test 5: Manual population...');
        if (firstProduct.seller) {
          const seller = await User.findById(firstProduct.seller);
          console.log('Manual seller lookup:', seller ? {
            _id: seller._id,
            firstName: seller.firstName,
            lastName: seller.lastName
          } : 'null');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug
debugPopulation().catch(console.error);
