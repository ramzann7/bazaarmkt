/**
 * Vercel Cron Job for processing scheduled payouts
 * This endpoint is called by Vercel Cron Jobs every Friday at 9 AM EST
 */

const { MongoClient, ObjectId } = require('mongodb');

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
        
        // For now, we'll simulate the payout since Stripe Connect requires proper setup
        // In production, this would use the StripeService to create actual payouts
        console.log(`💰 Processing payout for artisan ${artisan.artisanName}: $${payoutAmount}`);
        
        // Create payout transaction record
        const payoutTransaction = {
          artisanId: wallet.artisanId,
          type: 'payout',
          amount: -payoutAmount, // Negative for outgoing
          description: `Weekly payout - ${wallet.payoutSettings.schedule}`,
          status: 'completed',
          reference: `PAYOUT-${Date.now()}`,
          balanceAfter: 0, // Balance after payout
          metadata: {
            payoutDate: now,
            schedule: wallet.payoutSettings.schedule,
            originalBalance: payoutAmount
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
              updatedAt: now
            }
          }
        );
        
        processedCount++;
        results.push({
          artisanId: artisan._id,
          artisanName: artisan.artisanName,
          amount: payoutAmount,
          status: 'success'
        });
        
        console.log(`✅ Payout processed for artisan ${artisan.artisanName}: $${payoutAmount}`);
        
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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests (for cron jobs)
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    // Verify the request is from Vercel Cron (optional security)
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
