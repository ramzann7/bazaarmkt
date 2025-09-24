const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they're registered with mongoose
const User = require('./src/models/user');
const Artisan = require('./src/models/artisan');
const Product = require('./src/models/product');
const Order = require('./src/models/order');
const Review = require('./src/models/review');
const PromotionalFeature = require('./src/models/promotionalFeature');
const PromotionalPricing = require('./src/models/promotionalPricing');
const Wallet = require('./src/models/wallet');
const WalletTransaction = require('./src/models/walletTransaction');
const Revenue = require('./src/models/revenue');
const GeographicSettings = require('./src/models/geographicSettings');
const PlatformSettings = require('./src/models/platformSettings');
const CommunityPost = require('./src/models/communityPost');
const CommunityComment = require('./src/models/communityComment');
const ArtisanSpotlight = require('./src/models/artisanSpotlight');
const Badge = require('./src/models/badge');
const Reward = require('./src/models/reward');
const RewardRedemption = require('./src/models/rewardRedemption');
const ArtisanPoints = require('./src/models/artisanPoints');
const PlatformExpense = require('./src/models/platformExpense');
const AdminAudit = require('./src/models/adminAudit');

async function setupDatabaseStructure() {
  try {
    console.log('🚀 Setting up new database structure...');
    
    // Connect to new database
    const newDbUri = 'mongodb+srv://bazaar:v2SpCIZRLgEpwvhW@cluster0.c8vyia3.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(newDbUri);
    console.log('✅ Connected to new database');
    
    const db = mongoose.connection.db;
    
    // Create collections by ensuring models are registered
    console.log('📊 Creating collections...');
    
    // Force collection creation by ensuring models are registered
    const models = [
      'users', 'artisans', 'products', 'orders', 'reviews', 
      'promotionalfeatures', 'promotionalpricings', 'wallets', 
      'wallettransactions', 'revenues', 'geographicsettings', 
      'platformsettings', 'communityposts', 'communitycomments',
      'artisanspotlights', 'badges', 'rewards', 'rewardredemptions',
      'artisanpoints', 'platformexpenses', 'adminaudits'
    ];
    
    for (const modelName of models) {
      try {
        // Create collection if it doesn't exist
        await db.createCollection(modelName);
        console.log(`✅ Created collection: ${modelName}`);
      } catch (error) {
        if (error.code === 48) { // Collection already exists
          console.log(`ℹ️  Collection already exists: ${modelName}`);
        } else {
          console.log(`⚠️  Error creating ${modelName}:`, error.message);
        }
      }
    }
    
    // Create indexes for optimal performance
    console.log('🔍 Creating database indexes...');
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isActive: 1 });
    console.log('✅ User indexes created');
    
    // Artisan indexes
    await db.collection('artisans').createIndex({ user: 1 }, { unique: true });
    await db.collection('artisans').createIndex({ artisanName: 1 });
    await db.collection('artisans').createIndex({ businessType: 1 });
    await db.collection('artisans').createIndex({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
    await db.collection('artisans').createIndex({ rating: -1 });
    await db.collection('artisans').createIndex({ isVerified: 1 });
    console.log('✅ Artisan indexes created');
    
    // Product indexes
    await db.collection('products').createIndex({ artisan: 1 });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ subcategory: 1 });
    await db.collection('products').createIndex({ status: 1 });
    await db.collection('products').createIndex({ isActive: 1 });
    await db.collection('products').createIndex({ price: 1 });
    await db.collection('products').createIndex({ name: 'text', description: 'text', tags: 'text' });
    await db.collection('products').createIndex({ createdAt: -1 });
    console.log('✅ Product indexes created');
    
    // Order indexes
    await db.collection('orders').createIndex({ user: 1 });
    await db.collection('orders').createIndex({ artisan: 1 });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ orderDate: -1 });
    console.log('✅ Order indexes created');
    
    // Review indexes
    await db.collection('reviews').createIndex({ product: 1 });
    await db.collection('reviews').createIndex({ user: 1 });
    await db.collection('reviews').createIndex({ artisan: 1 });
    await db.collection('reviews').createIndex({ rating: 1 });
    await db.collection('reviews').createIndex({ createdAt: -1 });
    console.log('✅ Review indexes created');
    
    // Promotional Feature indexes
    await db.collection('promotionalfeatures').createIndex({ artisanId: 1 });
    await db.collection('promotionalfeatures').createIndex({ productId: 1 });
    await db.collection('promotionalfeatures').createIndex({ featureType: 1 });
    await db.collection('promotionalfeatures').createIndex({ status: 1 });
    await db.collection('promotionalfeatures').createIndex({ isActive: 1 });
    await db.collection('promotionalfeatures').createIndex({ startDate: 1, endDate: 1 });
    console.log('✅ Promotional Feature indexes created');
    
    // Wallet indexes
    await db.collection('wallets').createIndex({ user: 1 }, { unique: true });
    await db.collection('wallets').createIndex({ balance: 1 });
    console.log('✅ Wallet indexes created');
    
    // Wallet Transaction indexes
    await db.collection('wallettransactions').createIndex({ user: 1 });
    await db.collection('wallettransactions').createIndex({ type: 1 });
    await db.collection('wallettransactions').createIndex({ createdAt: -1 });
    await db.collection('wallettransactions').createIndex({ status: 1 });
    console.log('✅ Wallet Transaction indexes created');
    
    // Revenue indexes
    await db.collection('revenues').createIndex({ artisan: 1 });
    await db.collection('revenues').createIndex({ order: 1 });
    await db.collection('revenues').createIndex({ type: 1 });
    await db.collection('revenues').createIndex({ createdAt: -1 });
    console.log('✅ Revenue indexes created');
    
    // Community Post indexes
    await db.collection('communityposts').createIndex({ user: 1 });
    await db.collection('communityposts').createIndex({ type: 1 });
    await db.collection('communityposts').createIndex({ createdAt: -1 });
    await db.collection('communityposts').createIndex({ isActive: 1 });
    console.log('✅ Community Post indexes created');
    
    // Community Comment indexes
    await db.collection('communitycomments').createIndex({ post: 1 });
    await db.collection('communitycomments').createIndex({ user: 1 });
    await db.collection('communitycomments').createIndex({ createdAt: -1 });
    console.log('✅ Community Comment indexes created');
    
    // Artisan Spotlight indexes
    await db.collection('artisanspotlights').createIndex({ artisan: 1 });
    await db.collection('artisanspotlights').createIndex({ isActive: 1 });
    await db.collection('artisanspotlights').createIndex({ startDate: 1, endDate: 1 });
    console.log('✅ Artisan Spotlight indexes created');
    
    // Badge indexes
    await db.collection('badges').createIndex({ name: 1 }, { unique: true });
    await db.collection('badges').createIndex({ type: 1 });
    console.log('✅ Badge indexes created');
    
    // Reward indexes
    await db.collection('rewards').createIndex({ artisan: 1 });
    await db.collection('rewards').createIndex({ type: 1 });
    await db.collection('rewards').createIndex({ isActive: 1 });
    console.log('✅ Reward indexes created');
    
    // Reward Redemption indexes
    await db.collection('rewardredemptions').createIndex({ user: 1 });
    await db.collection('rewardredemptions').createIndex({ reward: 1 });
    await db.collection('rewardredemptions').createIndex({ createdAt: -1 });
    console.log('✅ Reward Redemption indexes created');
    
    // Artisan Points indexes
    await db.collection('artisanpoints').createIndex({ artisan: 1 });
    await db.collection('artisanpoints').createIndex({ type: 1 });
    await db.collection('artisanpoints').createIndex({ createdAt: -1 });
    console.log('✅ Artisan Points indexes created');
    
    // Platform Expense indexes
    await db.collection('platformexpenses').createIndex({ type: 1 });
    await db.collection('platformexpenses').createIndex({ createdAt: -1 });
    console.log('✅ Platform Expense indexes created');
    
    // Admin Audit indexes
    await db.collection('adminaudits').createIndex({ admin: 1 });
    await db.collection('adminaudits').createIndex({ action: 1 });
    await db.collection('adminaudits').createIndex({ createdAt: -1 });
    console.log('✅ Admin Audit indexes created');
    
    // Geographic Settings indexes
    await db.collection('geographicsettings').createIndex({ name: 1 }, { unique: true });
    console.log('✅ Geographic Settings indexes created');
    
    // Platform Settings indexes
    await db.collection('platformsettings').createIndex({ key: 1 }, { unique: true });
    console.log('✅ Platform Settings indexes created');
    
    // Promotional Pricing indexes
    await db.collection('promotionalpricings').createIndex({ featureType: 1 });
    await db.collection('promotionalpricings').createIndex({ isActive: 1 });
    console.log('✅ Promotional Pricing indexes created');
    
    console.log('🎉 Database structure setup completed successfully!');
    
    // List all collections to verify
    const collections = await db.listCollections().toArray();
    console.log('\n📊 Created collections:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
    }
    
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error setting up database structure:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabaseStructure();
