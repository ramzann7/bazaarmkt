/**
 * Vercel Cron Job for inventory restoration
 * This endpoint is called by Vercel Cron Jobs daily at 2 AM EST
 */

const { MongoClient, ObjectId } = require('mongodb');
const InventoryRestorationService = require('../../services/inventoryRestorationService');

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
