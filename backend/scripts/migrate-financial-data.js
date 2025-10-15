require('dotenv').config();
const { MongoClient } = require('mongodb');

/**
 * Migration Script: Move Stripe Connect and Bank Info to Financial Object
 * 
 * This script moves the following fields from root level to financial object:
 * - stripeConnectAccountId → financial.stripeConnectAccountId
 * - stripeExternalAccountId → financial.stripeExternalAccountId
 * - stripeConnectStatus → financial.stripeConnectStatus
 * - stripeConnectSetupAt → financial.stripeConnectSetupAt
 * - bankInfo → financial.bankInfo
 */

async function migrateFinancialData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const artisansCollection = db.collection('artisans');
    
    // Find artisans with data at root level
    const artisans = await artisansCollection.find({
      $or: [
        { stripeConnectAccountId: { $exists: true } },
        { bankInfo: { $exists: true } }
      ]
    }).toArray();
    
    console.log(`\n📊 Found ${artisans.length} artisans to migrate\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const artisan of artisans) {
      try {
        console.log(`🔄 Migrating artisan: ${artisan.artisanName}`);
        
        const updateData = {};
        const unsetData = {};
        
        // Initialize financial object if it doesn't exist
        if (!artisan.financial) {
          updateData.financial = {
            stripeAccountId: null,
            payoutSettings: {},
            commissionRate: artisan.commissionRate || 0.09,
            currency: artisan.currency || 'CAD'
          };
        } else {
          updateData.financial = { ...artisan.financial };
        }
        
        // Move Stripe Connect fields
        if (artisan.stripeConnectAccountId) {
          updateData.financial.stripeConnectAccountId = artisan.stripeConnectAccountId;
          unsetData.stripeConnectAccountId = '';
          console.log('  ✓ Moving stripeConnectAccountId');
        }
        
        if (artisan.stripeExternalAccountId) {
          updateData.financial.stripeExternalAccountId = artisan.stripeExternalAccountId;
          unsetData.stripeExternalAccountId = '';
          console.log('  ✓ Moving stripeExternalAccountId');
        }
        
        if (artisan.stripeConnectStatus) {
          updateData.financial.stripeConnectStatus = artisan.stripeConnectStatus;
          unsetData.stripeConnectStatus = '';
          console.log('  ✓ Moving stripeConnectStatus');
        }
        
        if (artisan.stripeConnectSetupAt) {
          updateData.financial.stripeConnectSetupAt = artisan.stripeConnectSetupAt;
          unsetData.stripeConnectSetupAt = '';
          console.log('  ✓ Moving stripeConnectSetupAt');
        }
        
        // Move bank info
        if (artisan.bankInfo) {
          updateData.financial.bankInfo = artisan.bankInfo;
          unsetData.bankInfo = '';
          console.log('  ✓ Moving bankInfo');
        }
        
        // Update the document
        const updateOperation = {
          $set: updateData
        };
        
        if (Object.keys(unsetData).length > 0) {
          updateOperation.$unset = unsetData;
        }
        
        await artisansCollection.updateOne(
          { _id: artisan._id },
          updateOperation
        );
        
        migratedCount++;
        console.log(`  ✅ Migrated ${artisan.artisanName}\n`);
        
      } catch (error) {
        console.error(`  ❌ Error migrating ${artisan.artisanName}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('='.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total: ${artisans.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run migration
migrateFinancialData()
  .then(() => {
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

