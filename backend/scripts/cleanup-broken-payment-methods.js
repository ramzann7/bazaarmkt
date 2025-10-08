#!/usr/bin/env node

/**
 * Script to clean up broken payment methods that aren't attached to Stripe Customers
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Finds all users with payment methods
 * 3. Checks each payment method in Stripe
 * 4. Removes payment methods that aren't attached to the user's Stripe customer
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function cleanupBrokenPaymentMethods() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db();
    const usersCollection = db.collection('users');
    
    console.log('✅ Connected to MongoDB');
    console.log('🔍 Finding users with payment methods...');
    
    // Find all users that have payment methods
    const usersWithPaymentMethods = await usersCollection.find({
      paymentMethods: { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`📊 Found ${usersWithPaymentMethods.length} users with payment methods`);
    
    let totalCleaned = 0;
    let totalChecked = 0;
    
    for (const user of usersWithPaymentMethods) {
      console.log(`\n👤 Checking user: ${user.email || user._id}`);
      console.log(`   Stripe Customer ID: ${user.stripeCustomerId || 'NONE'}`);
      console.log(`   Payment Methods: ${user.paymentMethods?.length || 0}`);
      
      if (!user.paymentMethods || !Array.isArray(user.paymentMethods)) {
        console.log('   ⚠️ No valid payment methods array');
        continue;
      }
      
      const brokenPaymentMethods = [];
      const validPaymentMethods = [];
      
      for (const pm of user.paymentMethods) {
        totalChecked++;
        
        if (!pm.stripePaymentMethodId) {
          console.log(`   ⚠️ Payment method has no stripePaymentMethodId:`, pm);
          brokenPaymentMethods.push(pm);
          continue;
        }
        
        try {
          // Check the payment method in Stripe
          const stripePM = await stripe.paymentMethods.retrieve(pm.stripePaymentMethodId);
          
          console.log(`   🔍 Checking ${pm.stripePaymentMethodId}:`);
          console.log(`      Stripe Customer: ${stripePM.customer || 'NONE'}`);
          console.log(`      User Customer: ${user.stripeCustomerId || 'NONE'}`);
          
          // Check if payment method is attached to the correct customer
          if (!stripePM.customer) {
            console.log(`      ❌ BROKEN: Not attached to any customer`);
            brokenPaymentMethods.push(pm);
          } else if (user.stripeCustomerId && stripePM.customer !== user.stripeCustomerId) {
            console.log(`      ❌ BROKEN: Attached to wrong customer`);
            brokenPaymentMethods.push(pm);
          } else {
            console.log(`      ✅ VALID: Properly attached`);
            validPaymentMethods.push(pm);
          }
        } catch (stripeError) {
          if (stripeError.code === 'resource_missing') {
            console.log(`      ❌ BROKEN: PaymentMethod doesn't exist in Stripe`);
            brokenPaymentMethods.push(pm);
          } else {
            console.log(`      ⚠️ Error checking PaymentMethod:`, stripeError.message);
            // Keep it for now if we can't check it
            validPaymentMethods.push(pm);
          }
        }
      }
      
      // Update user if we found broken payment methods
      if (brokenPaymentMethods.length > 0) {
        console.log(`\n   🧹 Cleaning up ${brokenPaymentMethods.length} broken payment methods...`);
        
        const result = await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              paymentMethods: validPaymentMethods,
              updatedAt: new Date()
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`   ✅ Cleaned up payment methods for ${user.email || user._id}`);
          totalCleaned += brokenPaymentMethods.length;
          
          console.log(`   📋 Removed:`);
          brokenPaymentMethods.forEach(pm => {
            console.log(`      - ${pm.stripePaymentMethodId} (${pm.brand} ****${pm.last4})`);
          });
        }
      } else {
        console.log(`   ✅ All payment methods are valid`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total payment methods checked: ${totalChecked}`);
    console.log(`   Broken payment methods removed: ${totalCleaned}`);
    console.log(`   Users processed: ${usersWithPaymentMethods.length}`);
    console.log(`\n✅ Cleanup complete!`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the cleanup
cleanupBrokenPaymentMethods()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

