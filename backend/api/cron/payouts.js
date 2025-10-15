/**
 * Vercel Cron Job for processing scheduled payouts
 * This endpoint is called by Vercel Cron Jobs every Friday at 9 AM EST
 */

const { MongoClient, ObjectId } = require('mongodb');

// Cron authentication middleware
const verifyCronAuth = (req) => {
  // In production, verify the authorization header
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('⚠️  CRON_SECRET not configured');
      return false;
    }
    
    // Vercel Cron sends authorization header
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('🚫 Unauthorized cron job attempt');
      return false;
    }
  }
  
  return true;
};

// Database connection
let db;
const connectDB = async () => {
  if (db) return db;
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME);
  return db;
};

// Payout processing function
const processScheduledPayouts = async () => {
  try {
    console.log('🔄 Processing scheduled payouts...');
    
    const database = await connectDB();
    const walletsCollection = database.collection('wallets');
    const transactionsCollection = database.collection('wallettransactions');
    const artisansCollection = database.collection('artisans');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get platform settings for minimum payout amount
    const platformSettingsCollection = database.collection('platformsettings');
    const platformSettings = await platformSettingsCollection.findOne({});
    const minimumPayoutAmount = platformSettings?.payoutSettings?.minimumPayoutAmount || 25;
    
    // Find wallets with payouts due today
    const walletsDueForPayout = await walletsCollection.find({
      'payoutSettings.enabled': true,
      'payoutSettings.nextPayoutDate': {
        $lte: today
      },
      balance: {
        $gte: minimumPayoutAmount // Use platform settings minimum payout amount
      }
    }).toArray();
    
    console.log(`📊 Found ${walletsDueForPayout.length} wallets due for payout`);
    
    let processedCount = 0;
    let errorCount = 0;
    const results = [];
    
    // Import Stripe service for payouts
    const StripeService = require('../../services/stripeService');
    const stripeService = new StripeService();
    
    for (const wallet of walletsDueForPayout) {
      try {
        // Get artisan information
        const artisan = await artisansCollection.findOne({ _id: wallet.artisanId });
        if (!artisan) {
          console.error(`❌ Artisan not found for wallet ${wallet._id}`);
          errorCount++;
          continue;
        }
        
        // Check if payout amount meets minimum (use wallet settings or platform settings)
        const payoutAmount = wallet.balance;
        const minimumPayout = wallet.payoutSettings.minimumPayout || minimumPayoutAmount;
        
        if (payoutAmount < minimumPayout) {
          console.log(`⏭️ Skipping wallet ${wallet._id} - balance ${payoutAmount} below minimum ${minimumPayout}`);
          continue;
        }
        
        // Verify Stripe Connect account exists
        if (!artisan.financial?.stripeConnectAccountId) {
          console.log(`⚠️ Artisan ${artisan.artisanName} has no Stripe Connect account - skipping payout`);
          errorCount++;
          results.push({
            artisanId: artisan._id,
            artisanName: artisan.artisanName,
            amount: payoutAmount,
            status: 'error',
            error: 'No Stripe Connect account. Please set up bank information.'
          });
          continue;
        }
        
        console.log(`💰 Processing payout for artisan ${artisan.artisanName}: $${payoutAmount}`);
        
        try {
          // Verify Stripe Connect account status
          const accountStatus = await stripeService.getAccountStatus(artisan.financial.stripeConnectAccountId);
          
          if (!accountStatus.payouts_enabled) {
            console.log(`⚠️ Payouts not enabled for ${artisan.artisanName} - account may need verification`);
            errorCount++;
            results.push({
              artisanId: artisan._id,
              artisanName: artisan.artisanName,
              amount: payoutAmount,
              status: 'error',
              error: 'Stripe account requires verification before payouts can be enabled.'
            });
            continue;
          }
          
          // Create actual Stripe payout to artisan's bank account
          const payout = await stripeService.createPayout(
            artisan.financial.stripeConnectAccountId,
            payoutAmount,
            'cad',
            {
              artisanId: artisan._id.toString(),
              artisanName: artisan.artisanName,
              payoutDate: now.toISOString(),
              walletId: wallet._id.toString(),
              schedule: wallet.payoutSettings.schedule
            }
          );
          
          console.log(`✅ Stripe payout created: ${payout.id} for ${artisan.artisanName} - $${payoutAmount}`);
          
          // Create payout transaction record with Stripe payout ID
          const payoutTransaction = {
            artisanId: wallet.artisanId,
            userId: wallet.userId, // Add user ID for easier lookup
            type: 'payout',
            amount: -payoutAmount, // Negative for outgoing
            description: `Weekly payout to bank account`,
            status: 'pending', // Pending until Stripe confirms (webhook will update to completed)
            reference: `PAYOUT-${Date.now()}`,
            stripePayoutId: payout.id, // Store Stripe payout ID
            balanceAfter: 0, // Balance after payout
            metadata: {
              payoutDate: now,
              schedule: wallet.payoutSettings.schedule,
              originalBalance: payoutAmount,
              stripeAccount: artisan.financial.stripeConnectAccountId,
              expectedArrival: new Date(payout.arrival_date * 1000), // Convert Unix timestamp
              payoutMethod: payout.method
            },
            createdAt: now,
            updatedAt: now
          };
          
          await transactionsCollection.insertOne(payoutTransaction);
          
          // Calculate next payout date
          let nextPayoutDate;
          if (wallet.payoutSettings.schedule === 'weekly') {
            nextPayoutDate = new Date(now);
            nextPayoutDate.setDate(now.getDate() + 7);
          } else if (wallet.payoutSettings.schedule === 'monthly') {
            nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          }
          
          // Update wallet balance and payout settings
          await walletsCollection.updateOne(
            { _id: wallet._id },
            {
              $set: {
                balance: 0,
                'payoutSettings.lastPayoutDate': now,
                'payoutSettings.nextPayoutDate': nextPayoutDate,
                'metadata.totalPayouts': (wallet.metadata?.totalPayouts || 0) + payoutAmount,
                'metadata.lastPayoutId': payout.id,
                updatedAt: now
              }
            }
          );
          
          processedCount++;
          results.push({
            artisanId: artisan._id,
            artisanName: artisan.artisanName,
            amount: payoutAmount,
            stripePayoutId: payout.id,
            expectedArrival: new Date(payout.arrival_date * 1000),
            status: 'success'
          });
          
          console.log(`✅ Payout processed for artisan ${artisan.artisanName}: $${payoutAmount} (arrives in 2-3 business days)`);
          
        } catch (stripeError) {
          console.error(`❌ Stripe payout failed for ${artisan.artisanName}:`, stripeError.message);
          errorCount++;
          results.push({
            artisanId: artisan._id,
            artisanName: artisan.artisanName,
            amount: payoutAmount,
            status: 'error',
            error: stripeError.message
          });
          
          // Don't zero out wallet balance if payout failed
          // Artisan can still receive payout next cycle
        }
        
      } catch (error) {
        console.error(`❌ Error processing payout for wallet ${wallet._id}:`, error);
        errorCount++;
        results.push({
          walletId: wallet._id,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    console.log(`🎉 Payout processing complete: ${processedCount} processed, ${errorCount} errors`);
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: walletsDueForPayout.length,
      results
    };
    
  } catch (error) {
    console.error('❌ Error in processScheduledPayouts:', error);
    throw error;
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
    
    console.log('⏰ Vercel Cron Job triggered - Processing payouts');
    
    const result = await processScheduledPayouts();
    
    res.status(200).json({
      success: true,
      message: 'Payout processing completed',
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    res.status(500).json({
      success: false,
      message: 'Payout processing failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
