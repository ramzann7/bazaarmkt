const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./src/models/product');
const User = require('./src/models/user');

async function testSpecificPopulation() {
  try {
    console.log('🔍 Testing specific population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const sellerId = '68a72f074b78eb31b9af9e75';
    
    // Test 1: Find the user directly
    console.log('\n📋 Test 1: Finding user directly...');
    const user = await User.findById(sellerId);
    console.log('User found:', user ? {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    } : 'null');
    
    // Test 2: Find product with this seller
    console.log('\n📋 Test 2: Finding product with seller...');
    const product = await Product.findOne({ seller: sellerId });
    console.log('Product found:', product ? {
      _id: product._id,
      name: product.name,
      seller: product.seller,
      sellerType: typeof product.seller
    } : 'null');
    
    // Test 3: Test population with this specific product
    console.log('\n📋 Test 3: Testing population...');
    if (product) {
      const productWithSeller = await Product.findById(product._id)
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
          lastName: productWithSeller.seller.lastName,
          email: productWithSeller.seller.email
        });
      } else {
        console.log('❌ Seller is null after population');
      }
    }
    
    // Test 4: Test with ObjectId
    console.log('\n📋 Test 4: Testing with ObjectId...');
    const objectId = new mongoose.Types.ObjectId(sellerId);
    const productWithObjectId = await Product.findOne({ seller: objectId })
      .populate('seller', 'firstName lastName email phone');
    
    console.log('Product with ObjectId population:', {
      _id: productWithObjectId._id,
      name: productWithObjectId.name,
      seller: productWithObjectId.seller,
      sellerType: typeof productWithObjectId.seller
    });
    
  } catch (error) {
    console.error('❌ Error testing population:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSpecificPopulation().catch(console.error);
