const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./src/models/product');
const User = require('./src/models/user');

async function testPopulationSimple() {
  try {
    console.log('🔍 Testing simple population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get a product
    const product = await Product.findOne();
    console.log('Product found:', product ? {
      _id: product._id,
      name: product.name,
      seller: product.seller
    } : 'null');
    
    if (product) {
      // Test population
      console.log('\n📋 Testing population...');
      const populatedProduct = await Product.findById(product._id)
        .populate('seller', 'firstName lastName email');
      
      console.log('Populated product:', {
        _id: populatedProduct._id,
        name: populatedProduct.name,
        seller: populatedProduct.seller
      });
      
      if (populatedProduct.seller) {
        console.log('Seller details:', {
          _id: populatedProduct.seller._id,
          firstName: populatedProduct.seller.firstName,
          lastName: populatedProduct.seller.lastName
        });
      } else {
        console.log('❌ Seller is null after population');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPopulationSimple().catch(console.error);
