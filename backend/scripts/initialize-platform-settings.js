/**
 * Initialize Platform Settings Script
 * Creates default platform settings in the database
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

async function initializePlatformSettings() {
  let client;
  
  try {
    console.log('🚀 Initializing platform settings...');
    
    // Connect to database
    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    const db = client.db();
    
    // Import platform settings service
    const PlatformSettingsService = require('../services/platformSettingsService');
    const platformSettingsService = new PlatformSettingsService(db);
    
    // Check if settings already exist
    const existingSettings = await platformSettingsService.getPlatformSettings();
    
    if (existingSettings && existingSettings.type === 'main') {
      console.log('✅ Platform settings already exist');
      console.log('📊 Current settings:');
      console.log(`   - Order fee rate: ${(existingSettings.fees.order.rate * 100).toFixed(1)}%`);
      console.log(`   - Spotlight fee rate: ${(existingSettings.fees.spotlight.rate * 100).toFixed(1)}%`);
      console.log(`   - Promotional fee rate: ${(existingSettings.fees.promotional.rate * 100).toFixed(1)}%`);
      console.log(`   - Auto-capture hours: ${existingSettings.payment.autoCaptureHours}`);
      console.log(`   - Currency: ${existingSettings.payment.currency}`);
      return;
    }
    
    // Create default settings
    console.log('📝 Creating default platform settings...');
    const defaultSettings = await platformSettingsService.createDefaultSettings();
    
    console.log('✅ Platform settings initialized successfully!');
    console.log('📊 Default settings created:');
    console.log(`   - Order fee rate: ${(defaultSettings.fees.order.rate * 100).toFixed(1)}%`);
    console.log(`   - Spotlight fee rate: ${(defaultSettings.fees.spotlight.rate * 100).toFixed(1)}%`);
    console.log(`   - Promotional fee rate: ${(defaultSettings.fees.promotional.rate * 100).toFixed(1)}%`);
    console.log(`   - Auto-capture hours: ${defaultSettings.payment.autoCaptureHours}`);
    console.log(`   - Currency: ${defaultSettings.payment.currency}`);
    console.log(`   - Min order amount: $${defaultSettings.limits.minOrderAmount}`);
    console.log(`   - Max order amount: $${defaultSettings.limits.maxOrderAmount}`);
    
    // Test fee calculation
    console.log('\n🧮 Testing fee calculations:');
    const testAmounts = [10, 50, 100, 500];
    
    for (const amount of testAmounts) {
      const feeCalculation = await platformSettingsService.calculatePlatformFee(amount, 'order');
      console.log(`   - Order $${amount}: Platform fee $${feeCalculation.platformFee.toFixed(2)} (${(feeCalculation.feeRate * 100).toFixed(1)}%), Artisan receives $${feeCalculation.artisanAmount.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error initializing platform settings:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the script
if (require.main === module) {
  initializePlatformSettings()
    .then(() => {
      console.log('🎉 Platform settings initialization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = initializePlatformSettings;
