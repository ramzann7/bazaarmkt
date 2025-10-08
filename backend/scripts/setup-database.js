#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates indexes and optimizes database for production
 */

require('dotenv').config();
const { createIndexes, getIndexStats } = require('../config/database-indexes');
const { getDB } = require('../config/database');

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Test database connection
    const db = await getDB();
    console.log('✅ Database connection established');

    // Create indexes
    await createIndexes();
    
    // Get index statistics
    const stats = await getIndexStats();
    console.log('📊 Index Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('✅ Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
