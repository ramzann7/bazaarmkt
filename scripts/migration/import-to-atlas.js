const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB Atlas connection string - updated with new credentials
const ATLAS_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

// Database name for Atlas
const ATLAS_DB_NAME = 'bazarmkt';

// Backup directory
const BACKUP_DIR = path.join(__dirname, 'backup');

async function importData() {
  let client;
  
  try {
    console.log('🔄 Starting import to MongoDB Atlas...');
    
    // Check if backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      throw new Error('Backup directory not found. Please run backup-local-data.js first.');
    }
    
    // Connect to MongoDB Atlas
    console.log('☁️ Connecting to MongoDB Atlas...');
    console.log('🔗 Using connection string:', ATLAS_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const atlasDb = client.db(ATLAS_DB_NAME);
    
    // Test the connection
    console.log('🔍 Testing Atlas connection...');
    await atlasDb.command({ ping: 1 });
    console.log('✅ Atlas connection test successful');
    
    // Get all backup files
    const backupFiles = fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith('.json'));
    console.log(`📋 Found ${backupFiles.length} backup files to import`);
    
    // Import each backup file
    for (const backupFile of backupFiles) {
      const collectionName = backupFile.replace('.json', '');
      console.log(`\n🔄 Importing collection: ${collectionName}`);
      
      // Read the backup file
      const backupPath = path.join(BACKUP_DIR, backupFile);
      const fileContent = fs.readFileSync(backupPath, 'utf8');
      const documents = JSON.parse(fileContent);
      
      console.log(`📄 Found ${documents.length} documents in ${backupFile}`);
      
      if (documents.length > 0) {
        // Clear existing data in Atlas collection
        await atlasDb.collection(collectionName).deleteMany({});
        console.log(`🧹 Cleared existing data in Atlas ${collectionName}`);
        
        // Insert documents into Atlas collection
        const result = await atlasDb.collection(collectionName).insertMany(documents);
        console.log(`✅ Successfully imported ${result.insertedCount} documents to Atlas`);
        
        // Verify the import
        const atlasCount = await atlasDb.collection(collectionName).countDocuments();
        console.log(`🔍 Verification: ${atlasCount} documents now in Atlas ${collectionName}`);
      } else {
        console.log(`ℹ️ No documents to import for ${collectionName}`);
      }
    }
    
    console.log('\n🎉 Import completed successfully!');
    console.log('\n📊 Import Summary:');
    
    // Show final counts
    for (const backupFile of backupFiles) {
      const collectionName = backupFile.replace('.json', '');
      const backupPath = path.join(BACKUP_DIR, backupFile);
      const fileContent = fs.readFileSync(backupPath, 'utf8');
      const documents = JSON.parse(fileContent);
      const atlasCount = await atlasDb.collection(collectionName).countDocuments();
      console.log(`  ${collectionName}: ${documents.length} → ${atlasCount} documents`);
    }
    
    console.log('\n🔧 Next steps:');
    console.log('1. Update your .env file with the Atlas connection string');
    console.log('2. Test your application with the new Atlas database');
    console.log('3. Keep your local database as backup');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 8000) {
      console.log('\n🔧 Troubleshooting Atlas connection:');
      console.log('1. Check if the username and password are correct');
      console.log('2. Ensure the IP address is whitelisted in Atlas');
      console.log('3. Verify the cluster name and connection string format');
      console.log('4. Make sure the database user has proper permissions');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed Atlas MongoDB connection');
    }
  }
}

// Run the import
importData().catch(console.error);
