const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './.env' });

async function cleanupPaymentMethods() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME || 'bazaarmkt');
    const usersCollection = db.collection('users');
    
    // Find all users with nested paymentMethods structure
    const users = await usersCollection.find({
      'paymentMethods.paymentMethods': { $exists: true }
    }).toArray();
    
    console.log(`Found ${users.length} users with nested paymentMethods structure`);
    
    let totalFixed = 0;
    
    for (const user of users) {
      console.log(`\nProcessing user: ${user.email || user._id}`);
      console.log(`Current paymentMethods structure:`, user.paymentMethods);
      
      if (user.paymentMethods && user.paymentMethods.paymentMethods && Array.isArray(user.paymentMethods.paymentMethods)) {
        // Extract the actual array from the nested structure
        const actualPaymentMethods = user.paymentMethods.paymentMethods;
        
        console.log(`  Extracting ${actualPaymentMethods.length} payment methods from nested structure`);
        
        // Update the user with the correct structure
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              paymentMethods: actualPaymentMethods,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`  ✅ Fixed payment methods structure for user ${user.email || user._id}`);
        totalFixed++;
      }
    }
    
    console.log(`\n🎉 Fixed payment methods structure for ${totalFixed} users`);
    
    // Also remove all payment methods if requested
    const removeAll = process.argv[2] === 'remove';
    if (removeAll) {
      console.log('\n🗑️  Removing all payment methods...');
      const result = await usersCollection.updateMany(
        { paymentMethods: { $exists: true } },
        { 
          $unset: { paymentMethods: "" },
          $set: { updatedAt: new Date() }
        }
      );
      console.log(`🎉 Removed payment methods from ${result.modifiedCount} users`);
    }
    
  } catch (error) {
    console.error('Error cleaning up payment methods:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

cleanupPaymentMethods();
