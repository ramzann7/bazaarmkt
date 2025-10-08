/**
 * Auto-capture payments after configured time period
 * Vercel Cron Job: Runs every hour to check for payments that need to be captured
 */

const { MongoClient } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Cron authentication middleware
const verifyCronAuth = (req) => {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('⚠️  CRON_SECRET not configured');
      return false;
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('🚫 Unauthorized cron job attempt');
      return false;
    }
  }
  
  return true;
};

// Database connection
const connectDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    return client.db();
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Record wallet transaction helper
const recordWalletTransaction = async (db, transactionData) => {
  try {
    const {
      artisanId,
      type,
      amount,
      description,
      reference = null,
      orderId = null,
      status = 'completed',
      balanceAfter = null
    } = transactionData;

    const transaction = {
      walletId: artisanId,
      artisanId: new (require('mongodb')).ObjectId(artisanId),
      type,
      amount,
      description,
      reference,
      orderId: orderId ? new (require('mongodb')).ObjectId(orderId) : null,
      status,
      balanceAfter,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('wallettransactions').insertOne(transaction);
    console.log(`💰 Wallet transaction recorded: ${type} - ${amount} - ${description}`);
  } catch (error) {
    console.error('Error recording wallet transaction:', error);
  }
};

// Calculate platform fee using platform settings
const calculatePlatformFee = async (db, amount, feeType = 'order') => {
  try {
    const PlatformSettingsService = require('../../services/platformSettingsService');
    const platformSettingsService = new PlatformSettingsService(db);
    return await platformSettingsService.calculatePlatformFee(amount, feeType);
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    // Fallback to simple 10% calculation
    const platformFee = amount * 0.10;
    return {
      totalAmount: amount,
      platformFee: Math.round(platformFee * 100) / 100,
      artisanAmount: Math.round((amount - platformFee) * 100) / 100,
      feeRate: 0.10,
      feeType: 'percentage'
    };
  }
};

// Main auto-capture function
const autoCapturePayments = async () => {
  try {
    console.log('🔄 Starting auto-capture payments cron job...');
    
    const db = await connectDB();
    const PlatformSettingsService = require('../../services/platformSettingsService');
    const platformSettingsService = new PlatformSettingsService(db);
    
    // Get auto-capture timing from platform settings
    const paymentSettings = await platformSettingsService.getPaymentSettings();
    const autoCaptureHours = paymentSettings.autoCaptureHours || 48;
    const autoCaptureTime = new Date(Date.now() - autoCaptureHours * 60 * 60 * 1000);
    
    console.log(`⏰ Looking for orders completed before: ${autoCaptureTime.toISOString()}`);
    
    // Find orders that are completed but payment not captured
    const ordersCollection = db.collection('orders');
    const ordersToCapture = await ordersCollection.find({
      status: { $in: ['delivered', 'picked_up', 'completed'] },
      paymentStatus: 'authorized',
      updatedAt: { $lte: autoCaptureTime }
    }).toArray();
    
    console.log(`📋 Found ${ordersToCapture.length} orders to auto-capture`);
    
    let capturedCount = 0;
    let errors = [];
    
    for (const order of ordersToCapture) {
      try {
        console.log(`💳 Processing order ${order._id}...`);
        
        // Calculate platform fee using platform settings
        const feeCalculation = await calculatePlatformFee(db, order.totalAmount, 'order');
        const { platformFee, artisanAmount } = feeCalculation;
        
        // Capture the payment
        const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          // Find the artisan
          const artisansCollection = db.collection('artisans');
          const artisan = await artisansCollection.findOne({
            _id: new (require('mongodb')).ObjectId(order.artisan)
          });
          
          if (artisan && artisan.stripeConnectAccountId) {
            // Create transfer to artisan
            const transfer = await stripe.transfers.create({
              amount: Math.round(artisanAmount * 100),
              currency: 'cad',
              destination: artisan.stripeConnectAccountId,
              metadata: {
                orderId: order._id.toString(),
                platformFee: platformFee.toString(),
                artisanAmount: artisanAmount.toString(),
                autoCapture: 'true'
              }
            });
            
            // Update order
            await ordersCollection.updateOne(
              { _id: order._id },
              { 
                $set: { 
                  paymentStatus: 'captured',
                  paymentCapturedAt: new Date(),
                  platformFee: platformFee,
                  artisanAmount: artisanAmount,
                  stripeTransferId: transfer.id,
                  autoCaptured: true,
                  updatedAt: new Date()
                }
              }
            );
            
            // Update wallet balance
            const walletsCollection = db.collection('wallets');
            await walletsCollection.updateOne(
              { artisanId: order.artisan },
              {
                $inc: { balance: artisanAmount },
                $set: { updatedAt: new Date() }
              },
              { upsert: true }
            );
            
            // Record wallet transaction
            await recordWalletTransaction(db, {
              artisanId: order.artisan,
              type: 'order_revenue',
              amount: artisanAmount,
              description: `Auto-captured revenue from order #${order._id} (after ${(feeCalculation.feeRate * 100).toFixed(1)}% platform fee)`,
              status: 'completed',
              orderId: order._id,
              stripeTransferId: transfer.id,
              platformFee: platformFee,
              platformFeeRate: feeCalculation.feeRate,
              totalOrderAmount: order.totalAmount,
              autoCaptured: true
            });
            
            capturedCount++;
            console.log(`✅ Successfully captured payment for order ${order._id}`);
          } else {
            console.log(`⚠️ Artisan or Stripe Connect account not found for order ${order._id}`);
            errors.push({ orderId: order._id, error: 'Artisan Stripe Connect account not found' });
          }
        } else {
          console.log(`❌ Payment capture failed for order ${order._id}: ${paymentIntent.status}`);
          errors.push({ orderId: order._id, error: `Payment capture failed: ${paymentIntent.status}` });
        }
      } catch (error) {
        console.error(`❌ Error auto-capturing payment for order ${order._id}:`, error);
        errors.push({ orderId: order._id, error: error.message });
      }
    }
    
    console.log(`🎉 Auto-capture completed. ${capturedCount} payments captured, ${errors.length} errors`);
    
    return {
      success: true,
      message: `Auto-capture completed. ${capturedCount} payments captured.`,
      data: {
        capturedCount,
        errors: errors.length > 0 ? errors : null,
        processedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('❌ Auto-capture cron job error:', error);
    return {
      success: false,
      message: 'Auto-capture cron job failed',
      error: error.message
    };
  }
};

// Vercel serverless function handler
module.exports = async (req, res) => {
  try {
    // Verify cron authentication
    if (!verifyCronAuth(req)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const result = await autoCapturePayments();
    
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('❌ Cron job handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Cron job handler failed',
      error: error.message
    });
  }
};
