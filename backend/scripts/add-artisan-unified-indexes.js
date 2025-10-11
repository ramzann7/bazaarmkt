/**
 * Add Database Indexes for Unified Artisan Schema
 * Creates optimized indexes for the new unified artisan profile structure
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bazaarmkt';

async function addArtisanIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    console.log('\n📊 Creating indexes for unified artisan schema...\n');
    
    // 1. User reference index (most common lookup)
    console.log('Creating index: user (unique)');
    await artisansCollection.createIndex(
      { user: 1 },
      { unique: true, name: 'user_1' }
    );
    
    // 2. Search and filtering indexes
    console.log('Creating index: type + status.isActive');
    await artisansCollection.createIndex(
      { type: 1, 'status.isActive': 1 },
      { name: 'type_active_1' }
    );
    
    console.log('Creating index: category + status.isActive');
    await artisansCollection.createIndex(
      { category: 1, 'status.isActive': 1 },
      { name: 'category_active_1' }
    );
    
    // 3. Location-based queries (geo index)
    console.log('Creating geospatial index: location (2dsphere)');
    await artisansCollection.createIndex(
      { location: '2dsphere' },
      { name: 'location_2dsphere', sparse: true }
    );
    
    // 4. City/province filtering
    console.log('Creating index: address.city + address.province');
    await artisansCollection.createIndex(
      { 'address.city': 1, 'address.province': 1 },
      { name: 'address_city_province_1' }
    );
    
    // 5. Status and verification
    console.log('Creating index: status.isActive + status.isVerified');
    await artisansCollection.createIndex(
      { 'status.isActive': 1, 'status.isVerified': 1 },
      { name: 'status_active_verified_1' }
    );
    
    // 6. Rating and metrics (for sorting/filtering)
    console.log('Creating index: metrics.rating + status.isActive');
    await artisansCollection.createIndex(
      { 'metrics.rating': -1, 'status.isActive': 1 },
      { name: 'metrics_rating_active_-1_1' }
    );
    
    // 7. Premium artisans
    console.log('Creating index: status.isPremium + status.isActive');
    await artisansCollection.createIndex(
      { 'status.isPremium': 1, 'status.isActive': 1 },
      { name: 'status_premium_active_1' }
    );
    
    // 8. Spotlight feature
    console.log('Creating index: features.spotlightEnabled + status.isActive');
    await artisansCollection.createIndex(
      { 'features.spotlightEnabled': 1, 'status.isActive': 1 },
      { name: 'features_spotlight_active_1' }
    );
    
    // 9. Financial data (for stripe integration)
    console.log('Creating index: financial.stripeAccountId');
    await artisansCollection.createIndex(
      { 'financial.stripeAccountId': 1 },
      { name: 'financial_stripe_1', sparse: true }
    );
    
    // 10. Created/Updated timestamps
    console.log('Creating index: createdAt');
    await artisansCollection.createIndex(
      { createdAt: -1 },
      { name: 'createdAt_-1' }
    );
    
    console.log('Creating index: updatedAt');
    await artisansCollection.createIndex(
      { updatedAt: -1 },
      { name: 'updatedAt_-1' }
    );
    
    // 11. Text search index for name and description
    console.log('Creating text index: artisanName, businessName, displayName, description');
    await artisansCollection.createIndex(
      {
        artisanName: 'text',
        businessName: 'text',
        displayName: 'text',
        description: 'text'
      },
      {
        name: 'artisan_text_search',
        weights: {
          displayName: 10,
          businessName: 8,
          artisanName: 8,
          description: 5
        }
      }
    );
    
    console.log('\n✅ All indexes created successfully!');
    
    // List all indexes
    console.log('\n📋 Current indexes on artisans collection:');
    const indexes = await artisansCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  addArtisanIndexes()
    .then(() => {
      console.log('\n✨ Artisan indexes setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addArtisanIndexes };

