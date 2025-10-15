/**
 * Vercel Cron Job for inventory restoration
 * This endpoint is called by Vercel Cron Jobs daily at 2 AM EST
 */

const { MongoClient, ObjectId } = require('mongodb');
const InventoryRestorationService = require('../../services/inventoryRestorationService');

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
let db;
const connectDB = async () => {
  if (db) return db;
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME);
  return db;
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
    
    console.log('⏰ Vercel Cron Job triggered - Processing inventory restoration');
    
    // Connect to database
    const database = await connectDB();
    
    // Initialize inventory restoration service
    const inventoryService = new InventoryRestorationService(database);
    
    // Process all restorations
    const result = await inventoryService.processAllRestorations();
    
    res.status(200).json({
      success: true,
      message: 'Inventory restoration completed',
      timestamp: new Date().toISOString(),
      data: result
    });
    
  } catch (error) {
    console.error('❌ Inventory restoration cron job error:', error);
    res.status(500).json({
      success: false,
      message: 'Inventory restoration failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
