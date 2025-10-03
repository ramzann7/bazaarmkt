const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string - corrected format
const ATLAS_URI = 'mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

// Local MongoDB connection string
const LOCAL_URI = 'mongodb://localhost:27017/bazarmkt';

// Database name for Atlas
const ATLAS_DB_NAME = 'bazarmkt';

async function migrateData() {
  let localClient, atlasClient;
  
  try {
    console.log('🔄 Starting migration to MongoDB Atlas...');
    
    // Connect to local MongoDB
    console.log('📡 Connecting to local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    console.log('✅ Connected to local MongoDB');
    
    // Connect to MongoDB Atlas
    console.log('☁️ Connecting to MongoDB Atlas...');
    console.log('🔗 Using connection string:', ATLAS_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    atlasClient = new MongoClient(ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await atlasClient.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const localDb = localClient.db();
    const atlasDb = atlasClient.db(ATLAS_DB_NAME);
    
    // Test the connection by listing databases
    console.log('🔍 Testing Atlas connection...');
    const adminDb = atlasClient.db('admin');
    await adminDb.command({ ping: 1 });
    console.log('✅ Atlas connection test successful');
    
    // Get all collection names from local database
    const collections = await localDb.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections to migrate`);
    
    // Migrate each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n🔄 Migrating collection: ${collectionName}`);
      
      // Get all documents from local collection
      const documents = await localDb.collection(collectionName).find({}).toArray();
      console.log(`📄 Found ${documents.length} documents in ${collectionName}`);
      
      if (documents.length > 0) {
        // Clear existing data in Atlas collection (optional - remove if you want to keep existing data)
        await atlasDb.collection(collectionName).deleteMany({});
        console.log(`🧹 Cleared existing data in Atlas ${collectionName}`);
        
        // Insert documents into Atlas collection
        const result = await atlasDb.collection(collectionName).insertMany(documents);
        console.log(`✅ Successfully migrated ${result.insertedCount} documents to Atlas`);
        
        // Verify the migration
        const atlasCount = await atlasDb.collection(collectionName).countDocuments();
        console.log(`🔍 Verification: ${atlasCount} documents now in Atlas ${collectionName}`);
      } else {
        console.log(`ℹ️ No documents to migrate for ${collectionName}`);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    
    // Show final counts
    for (const collection of collections) {
      const collectionName = collection.name;
      const localCount = await localDb.collection(collectionName).countDocuments();
      const atlasCount = await atlasDb.collection(collectionName).countDocuments();
      console.log(`  ${collectionName}: ${localCount} → ${atlasCount} documents`);
    }
    
    console.log('\n🔧 Next steps:');
    console.log('1. Update your .env file with the Atlas connection string');
    console.log('2. Test your application with the new Atlas database');
    console.log('3. Keep your local database as backup');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 8000) {
      console.log('\n🔧 Troubleshooting Atlas connection:');
      console.log('1. Check if the username and password are correct');
      console.log('2. Ensure the IP address is whitelisted in Atlas');
      console.log('3. Verify the cluster name and connection string format');
    }
  } finally {
    // Close connections
    if (localClient) {
      await localClient.close();
      console.log('🔌 Closed local MongoDB connection');
    }
    if (atlasClient) {
      await atlasClient.close();
      console.log('🔌 Closed Atlas MongoDB connection');
    }
  }
}

// Run the migration
migrateData().catch(console.error);
