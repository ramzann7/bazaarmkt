/**
 * Complete Database Setup for Production
 * Run this script to set up all database indexes and initialize platform settings
 * 
 * Usage:
 *   NODE_ENV=production node scripts/complete-database-setup.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env.production' });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createIndexes(db) {
  log('\n📊 Creating Database Indexes...', 'cyan');
  log('=====================================', 'cyan');
  
  try {
    // Users Collection
    log('\n👥 Users collection...', 'blue');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    log('   ✓ email (unique)', 'green');
    
    await db.collection('users').createIndex({ role: 1 });
    log('   ✓ role', 'green');
    
    await db.collection('users').createIndex({ stripeCustomerId: 1 }, { sparse: true });
    log('   ✓ stripeCustomerId (sparse)', 'green');
    
    await db.collection('users').createIndex({ 'location.coordinates': '2dsphere' }, { sparse: true });
    log('   ✓ location.coordinates (2dsphere)', 'green');

    // Orders Collection
    log('\n📦 Orders collection...', 'blue');
    await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
    log('   ✓ userId + createdAt', 'green');
    
    await db.collection('orders').createIndex({ artisan: 1, status: 1, createdAt: -1 });
    log('   ✓ artisan + status + createdAt', 'green');
    
    await db.collection('orders').createIndex({ paymentIntentId: 1 }, { sparse: true });
    log('   ✓ paymentIntentId (sparse)', 'green');
    
    await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
    log('   ✓ status + createdAt', 'green');

    // Products Collection
    log('\n🛍️  Products collection...', 'blue');
    await db.collection('products').createIndex({ artisan: 1, status: 1 });
    log('   ✓ artisan + status', 'green');
    
    await db.collection('products').createIndex({ category: 1, status: 1 });
    log('   ✓ category + status', 'green');
    
    await db.collection('products').createIndex({ status: 1, isFeatured: -1 });
    log('   ✓ status + isFeatured', 'green');
    
    await db.collection('products').createIndex({ name: 'text', description: 'text' });
    log('   ✓ name + description (text search)', 'green');
    
    await db.collection('products').createIndex({ 'location.coordinates': '2dsphere' }, { sparse: true });
    log('   ✓ location.coordinates (2dsphere)', 'green');

    // Artisans Collection
    log('\n🎨 Artisans collection...', 'blue');
    await db.collection('artisans').createIndex({ user: 1 }, { unique: true });
    log('   ✓ user (unique)', 'green');
    
    await db.collection('artisans').createIndex({ isActive: 1, isVerified: 1 });
    log('   ✓ isActive + isVerified', 'green');
    
    await db.collection('artisans').createIndex({ 'location.coordinates': '2dsphere' });
    log('   ✓ location.coordinates (2dsphere)', 'green');
    
    await db.collection('artisans').createIndex({ businessName: 'text', bio: 'text' });
    log('   ✓ businessName + bio (text search)', 'green');

    // Wallets Collection
    log('\n💰 Wallets collection...', 'blue');
    await db.collection('wallets').createIndex({ artisanId: 1 }, { unique: true });
    log('   ✓ artisanId (unique)', 'green');
    
    await db.collection('wallets').createIndex({ stripeAccountId: 1 }, { sparse: true, unique: true });
    log('   ✓ stripeAccountId (unique, sparse)', 'green');

    // Wallet Transactions Collection
    log('\n💸 Wallet transactions collection...', 'blue');
    await db.collection('wallettransactions').createIndex({ walletId: 1, createdAt: -1 });
    log('   ✓ walletId + createdAt', 'green');
    
    await db.collection('wallettransactions').createIndex({ orderId: 1 }, { sparse: true });
    log('   ✓ orderId (sparse)', 'green');

    // Notifications Collection
    log('\n🔔 Notifications collection...', 'blue');
    await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 });
    log('   ✓ userId + createdAt', 'green');
    
    await db.collection('notifications').createIndex({ userId: 1, isRead: 1, createdAt: -1 });
    log('   ✓ userId + isRead + createdAt', 'green');

    // Reviews Collection
    log('\n⭐ Reviews collection...', 'blue');
    await db.collection('reviews').createIndex({ productId: 1, createdAt: -1 });
    log('   ✓ productId + createdAt', 'green');
    
    await db.collection('reviews').createIndex({ artisanId: 1, createdAt: -1 });
    log('   ✓ artisanId + createdAt', 'green');
    
    await db.collection('reviews').createIndex({ userId: 1, productId: 1 }, { unique: true });
    log('   ✓ userId + productId (unique)', 'green');

    // Favorites Collection
    log('\n❤️  Favorites collection...', 'blue');
    await db.collection('favorites').createIndex({ userId: 1, productId: 1 }, { unique: true });
    log('   ✓ userId + productId (unique)', 'green');
    
    await db.collection('favorites').createIndex({ userId: 1, createdAt: -1 });
    log('   ✓ userId + createdAt', 'green');

    // Community Posts Collection
    log('\n📱 Community posts collection...', 'blue');
    await db.collection('communityposts').createIndex({ artisan: 1, createdAt: -1 });
    log('   ✓ artisan + createdAt', 'green');
    
    await db.collection('communityposts').createIndex({ createdAt: -1 });
    log('   ✓ createdAt', 'green');

    // Spotlight Listings Collection
    log('\n✨ Spotlight listings collection...', 'blue');
    await db.collection('spotlightlistings').createIndex({ artisan: 1, status: 1 });
    log('   ✓ artisan + status', 'green');
    
    await db.collection('spotlightlistings').createIndex({ status: 1, startDate: 1 });
    log('   ✓ status + startDate', 'green');
    
    await db.collection('spotlightlistings').createIndex({ endDate: 1 });
    log('   ✓ endDate', 'green');

    // Platform Settings Collection
    log('\n⚙️  Platform settings collection...', 'blue');
    await db.collection('platformsettings').createIndex({ type: 1 }, { unique: true });
    log('   ✓ type (unique)', 'green');

    // Admin Audit Logs Collection
    log('\n📋 Admin audit logs collection...', 'blue');
    await db.collection('adminauditlogs').createIndex({ adminId: 1, timestamp: -1 });
    log('   ✓ adminId + timestamp', 'green');
    
    await db.collection('adminauditlogs').createIndex({ action: 1, timestamp: -1 });
    log('   ✓ action + timestamp', 'green');

    log('\n✅ All indexes created successfully!', 'green');
    
  } catch (error) {
    log(`\n❌ Error creating indexes: ${error.message}`, 'red');
    throw error;
  }
}

async function initializePlatformSettings(db) {
  log('\n⚙️  Initializing Platform Settings...', 'cyan');
  log('=====================================', 'cyan');
  
  try {
    const settingsCollection = db.collection('platformsettings');
    
    // Check if settings already exist
    const existingSettings = await settingsCollection.findOne({ type: 'main' });
    
    if (existingSettings) {
      log('\n✅ Platform settings already exist', 'yellow');
      log('\n📊 Current settings:', 'blue');
      log(`   Order fee: ${(existingSettings.fees.order.rate * 100).toFixed(1)}%`, 'cyan');
      log(`   Spotlight fee: ${(existingSettings.fees.spotlight.rate * 100).toFixed(1)}%`, 'cyan');
      log(`   Promotional fee: ${(existingSettings.fees.promotional.rate * 100).toFixed(1)}%`, 'cyan');
      log(`   Auto-capture: ${existingSettings.payment.autoCaptureHours} hours`, 'cyan');
      log(`   Currency: ${existingSettings.payment.currency}`, 'cyan');
      return existingSettings;
    }
    
    // Create default settings
    log('\n📝 Creating default platform settings...', 'blue');
    
    const defaultSettings = {
      type: 'main',
      fees: {
        order: {
          rate: 0.10,  // 10%
          minAmount: 0.50,
          maxAmount: null
        },
        spotlight: {
          rate: 0.00,  // Free for now
          minAmount: 0,
          maxAmount: null
        },
        promotional: {
          rate: 0.00,  // Free for now
          minAmount: 0,
          maxAmount: null
        }
      },
      payment: {
        currency: 'cad',
        autoCaptureHours: 72,
        holdPeriodDays: 7
      },
      limits: {
        minOrderAmount: 1.00,
        maxOrderAmount: 10000.00,
        maxSpotlightDuration: 30,
        maxPromotionalDuration: 30
      },
      features: {
        spotlightEnabled: true,
        promotionalEnabled: true,
        reviewsEnabled: true,
        communityEnabled: true,
        deliveryEnabled: true,
        walletEnabled: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await settingsCollection.insertOne(defaultSettings);
    
    log('\n✅ Platform settings created successfully!', 'green');
    log('\n📊 Default settings:', 'blue');
    log(`   Order fee: ${(defaultSettings.fees.order.rate * 100).toFixed(1)}%`, 'cyan');
    log(`   Spotlight fee: ${(defaultSettings.fees.spotlight.rate * 100).toFixed(1)}%`, 'cyan');
    log(`   Promotional fee: ${(defaultSettings.fees.promotional.rate * 100).toFixed(1)}%`, 'cyan');
    log(`   Auto-capture: ${defaultSettings.payment.autoCaptureHours} hours`, 'cyan');
    log(`   Currency: ${defaultSettings.payment.currency}`, 'cyan');
    log(`   Min order: $${defaultSettings.limits.minOrderAmount}`, 'cyan');
    log(`   Max order: $${defaultSettings.limits.maxOrderAmount}`, 'cyan');
    
    return defaultSettings;
    
  } catch (error) {
    log(`\n❌ Error initializing platform settings: ${error.message}`, 'red');
    throw error;
  }
}

async function verifySetup(db) {
  log('\n🔍 Verifying Database Setup...', 'cyan');
  log('=====================================', 'cyan');
  
  try {
    // Get all collections
    const collections = await db.listCollections().toArray();
    log(`\n📚 Found ${collections.length} collections`, 'blue');
    
    // Check indexes for each collection
    let totalIndexes = 0;
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes();
      totalIndexes += indexes.length;
    }
    log(`📊 Total indexes: ${totalIndexes}`, 'blue');
    
    // Verify platform settings
    const settings = await db.collection('platformsettings').findOne({ type: 'main' });
    if (settings) {
      log('⚙️  Platform settings: ✓', 'green');
    } else {
      log('⚙️  Platform settings: ✗', 'red');
    }
    
    log('\n✅ Database setup verification complete!', 'green');
    
  } catch (error) {
    log(`\n❌ Error verifying setup: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  let client;
  
  try {
    log('\n🚀 BazaarMKT Database Setup', 'cyan');
    log('===========================\n', 'cyan');
    
    // Check environment
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      log('❌ MONGODB_URI not found in environment', 'red');
      log('Please set MONGODB_URI in your .env.production file', 'yellow');
      process.exit(1);
    }
    
    log(`🔌 Connecting to MongoDB...`, 'blue');
    log(`   Environment: ${process.env.NODE_ENV || 'development'}`, 'cyan');
    
    // Connect to database
    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db();
    
    log(`✅ Connected to database: ${db.databaseName}`, 'green');
    
    // Create indexes
    await createIndexes(db);
    
    // Initialize platform settings
    await initializePlatformSettings(db);
    
    // Verify setup
    await verifySetup(db);
    
    log('\n🎉 Database setup completed successfully!', 'green');
    log('\n📋 Next steps:', 'cyan');
    log('   1. Verify in MongoDB Atlas that all indexes are created', 'blue');
    log('   2. Test platform settings endpoint: GET /api/admin/platform-settings', 'blue');
    log('   3. Deploy to Vercel: npx vercel --prod', 'blue');
    log('', 'reset');
    
  } catch (error) {
    log(`\n💥 Error: ${error.message}`, 'red');
    log('\nStack trace:', 'yellow');
    console.error(error);
    process.exit(1);
    
  } finally {
    if (client) {
      await client.close();
      log('🔌 Database connection closed', 'blue');
    }
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createIndexes, initializePlatformSettings, verifySetup };

