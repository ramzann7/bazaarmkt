const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Local MongoDB connection string
const LOCAL_URI = 'mongodb://localhost:27017/bazarmkt';

async function backupData() {
  let client;
  
  try {
    console.log('🔄 Starting local data backup...');
    
    // Connect to local MongoDB
    console.log('📡 Connecting to local MongoDB...');
    client = new MongoClient(LOCAL_URI);
    await client.connect();
    console.log('✅ Connected to local MongoDB');
    
    const db = client.db();
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections to backup`);
    
    // Create backup directory
    const backupDir = path.join(__dirname, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Backup each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n🔄 Backing up collection: ${collectionName}`);
      
      // Get all documents from collection
      const documents = await db.collection(collectionName).find({}).toArray();
      console.log(`📄 Found ${documents.length} documents in ${collectionName}`);
      
      if (documents.length > 0) {
        // Write to JSON file
        const backupFile = path.join(backupDir, `${collectionName}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));
        console.log(`✅ Backed up ${documents.length} documents to ${backupFile}`);
      } else {
        console.log(`ℹ️ No documents to backup for ${collectionName}`);
      }
    }
    
    console.log('\n🎉 Backup completed successfully!');
    console.log(`📁 Backup files saved in: ${backupDir}`);
    
    // Show backup summary
    console.log('\n📊 Backup Summary:');
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();
      const backupFile = path.join(backupDir, `${collectionName}.json`);
      const fileExists = fs.existsSync(backupFile);
      console.log(`  ${collectionName}: ${count} documents ${fileExists ? '✅' : '❌'}`);
    }
    
    console.log('\n🔧 Next steps:');
    console.log('1. Check the backup files in the "backup" directory');
    console.log('2. Use these files to manually import to MongoDB Atlas');
    console.log('3. Or use MongoDB Compass to import the data');
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed MongoDB connection');
    }
  }
}

// Run the backup
backupData().catch(console.error);
