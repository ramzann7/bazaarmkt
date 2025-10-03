#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the working connection string but create a production database
const PRODUCTION_MONGODB_URI = "mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority";

async function setupProductionCollections() {
  console.log('🔄 Setting up production database collections...');
  console.log('🔗 Using connection string:', PRODUCTION_MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(PRODUCTION_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    console.log('✅ Successfully connected to production database!');
    
    const db = client.db('bazaarmkt-prod');
    console.log('📊 Database name:', db.databaseName);
    
    // Define all the collections and their indexes
    const collections = [
      {
        name: 'users',
        indexes: [
          { key: { email: 1 }, options: { unique: true } },
          { key: { phone: 1 }, options: { sparse: true } },
          { key: { role: 1 } },
          { key: { createdAt: 1 } },
          { key: { isActive: 1 } }
        ]
      },
      {
        name: 'artisans',
        indexes: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { businessName: 1 } },
          { key: { 'address.city': 1 } },
          { key: { 'address.state': 1 } },
          { key: { 'address.lat': 1, 'address.lng': 1 } },
          { key: { isActive: 1 } },
          { key: { createdAt: 1 } }
        ]
      },
      {
        name: 'products',
        indexes: [
          { key: { artisanId: 1 } },
          { key: { category: 1 } },
          { key: { productType: 1 } },
          { key: { isActive: 1 } },
          { key: { createdAt: 1 } },
          { key: { name: 'text', description: 'text' } }
        ]
      },
      {
        name: 'orders',
        indexes: [
          { key: { userId: 1 } },
          { key: { artisanId: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: 1 } },
          { key: { orderNumber: 1 }, options: { unique: true } },
          { key: { 'deliveryAddress.city': 1 } },
          { key: { 'deliveryAddress.state': 1 } }
        ]
      },
      {
        name: 'reviews',
        indexes: [
          { key: { productId: 1 } },
          { key: { userId: 1 } },
          { key: { artisanId: 1 } },
          { key: { rating: 1 } },
          { key: { createdAt: 1 } }
        ]
      },
      {
        name: 'categories',
        indexes: [
          { key: { name: 1 }, options: { unique: true } },
          { key: { isActive: 1 } }
        ]
      },
      {
        name: 'wallets',
        indexes: [
          { key: { userId: 1 }, options: { unique: true } },
          { key: { artisanId: 1 }, options: { unique: true, sparse: true } },
          { key: { createdAt: 1 } }
        ]
      },
      {
        name: 'transactions',
        indexes: [
          { key: { walletId: 1 } },
          { key: { type: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: 1 } },
          { key: { orderId: 1 }, options: { sparse: true } }
        ]
      },
      {
        name: 'revenue',
        indexes: [
          { key: { orderId: 1 }, options: { unique: true } },
          { key: { artisanId: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: 1 } }
        ]
      },
      {
        name: 'platformSettings',
        indexes: [
          { key: { key: 1 }, options: { unique: true } }
        ]
      },
      {
        name: 'adminAudit',
        indexes: [
          { key: { adminId: 1 } },
          { key: { action: 1 } },
          { key: { timestamp: 1 } },
          { key: { targetType: 1 } }
        ]
      },
      {
        name: 'notifications',
        indexes: [
          { key: { userId: 1 } },
          { key: { type: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: 1 } }
        ]
      }
    ];
    
    // Create collections and indexes
    for (const collection of collections) {
      console.log(`📁 Creating collection: ${collection.name}`);
      
      // Create collection (this will create it if it doesn't exist)
      const coll = db.collection(collection.name);
      
      // Create indexes
      if (collection.indexes && collection.indexes.length > 0) {
        console.log(`  📊 Creating ${collection.indexes.length} indexes...`);
        for (const index of collection.indexes) {
          try {
            await coll.createIndex(index.key, index.options || {});
            console.log(`    ✅ Created index: ${JSON.stringify(index.key)}`);
          } catch (error) {
            if (error.code === 85) {
              console.log(`    ℹ️ Index already exists: ${JSON.stringify(index.key)}`);
            } else {
              console.log(`    ⚠️ Index creation failed: ${error.message}`);
            }
          }
        }
      }
    }
    
    // Verify collections were created
    const createdCollections = await db.listCollections().toArray();
    console.log('\n📋 Created collections:');
    createdCollections.forEach(coll => {
      console.log(`  - ${coll.name}`);
    });
    
    console.log('\n🎉 Production database setup completed successfully!');
    console.log(`📊 Total collections created: ${createdCollections.length}`);
    
  } catch (error) {
    console.error('❌ Production database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

// Run the setup
setupProductionCollections().catch(console.error);





