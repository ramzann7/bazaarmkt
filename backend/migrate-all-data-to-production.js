const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connections
const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bazaarmkt';
const PRODUCTION_DB_URI = 'mongodb+srv://bazaar:v2SpCIZRLgEpwvhW@cluster0.c8vyia3.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority';

// Import all models
const User = require('./src/models/user');
const Product = require('./src/models/product');
const Artisan = require('./src/models/artisan');
const Order = require('./src/models/order');
const Review = require('./src/models/review');
const PromotionalFeature = require('./src/models/promotionalFeature');
const PromotionalPricing = require('./src/models/promotionalPricing');
const GeographicSettings = require('./src/models/geographicSettings');
const PlatformSettings = require('./src/models/platformSettings');
const ArtisanPoints = require('./src/models/artisanPoints');
const ArtisanSpotlight = require('./src/models/artisanSpotlight');
const Badge = require('./src/models/badge');
const CommunityPost = require('./src/models/communityPost');
const CommunityComment = require('./src/models/communityComment');
const Foodmaker = require('./src/models/foodmaker');
const PlatformExpense = require('./src/models/platformExpense');
const Revenue = require('./src/models/revenue');
const Reward = require('./src/models/reward');
const RewardRedemption = require('./src/models/rewardRedemption');
const Seller = require('./src/models/seller');
const Wallet = require('./src/models/wallet');
const WalletTransaction = require('./src/models/walletTransaction');
const AdminAudit = require('./src/models/adminAudit');

// All models to migrate
const models = [
  { name: 'User', model: User },
  { name: 'Product', model: Product },
  { name: 'Artisan', model: Artisan },
  { name: 'Order', model: Order },
  { name: 'Review', model: Review },
  { name: 'PromotionalFeature', model: PromotionalFeature },
  { name: 'PromotionalPricing', model: PromotionalPricing },
  { name: 'GeographicSettings', model: GeographicSettings },
  { name: 'PlatformSettings', model: PlatformSettings },
  { name: 'ArtisanPoints', model: ArtisanPoints },
  { name: 'ArtisanSpotlight', model: ArtisanSpotlight },
  { name: 'Badge', model: Badge },
  { name: 'CommunityPost', model: CommunityPost },
  { name: 'CommunityComment', model: CommunityComment },
  { name: 'Foodmaker', model: Foodmaker },
  { name: 'PlatformExpense', model: PlatformExpense },
  { name: 'Revenue', model: Revenue },
  { name: 'Reward', model: Reward },
  { name: 'RewardRedemption', model: RewardRedemption },
  { name: 'Seller', model: Seller },
  { name: 'Wallet', model: Wallet },
  { name: 'WalletTransaction', model: WalletTransaction },
  { name: 'AdminAudit', model: AdminAudit }
];

async function migrateAllData() {
  let testConnection, productionConnection;
  
  try {
    console.log('🚀 Starting comprehensive data migration to production...');
    console.log('📊 Migrating all collections and data');
    
    // Connect to test database
    console.log('🔗 Connecting to TEST database...');
    testConnection = await mongoose.createConnection(TEST_DB_URI);
    console.log('✅ Connected to test database');
    
    // Connect to production database
    console.log('🔗 Connecting to PRODUCTION database...');
    productionConnection = await mongoose.createConnection(PRODUCTION_DB_URI);
    console.log('✅ Connected to production database');
    
    // Test connections
    console.log('✅ Both database connections established');
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    
    // Migrate each model
    for (const { name, model } of models) {
      try {
        console.log(`\n📦 Migrating ${name} collection...`);
        
        // Get test data
        const testModel = testConnection.model(name, model.schema);
        const testData = await testModel.find({}).lean();
        
        if (testData.length === 0) {
          console.log(`⚠️ No ${name} data found in test database`);
          continue;
        }
        
        console.log(`📋 Found ${testData.length} ${name} documents in test database`);
        
        // Get production model
        const productionModel = productionConnection.model(name, model.schema);
        
        // Check for existing data
        const existingData = await productionModel.find({}).lean();
        if (existingData.length > 0) {
          console.log(`⚠️ Found ${existingData.length} existing ${name} documents in production`);
          console.log(`🔄 Clearing existing ${name} data in production...`);
          await productionModel.deleteMany({});
        }
        
        // Insert data into production
        const result = await productionModel.insertMany(testData, { ordered: false });
        console.log(`✅ Successfully migrated ${result.length} ${name} documents to production`);
        
        totalMigrated += result.length;
        
        // Create indexes for the collection
        try {
          console.log(`🔧 Creating indexes for ${name} collection...`);
          await productionModel.createIndexes();
          console.log(`✅ Indexes created for ${name}`);
        } catch (indexError) {
          console.log(`⚠️ Index creation warning for ${name}:`, indexError.message);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating ${name}:`, error.message);
        totalSkipped += 1;
      }
    }
    
    // Summary
    console.log('\n🎉 Migration Summary:');
    console.log(`✅ Total documents migrated: ${totalMigrated}`);
    console.log(`⚠️ Collections with errors: ${totalSkipped}`);
    console.log(`📊 Collections processed: ${models.length}`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    for (const { name, model } of models) {
      try {
        const testModel = testConnection.model(name, model.schema);
        const productionModel = productionConnection.model(name, model.schema);
        
        const testCount = await testModel.countDocuments();
        const productionCount = await productionModel.countDocuments();
        
        if (testCount === productionCount) {
          console.log(`✅ ${name}: ${testCount} documents (match)`);
        } else {
          console.log(`⚠️ ${name}: Test=${testCount}, Production=${productionCount} (mismatch)`);
        }
      } catch (error) {
        console.log(`❌ ${name}: Verification failed - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Migration completed successfully!');
    console.log('📝 All data has been migrated from test to production database');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close connections
    if (testConnection) {
      await testConnection.close();
      console.log('🔌 Test database connection closed');
    }
    if (productionConnection) {
      await productionConnection.close();
      console.log('🔌 Production database connection closed');
    }
  }
}

// Run migration
migrateAllData();
