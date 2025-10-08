const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function migrateToComprehensiveStatuses() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('bazarmkt');
  const ordersCollection = db.collection('orders');

  console.log('🔄 Starting comprehensive order status migration...');

  // Define the comprehensive status mapping
  const statusMap = {
    // Legacy statuses that need to be updated
    'ready': null, // Will be determined by delivery method
    'delivering': 'out_for_delivery',
    'shipped': 'out_for_delivery',
    'processing': 'preparing',
    
    // Statuses that are already correct (no change needed)
    'pending': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready_for_pickup': 'ready_for_pickup',
    'ready_for_delivery': 'ready_for_delivery',
    'picked_up': 'picked_up',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'declined': 'declined'
  };

  let updatedCount = 0;
  const ordersToUpdate = await ordersCollection.find({
    status: { $in: Object.keys(statusMap) }
  }).toArray();

  console.log(`📋 Found ${ordersToUpdate.length} orders to potentially update`);

  for (const order of ordersToUpdate) {
    const oldStatus = order.status;
    let newStatus = statusMap[oldStatus];
    
    // Special handling for 'ready' status - determine based on delivery method
    if (oldStatus === 'ready') {
      newStatus = order.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery';
    }
    
    // Only update if the status actually needs to change
    if (newStatus && newStatus !== oldStatus) {
      await ordersCollection.updateOne(
        { _id: order._id },
        { 
          $set: { 
            status: newStatus, 
            updatedAt: new Date(),
            // Add migration metadata
            statusMigration: {
              oldStatus: oldStatus,
              newStatus: newStatus,
              migratedAt: new Date(),
              reason: oldStatus === 'ready' ? `Determined by delivery method: ${order.deliveryMethod}` : 'Standardized status mapping'
            }
          } 
        }
      );
      console.log(`✅ Updated order ${order._id.toString().slice(-8).toUpperCase()}: ${oldStatus} → ${newStatus} (${order.deliveryMethod})`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Migration completed! Updated ${updatedCount} orders`);

  // Verify final status distribution
  const statusCounts = await ordersCollection.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('\n📊 Final status distribution:');
  statusCounts.forEach(s => console.log(`  ${s._id}: ${s.count} orders`));

  // Show migration summary
  const migrationSummary = await ordersCollection.aggregate([
    { $match: { 'statusMigration.migratedAt': { $exists: true } } },
    { $group: { 
      _id: '$statusMigration.oldStatus', 
      count: { $sum: 1 },
      newStatuses: { $addToSet: '$status' }
    }},
    { $sort: { count: -1 } }
  ]).toArray();

  if (migrationSummary.length > 0) {
    console.log('\n🔄 Migration Summary:');
    migrationSummary.forEach(m => {
      console.log(`  ${m._id} → ${m.newStatuses.join(', ')} (${m.count} orders)`);
    });
  }

  await client.close();
}

migrateToComprehensiveStatuses().catch(console.error);
