const { MongoClient } = require('mongodb');

// Production MongoDB Atlas connection string
const PRODUCTION_URI = process.env.PRODUCTION_MONGODB_URI || 'mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority';

// Non-production MongoDB Atlas connection string (source for schema reference)
const NON_PROD_URI = process.env.MONGODB_URI || 'mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

// Database names
const PRODUCTION_DB_NAME = 'bazaarmkt-prod';
const NON_PROD_DB_NAME = 'bazarmkt';

async function setupProductionDatabase() {
  let nonProdClient, prodClient;
  
  try {
    console.log('🔄 Setting up production database structure...');
    
    // Connect to non-production database (for schema reference)
    console.log('📡 Connecting to non-production database...');
    nonProdClient = new MongoClient(NON_PROD_URI);
    await nonProdClient.connect();
    console.log('✅ Connected to non-production database');
    
    // Connect to production database
    console.log('☁️ Connecting to production database...');
    console.log('🔗 Using connection string:', PRODUCTION_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    prodClient = new MongoClient(PRODUCTION_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await prodClient.connect();
    console.log('✅ Connected to production database');
    
    const nonProdDb = nonProdClient.db(NON_PROD_DB_NAME);
    const prodDb = prodClient.db(PRODUCTION_DB_NAME);
    
    // Test the connection
    console.log('🔍 Testing production connection...');
    const adminDb = prodClient.db('admin');
    await adminDb.command({ ping: 1 });
    console.log('✅ Production connection test successful');
    
    // Get all collection names from non-production database
    const collections = await nonProdDb.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections to set up in production`);
    
    // Set up each collection in production
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n🔄 Setting up collection: ${collectionName}`);
      
      // Check if collection already exists in production
      const existingCollections = await prodDb.listCollections({ name: collectionName }).toArray();
      
      if (existingCollections.length > 0) {
        console.log(`ℹ️ Collection ${collectionName} already exists in production`);
        
        // Get document count
        const docCount = await prodDb.collection(collectionName).countDocuments();
        console.log(`📄 Production ${collectionName} has ${docCount} documents`);
      } else {
        // Create empty collection with proper indexes
        console.log(`📝 Creating empty collection: ${collectionName}`);
        
        // Create the collection by inserting and immediately deleting a document
        await prodDb.collection(collectionName).insertOne({ _temp: true });
        await prodDb.collection(collectionName).deleteOne({ _temp: true });
        
        console.log(`✅ Created empty collection: ${collectionName}`);
      }
      
      // Set up indexes based on collection type
      await setupCollectionIndexes(prodDb, collectionName);
    }
    
    // Create essential collections that might be missing
    const essentialCollections = [
      'users',
      'artisans', 
      'products',
      'orders',
      'reviews',
      'revenues',
      'wallets',
      'wallettransactions',
      'platformsettings',
      'geographicsettings',
      'promotionalfeatures',
      'artisanspotlights',
      'communityposts',
      'communitycomments',
      'badges',
      'rewards',
      'rewardredemptions',
      'adminaudits',
      'platformexpenses'
    ];
    
    console.log('\n🔧 Ensuring all essential collections exist...');
    for (const collectionName of essentialCollections) {
      const existingCollections = await prodDb.listCollections({ name: collectionName }).toArray();
      
      if (existingCollections.length === 0) {
        console.log(`📝 Creating essential collection: ${collectionName}`);
        await prodDb.collection(collectionName).insertOne({ _temp: true });
        await prodDb.collection(collectionName).deleteOne({ _temp: true });
        await setupCollectionIndexes(prodDb, collectionName);
      }
    }
    
    console.log('\n🎉 Production database setup completed successfully!');
    console.log('\n📊 Production Database Summary:');
    
    // Show final collection counts
    const prodCollections = await prodDb.listCollections().toArray();
    for (const collection of prodCollections) {
      const collectionName = collection.name;
      const docCount = await prodDb.collection(collectionName).countDocuments();
      console.log(`  ${collectionName}: ${docCount} documents`);
    }
    
    console.log('\n🔧 Next steps:');
    console.log('1. Update your production .env file with the production Atlas connection string');
    console.log('2. Test your production application with the new database structure');
    console.log('3. The database is ready for production data');
    
  } catch (error) {
    console.error('❌ Production database setup failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 8000) {
      console.log('\n🔧 Troubleshooting Atlas connection:');
      console.log('1. Check if the username and password are correct');
      console.log('2. Ensure the IP address is whitelisted in Atlas');
      console.log('3. Verify the cluster name and connection string format');
    }
  } finally {
    // Close connections
    if (nonProdClient) {
      await nonProdClient.close();
      console.log('🔌 Closed non-production MongoDB connection');
    }
    if (prodClient) {
      await prodClient.close();
      console.log('🔌 Closed production MongoDB connection');
    }
  }
}

async function setupCollectionIndexes(db, collectionName) {
  try {
    console.log(`🔍 Setting up indexes for ${collectionName}...`);
    
    // Common indexes for different collection types
    const indexConfigs = {
      'users': [
        { key: { email: 1 }, unique: true },
        { key: { phone: 1 }, sparse: true },
        { key: { role: 1 } },
        { key: { isActive: 1 } }
      ],
      'artisans': [
        { key: { user: 1 }, unique: true },
        { key: { artisanName: 1 } },
        { key: { type: 1 } },
        { key: { isActive: 1 } },
        { key: { isVerified: 1 } },
        { key: { 'address.city': 1 } },
        { key: { 'address.lat': 1, 'address.lng': 1 } }
      ],
      'products': [
        { key: { artisan: 1 } },
        { key: { name: 1 } },
        { key: { category: 1 } },
        { key: { isActive: 1 } },
        { key: { price: 1 } },
        { key: { createdAt: -1 } }
      ],
      'orders': [
        { key: { patron: 1 } },
        { key: { artisan: 1 } },
        { key: { status: 1 } },
        { key: { orderDate: -1 } },
        { key: { orderNumber: 1 }, unique: true, sparse: true }
      ],
      'reviews': [
        { key: { artisan: 1 } },
        { key: { patron: 1 } },
        { key: { rating: 1 } },
        { key: { createdAt: -1 } }
      ],
      'revenues': [
        { key: { artisanId: 1 } },
        { key: { orderId: 1 } },
        { key: { status: 1 } },
        { key: { paymentDate: -1 } }
      ],
      'wallets': [
        { key: { artisanId: 1 }, unique: true },
        { key: { isActive: 1 } }
      ],
      'wallettransactions': [
        { key: { walletId: 1 } },
        { key: { artisanId: 1 } },
        { key: { type: 1 } },
        { key: { createdAt: -1 } }
      ],
      'platformsettings': [
        { key: { name: 1 }, unique: true }
      ],
      'geographicsettings': [
        { key: { region: 1 }, unique: true }
      ],
      'promotionalfeatures': [
        { key: { artisanId: 1 } },
        { key: { type: 1 } },
        { key: { isActive: 1 } },
        { key: { startDate: 1, endDate: 1 } }
      ],
      'artisanspotlights': [
        { key: { artisanId: 1 } },
        { key: { isActive: 1 } },
        { key: { startDate: 1, endDate: 1 } }
      ],
      'communityposts': [
        { key: { artisan: 1 } },
        { key: { createdAt: -1 } },
        { key: { isActive: 1 } }
      ],
      'communitycomments': [
        { key: { post: 1 } },
        { key: { user: 1 } },
        { key: { createdAt: -1 } }
      ],
      'badges': [
        { key: { name: 1 }, unique: true },
        { key: { category: 1 } }
      ],
      'rewards': [
        { key: { artisanId: 1 } },
        { key: { isActive: 1 } },
        { key: { redemptionCode: 1 }, unique: true, sparse: true }
      ],
      'rewardredemptions': [
        { key: { rewardId: 1 } },
        { key: { patronId: 1 } },
        { key: { redeemedAt: -1 } }
      ],
      'adminaudits': [
        { key: { adminId: 1 } },
        { key: { action: 1 } },
        { key: { timestamp: -1 } }
      ],
      'platformexpenses': [
        { key: { type: 1 } },
        { key: { date: -1 } }
      ]
    };
    
    const indexes = indexConfigs[collectionName] || [];
    
    for (const indexConfig of indexes) {
      try {
        await db.collection(collectionName).createIndex(indexConfig.key, {
          unique: indexConfig.unique || false,
          sparse: indexConfig.sparse || false,
          background: true
        });
        console.log(`  ✅ Created index: ${JSON.stringify(indexConfig.key)}`);
      } catch (indexError) {
        if (indexError.code === 85) {
          console.log(`  ℹ️ Index already exists: ${JSON.stringify(indexConfig.key)}`);
        } else {
          console.log(`  ⚠️ Index creation failed: ${JSON.stringify(indexConfig.key)} - ${indexError.message}`);
        }
      }
    }
    
    console.log(`✅ Index setup completed for ${collectionName}`);
    
  } catch (error) {
    console.error(`❌ Error setting up indexes for ${collectionName}:`, error.message);
  }
}

// Run the setup
setupProductionDatabase().catch(console.error);

