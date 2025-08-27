const mongoose = require('mongoose');

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/bazarmkt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Drop collections that might have old data
    const collections = ['users', 'producers', 'products', 'orders', 'foodmakers', 'foodrequests'];
    
    for (const collectionName of collections) {
      try {
        await mongoose.connection.db.dropCollection(collectionName);
        console.log(`✓ Dropped collection: ${collectionName}`);
      } catch (error) {
        if (error.code === 26) {
          console.log(`- Collection ${collectionName} doesn't exist (that's fine)`);
        } else {
          console.log(`- Error dropping ${collectionName}:`, error.message);
        }
      }
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('You can now try registering a new user.');
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearDatabase();
