/**
 * Populate Order User Information Script
 * Adds patron and artisan information to existing orders
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

async function populateOrderUserInfo() {
  let client;
  
  try {
    console.log('🚀 Starting order user information population...');
    
    // Connect to database
    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    const db = client.db();
    
    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    // Get all orders that don't have patron information populated
    const orders = await ordersCollection.find({
      $or: [
        { patron: { $exists: false } },
        { patron: null }
      ]
    }).toArray();
    
    console.log(`📋 Found ${orders.length} orders to update`);
    
    let updatedCount = 0;
    let errors = [];
    
    for (const order of orders) {
      try {
        console.log(`🔄 Processing order ${order._id}...`);
        
        const updateFields = {};
        
        // Populate patron information if order has userId (not a guest order)
        if (order.userId && !order.isGuestOrder) {
          const patron = await usersCollection.findOne({ _id: order.userId });
          if (patron) {
            updateFields.patron = {
              _id: patron._id,
              firstName: patron.firstName,
              lastName: patron.lastName,
              email: patron.email,
              phone: patron.phone
            };
            console.log(`✅ Found patron: ${patron.firstName} ${patron.lastName} (${patron.email})`);
          } else {
            console.log(`⚠️ Patron not found for userId: ${order.userId}`);
          }
        }
        
        // Populate artisan information if order has artisan field
        if (order.artisan) {
          const artisan = await artisansCollection.findOne({ _id: order.artisan });
          if (artisan) {
            updateFields.artisan = artisan;
            console.log(`✅ Found artisan: ${artisan.artisanName || artisan.firstName} ${artisan.lastName}`);
          } else {
            console.log(`⚠️ Artisan not found for artisanId: ${order.artisan}`);
          }
        }
        
        // Update the order if we have any fields to update
        if (Object.keys(updateFields).length > 0) {
          await ordersCollection.updateOne(
            { _id: order._id },
            { $set: updateFields }
          );
          updatedCount++;
          console.log(`✅ Updated order ${order._id}`);
        } else {
          console.log(`⏭️ No updates needed for order ${order._id}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing order ${order._id}:`, error);
        errors.push({ orderId: order._id, error: error.message });
      }
    }
    
    console.log(`🎉 Population completed!`);
    console.log(`✅ Updated ${updatedCount} orders`);
    console.log(`❌ ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the script
if (require.main === module) {
  populateOrderUserInfo()
    .then(() => {
      console.log('🎉 Order user information population completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = populateOrderUserInfo;
