const { MongoClient } = require('mongodb');

// MongoDB Atlas connection string with admin credentials
// You'll need to replace this with your actual admin credentials
const ATLAS_ADMIN_URI = 'mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/admin?retryWrites=true&w=majority';

async function setupAtlasUser() {
  let client;
  
  try {
    console.log('🔧 Setting up MongoDB Atlas database user...');
    console.log('⚠️  This script assumes you have admin access to your Atlas cluster');
    
    // Try to connect with the provided credentials
    console.log('🔗 Testing connection with provided credentials...');
    client = new MongoClient(ATLAS_ADMIN_URI);
    await client.connect();
    console.log('✅ Successfully connected to Atlas!');
    
    const adminDb = client.db('admin');
    
    // Test basic operations
    console.log('🔍 Testing database operations...');
    await adminDb.command({ ping: 1 });
    console.log('✅ Database ping successful');
    
    // List databases
    const databases = await adminDb.admin().listDatabases();
    console.log('📋 Available databases:', databases.databases.map(db => db.name));
    
    // Check if bazarmkt database exists
    const bazarmktExists = databases.databases.some(db => db.name === 'bazarmkt');
    if (bazarmktExists) {
      console.log('✅ bazarmkt database exists');
    } else {
      console.log('ℹ️ bazarmkt database does not exist (will be created automatically)');
    }
    
    console.log('\n🎉 Atlas connection test completed successfully!');
    console.log('✅ Your credentials are working correctly');
    console.log('✅ You can now proceed with the data migration');
    
  } catch (error) {
    console.error('❌ Atlas connection test failed:', error.message);
    
    if (error.code === 8000) {
      console.log('\n🔧 Authentication failed. Here\'s what you need to do:');
      console.log('\n1. Go to MongoDB Atlas Dashboard:');
      console.log('   https://cloud.mongodb.com');
      console.log('\n2. Navigate to your Cluster0');
      console.log('\n3. Click "Database Access" in the left sidebar');
      console.log('\n4. Click "Add New Database User"');
      console.log('\n5. Set up the user with these credentials:');
      console.log('   - Username: Cluster25123');
      console.log('   - Password: zNlr0wjo045T5BbV');
      console.log('   - Database User Privileges: "Read and write to any database"');
      console.log('\n6. Click "Add User"');
      console.log('\n7. Wait a few minutes for the user to be created');
      console.log('\n8. Run this script again to test the connection');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 Network error. Please check:');
      console.log('1. Internet connection is working');
      console.log('2. Atlas cluster is accessible');
      console.log('3. Connection string format is correct');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Closed Atlas connection');
    }
  }
}

// Run the setup
setupAtlasUser().catch(console.error);
