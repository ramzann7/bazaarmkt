const mongoose = require('mongoose');
const Product = require('../models/product');
const PromotionalFeature = require('../models/promotionalFeature');
const Order = require('../models/order');
const Artisan = require('../models/artisan');
require('dotenv').config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Product indexes
    await Product.collection.createIndex({ category: 1, price: 1 });
    await Product.collection.createIndex({ artisan: 1, isActive: 1 });
    await Product.collection.createIndex({ name: 'text', description: 'text' });
    console.log('✅ Product indexes created');

    // Promotional feature indexes
    await PromotionalFeature.collection.createIndex({ featureType: 1, isActive: 1 });
    await PromotionalFeature.collection.createIndex({ artisanId: 1, startDate: 1, endDate: 1 });
    await PromotionalFeature.collection.createIndex({ paymentStatus: 1, paymentDate: 1 });
    console.log('✅ Promotional feature indexes created');

    // Order indexes
    await Order.collection.createIndex({ patron: 1, createdAt: -1 });
    await Order.collection.createIndex({ status: 1, createdAt: -1 });
    console.log('✅ Order indexes created');

    // Artisan indexes
    await Artisan.collection.createIndex({ type: 1, isActive: 1 });
    await Artisan.collection.createIndex({ 'address.city': 1, isActive: 1 });
    console.log('✅ Artisan indexes created');

    console.log('🎉 All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createIndexes();
