/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for payment processing
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Webhook endpoint - must use raw body
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ 
      success: false, 
      message: 'Webhook secret not configured' 
    });
  }

  let event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body
      sig,
      webhookSecret
    );
    
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ 
      success: false, 
      message: `Webhook Error: ${err.message}` 
    });
  }

  // Handle the event
  try {
    const db = req.db;
    
    if (!db) {
      console.error('❌ Database connection not available for webhook');
      return res.status(500).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, db);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, db);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object, db);
        break;
      
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, db);
        break;
      
      case 'customer.created':
        await handleCustomerCreated(event.data.object, db);
        break;
      
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object, db);
        break;
      
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object, db);
        break;
      
      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object, db);
        break;
      
      case 'payout.paid':
        await handlePayoutPaid(event.data.object, db);
        break;
      
      case 'payout.failed':
        await handlePayoutFailed(event.data.object, db);
        break;
      
      case 'payout.canceled':
        await handlePayoutCanceled(event.data.object, db);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true, type: event.type });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing webhook' 
    });
  }
};

// Payment Intent Succeeded - Update order payment status
const handlePaymentIntentSucceeded = async (paymentIntent, db) => {
  console.log('✅ Payment succeeded:', paymentIntent.id);
  
  if (!db) {
    console.error('❌ Database not available in handlePaymentIntentSucceeded');
    return;
  }
  
  const ordersCollection = db.collection('orders');
  
  // Find order by payment intent ID
  const order = await ordersCollection.findOne({ 
    paymentIntentId: paymentIntent.id 
  });
  
  if (order) {
    await ordersCollection.updateOne(
      { _id: order._id },
      { 
        $set: { 
          paymentStatus: 'captured',
          'paymentDetails.capturedAt': new Date(),
          'paymentDetails.amountCaptured': paymentIntent.amount_received,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Order ${order._id} payment status updated to captured`);
    
    // Note: Order confirmation is handled separately by artisan
    // This just confirms payment was captured successfully
  } else {
    console.warn(`⚠️ No order found for payment intent: ${paymentIntent.id}`);
  }
};

// Payment Intent Failed - Mark order payment as failed
const handlePaymentIntentFailed = async (paymentIntent, db) => {
  console.log('❌ Payment failed:', paymentIntent.id);
  
  if (!db) {
    console.error('❌ Database not available in handlePaymentIntentFailed');
    return;
  }
  
  const ordersCollection = db.collection('orders');
  const order = await ordersCollection.findOne({ 
    paymentIntentId: paymentIntent.id 
  });
  
  if (order) {
    await ordersCollection.updateOne(
      { _id: order._id },
      { 
        $set: { 
          paymentStatus: 'failed',
          'paymentDetails.failureReason': paymentIntent.last_payment_error?.message || 'Payment failed',
          'paymentDetails.failedAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`❌ Order ${order._id} payment marked as failed`);
    
    // Restore inventory since payment failed
    await restoreInventoryForOrder(order, db);
  }
};

// Payment Intent Canceled - Restore inventory
const handlePaymentIntentCanceled = async (paymentIntent, db) => {
  console.log('🚫 Payment canceled:', paymentIntent.id);
  
  if (!db) {
    console.error('❌ Database not available in handlePaymentIntentCanceled');
    return;
  }
  
  const ordersCollection = db.collection('orders');
  const order = await ordersCollection.findOne({ 
    paymentIntentId: paymentIntent.id 
  });
  
  if (order) {
    await ordersCollection.updateOne(
      { _id: order._id },
      { 
        $set: { 
          paymentStatus: 'canceled',
          status: 'cancelled',
          'paymentDetails.canceledAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`🚫 Order ${order._id} canceled via webhook`);
    
    // Restore inventory
    await restoreInventoryForOrder(order, db);
  }
};

// Charge Refunded - Handle refunds
const handleChargeRefunded = async (charge, db) => {
  console.log('💰 Charge refunded:', charge.id);
  
  const ordersCollection = db.collection('orders');
  
  // Find order by payment intent
  const order = await ordersCollection.findOne({ 
    'paymentDetails.stripePaymentIntentId': charge.payment_intent 
  });
  
  if (order) {
    await ordersCollection.updateOne(
      { _id: order._id },
      { 
        $set: { 
          paymentStatus: 'refunded',
          'paymentDetails.refundedAt': new Date(),
          'paymentDetails.refundAmount': charge.amount_refunded,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`💰 Order ${order._id} marked as refunded`);
  }
};

// Customer Created - Link to user account
const handleCustomerCreated = async (customer, db) => {
  console.log('👤 Customer created:', customer.id);
  
  const usersCollection = db.collection('users');
  
  // Try to find user by email
  if (customer.email) {
    const user = await usersCollection.findOne({ 
      email: customer.email.toLowerCase() 
    });
    
    if (user && !user.stripeCustomerId) {
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            stripeCustomerId: customer.id,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Linked Stripe customer ${customer.id} to user ${user._id}`);
    }
  }
};

// Customer Updated - Sync customer data
const handleCustomerUpdated = async (customer, db) => {
  console.log('🔄 Customer updated:', customer.id);
  
  const usersCollection = db.collection('users');
  
  const user = await usersCollection.findOne({ 
    stripeCustomerId: customer.id 
  });
  
  if (user) {
    const updateFields = {
      updatedAt: new Date()
    };
    
    // Sync any relevant customer data
    if (customer.email && customer.email !== user.email) {
      updateFields.email = customer.email.toLowerCase();
    }
    
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: updateFields }
    );
    
    console.log(`✅ Synced Stripe customer data for user ${user._id}`);
  }
};

// Payment Method Attached - Sync to user account
const handlePaymentMethodAttached = async (paymentMethod, db) => {
  console.log('💳 Payment method attached:', paymentMethod.id);
  
  if (!paymentMethod.customer) {
    return; // No customer associated
  }
  
  const usersCollection = db.collection('users');
  
  const user = await usersCollection.findOne({ 
    stripeCustomerId: paymentMethod.customer 
  });
  
  if (user) {
    // Add payment method to user's payment methods array
    const newPaymentMethod = {
      stripePaymentMethodId: paymentMethod.id,
      brand: paymentMethod.card?.brand || 'unknown',
      last4: paymentMethod.card?.last4 || '0000',
      expiryMonth: paymentMethod.card?.exp_month || 12,
      expiryYear: paymentMethod.card?.exp_year || 2030,
      cardholderName: paymentMethod.billing_details?.name || 'Cardholder',
      isDefault: false,
      type: 'credit_card',
      createdAt: new Date()
    };
    
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $push: { paymentMethods: newPaymentMethod },
        $set: { updatedAt: new Date() }
      }
    );
    
    console.log(`✅ Payment method ${paymentMethod.id} added to user ${user._id}`);
  }
};

// Payment Method Detached - Remove from user account
const handlePaymentMethodDetached = async (paymentMethod, db) => {
  console.log('🗑️ Payment method detached:', paymentMethod.id);
  
  if (!paymentMethod.customer) {
    return; // No customer associated
  }
  
  const usersCollection = db.collection('users');
  
  const user = await usersCollection.findOne({ 
    stripeCustomerId: paymentMethod.customer 
  });
  
  if (user) {
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $pull: { paymentMethods: { stripePaymentMethodId: paymentMethod.id } },
        $set: { updatedAt: new Date() }
      }
    );
    
    console.log(`✅ Payment method ${paymentMethod.id} removed from user ${user._id}`);
  }
};

// Payout Paid - Update transaction status to completed
const handlePayoutPaid = async (payout, db) => {
  console.log('✅ Payout paid:', payout.id);
  
  if (!db) {
    console.error('❌ Database not available in handlePayoutPaid');
    return;
  }
  
  const transactionsCollection = db.collection('wallettransactions');
  
  // Find transaction by Stripe payout ID
  const transaction = await transactionsCollection.findOne({ 
    stripePayoutId: payout.id 
  });
  
  if (transaction) {
    await transactionsCollection.updateOne(
      { _id: transaction._id },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          payoutArrivalDate: new Date(payout.arrival_date * 1000),
          'metadata.payoutStatus': 'paid',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Transaction ${transaction._id} marked as completed (payout arrived in bank)`);
    
    // Send notification to artisan that payout has arrived
    if (transaction.userId) {
      const notificationsCollection = db.collection('notifications');
      await notificationsCollection.insertOne({
        userId: transaction.userId,
        type: 'payout_completed',
        title: 'Payout Completed',
        message: `Your payout of $${Math.abs(transaction.amount).toFixed(2)} has been deposited to your bank account.`,
        priority: 'medium',
        read: false,
        data: {
          amount: Math.abs(transaction.amount),
          payoutId: payout.id,
          arrivalDate: new Date(payout.arrival_date * 1000),
          transactionId: transaction._id.toString()
        },
        createdAt: new Date()
      });
      
      console.log(`✅ Notification sent to user about payout completion`);
    }
  } else {
    console.warn(`⚠️ No transaction found for payout: ${payout.id}`);
  }
};

// Payout Failed - Restore wallet balance and notify artisan
const handlePayoutFailed = async (payout, db) => {
  console.log('❌ Payout failed:', payout.id);
  
  if (!db) {
    console.error('❌ Database not available in handlePayoutFailed');
    return;
  }
  
  const transactionsCollection = db.collection('wallettransactions');
  const walletsCollection = db.collection('wallets');
  
  // Find the failed transaction
  const transaction = await transactionsCollection.findOne({ 
    stripePayoutId: payout.id 
  });
  
  if (transaction) {
    const payoutAmount = Math.abs(transaction.amount);
    
    // Update transaction status to failed
    await transactionsCollection.updateOne(
      { _id: transaction._id },
      { 
        $set: { 
          status: 'failed',
          failedAt: new Date(),
          failureReason: payout.failure_message || 'Payout failed',
          'metadata.payoutStatus': 'failed',
          'metadata.failureCode': payout.failure_code,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`❌ Transaction ${transaction._id} marked as failed`);
    
    // Restore wallet balance (add back the payout amount)
    await walletsCollection.updateOne(
      { artisanId: transaction.artisanId },
      { 
        $inc: { balance: payoutAmount }, // Add the amount back
        $set: { updatedAt: new Date() }
      }
    );
    
    console.log(`✅ Restored $${payoutAmount} to wallet after failed payout`);
    
    // Create a reversal transaction record
    await transactionsCollection.insertOne({
      userId: transaction.userId,
      artisanId: transaction.artisanId,
      type: 'payout_reversal',
      amount: payoutAmount,
      description: `Payout failed - balance restored: ${payout.failure_message}`,
      status: 'completed',
      reference: `REVERSAL-${transaction.reference}`,
      metadata: {
        originalPayoutId: payout.id,
        originalTransactionId: transaction._id.toString(),
        failureReason: payout.failure_message,
        failureCode: payout.failure_code
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Send notification to artisan about failed payout
    if (transaction.userId) {
      const notificationsCollection = db.collection('notifications');
      await notificationsCollection.insertOne({
        userId: transaction.userId,
        type: 'payout_failed',
        title: 'Payout Failed',
        message: `Your payout of $${payoutAmount.toFixed(2)} failed: ${payout.failure_message}. Your balance has been restored. Please check your bank information.`,
        priority: 'high',
        read: false,
        data: {
          amount: payoutAmount,
          payoutId: payout.id,
          failureReason: payout.failure_message,
          failureCode: payout.failure_code,
          transactionId: transaction._id.toString()
        },
        createdAt: new Date()
      });
      
      console.log(`✅ Notification sent to user about payout failure`);
    }
  } else {
    console.warn(`⚠️ No transaction found for failed payout: ${payout.id}`);
  }
};

// Payout Canceled - Restore wallet balance (similar to failed)
const handlePayoutCanceled = async (payout, db) => {
  console.log('🚫 Payout canceled:', payout.id);
  
  if (!db) {
    console.error('❌ Database not available in handlePayoutCanceled');
    return;
  }
  
  const transactionsCollection = db.collection('wallettransactions');
  const walletsCollection = db.collection('wallets');
  
  // Find the canceled transaction
  const transaction = await transactionsCollection.findOne({ 
    stripePayoutId: payout.id 
  });
  
  if (transaction) {
    const payoutAmount = Math.abs(transaction.amount);
    
    // Update transaction status to canceled
    await transactionsCollection.updateOne(
      { _id: transaction._id },
      { 
        $set: { 
          status: 'canceled',
          canceledAt: new Date(),
          'metadata.payoutStatus': 'canceled',
          updatedAt: new Date()
        }
      }
    );
    
    // Restore wallet balance
    await walletsCollection.updateOne(
      { artisanId: transaction.artisanId },
      { 
        $inc: { balance: payoutAmount },
        $set: { updatedAt: new Date() }
      }
    );
    
    console.log(`✅ Restored $${payoutAmount} to wallet after canceled payout`);
    
    // Send notification to artisan
    if (transaction.userId) {
      const notificationsCollection = db.collection('notifications');
      await notificationsCollection.insertOne({
        userId: transaction.userId,
        type: 'payout_canceled',
        title: 'Payout Canceled',
        message: `Your payout of $${payoutAmount.toFixed(2)} was canceled. Your balance has been restored.`,
        priority: 'medium',
        read: false,
        data: {
          amount: payoutAmount,
          payoutId: payout.id,
          transactionId: transaction._id.toString()
        },
        createdAt: new Date()
      });
    }
  } else {
    console.warn(`⚠️ No transaction found for canceled payout: ${payout.id}`);
  }
};

// Helper: Restore inventory for failed/canceled orders
const restoreInventoryForOrder = async (order, db) => {
  if (!db) {
    console.error('❌ Database not available for inventory restoration');
    return;
  }
  
  const productsCollection = db.collection('products');
  
  console.log(`🔄 Restoring inventory for order:`, order._id);
  
  for (const item of order.items) {
    try {
      const { ObjectId } = require('mongodb');
      const product = await productsCollection.findOne({ 
        _id: new ObjectId(item.productId) 
      });
      
      if (product) {
        const updateFields = {
          soldCount: Math.max(0, (product.soldCount || 0) - item.quantity),
          updatedAt: new Date()
        };
        
        // Restore the appropriate inventory field
        if (product.productType === 'ready_to_ship') {
          updateFields.stock = (product.stock || 0) + item.quantity;
          updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
        } else if (product.productType === 'made_to_order') {
          updateFields.remainingCapacity = (product.remainingCapacity || 0) + item.quantity;
        } else if (product.productType === 'scheduled_order') {
          updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
        } else {
          // Fallback for unknown types
          updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
        }
        
        // Update product status back to active if it has inventory after restoration
        const restoredStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                             product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                             product.productType === 'scheduled_order' ? updateFields.availableQuantity : 
                             updateFields.availableQuantity || 0;
        
        if (restoredStock > 0 && product.status === 'out_of_stock') {
          updateFields.status = 'active';
        }
        
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: updateFields }
        );
        
        console.log(`✅ Restored inventory for product ${product.name}: +${item.quantity}`);
      }
    } catch (error) {
      console.error(`❌ Error restoring inventory for item:`, error);
    }
  }
};

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;

