/**
 * Database Export Script for Production Migration
 * Exports all collections to JSON files for migration to production
 * 
 * Usage: node backend/scripts/export-database.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bazaar';
const EXPORT_DIR = path.join(__dirname, '../exports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const EXPORT_PATH = path.join(EXPORT_DIR, `export-${TIMESTAMP}`);

// Collections to export (in order to maintain referential integrity)
const COLLECTIONS_TO_EXPORT = [
  // Core collections
  'users',
  'guestUsers',
  'artisans',
  'products',
  
  // Order and transaction collections
  'orders',
  'wallets',
  'wallettransactions',
  'transactions',
  'revenues',
  
  // Community and engagement
  'reviews',
  'favorites',
  'communityposts',
  'communitycomments',
  
  // Promotional and marketing
  'artisanspotlight',
  'promotionalfeatures',
  'promotional_campaigns',
  'promotional_pricing',
  
  // System configuration
  'platformsettings',
  'geographicsettings',
  'notifications',
  
  // Admin
  'adminauditlogs'
];

// Sensitive fields to exclude from export
const SENSITIVE_FIELDS = {
  users: ['password', 'resetPasswordToken', 'resetPasswordExpires'],
  guestUsers: ['password'],
  artisans: ['bankInfo.accountNumber', 'bankInfo.encryptedAccountNumber'],
  wallets: ['stripeCustomerId', 'stripeAccountId'],
  platformsettings: ['platformBankInfo.accountNumber']
};

async function exportDatabase() {
  let client;
  
  try {
    console.log('🚀 Starting database export...');
    console.log('📁 Export directory:', EXPORT_PATH);
    
    // Create export directory
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(EXPORT_PATH)) {
      fs.mkdirSync(EXPORT_PATH, { recursive: true });
    }
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Get all collections in database
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`\n📊 Found ${collectionNames.length} collections in database`);
    console.log('Collections:', collectionNames.join(', '));
    
    // Export metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      sourceDatabase: db.databaseName,
      mongoVersion: await getMongoVersion(client),
      collections: [],
      totalDocuments: 0
    };
    
    // Export each collection
    for (const collectionName of COLLECTIONS_TO_EXPORT) {
      if (!collectionNames.includes(collectionName)) {
        console.log(`⚠️  Collection '${collectionName}' not found, skipping...`);
        continue;
      }
      
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        console.log(`\n📦 Exporting ${collectionName}... (${count} documents)`);
        
        if (count === 0) {
          console.log(`   ⏭️  Skipping empty collection`);
          continue;
        }
        
        // Get all documents
        let documents = await collection.find({}).toArray();
        
        // Remove sensitive fields
        if (SENSITIVE_FIELDS[collectionName]) {
          documents = documents.map(doc => {
            const cleanDoc = { ...doc };
            SENSITIVE_FIELDS[collectionName].forEach(field => {
              if (field.includes('.')) {
                // Handle nested fields
                const parts = field.split('.');
                let obj = cleanDoc;
                for (let i = 0; i < parts.length - 1; i++) {
                  if (obj[parts[i]]) obj = obj[parts[i]];
                }
                if (obj[parts[parts.length - 1]]) {
                  obj[parts[parts.length - 1]] = '***REDACTED***';
                }
              } else {
                if (cleanDoc[field]) {
                  cleanDoc[field] = '***REDACTED***';
                }
              }
            });
            return cleanDoc;
          });
        }
        
        // Write to file
        const filename = `${collectionName}.json`;
        const filepath = path.join(EXPORT_PATH, filename);
        fs.writeFileSync(filepath, JSON.stringify(documents, null, 2));
        
        console.log(`   ✅ Exported to ${filename}`);
        
        metadata.collections.push({
          name: collectionName,
          documentCount: count,
          filename: filename
        });
        
        metadata.totalDocuments += count;
        
      } catch (error) {
        console.error(`   ❌ Error exporting ${collectionName}:`, error.message);
      }
    }
    
    // Export additional collections not in the predefined list
    const additionalCollections = collectionNames.filter(
      name => !COLLECTIONS_TO_EXPORT.includes(name) && !name.startsWith('system.')
    );
    
    if (additionalCollections.length > 0) {
      console.log(`\n📋 Found ${additionalCollections.length} additional collections:`);
      console.log('   ', additionalCollections.join(', '));
      console.log('   These were not exported. Add them to COLLECTIONS_TO_EXPORT if needed.');
    }
    
    // Write metadata
    fs.writeFileSync(
      path.join(EXPORT_PATH, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Create import script
    createImportScript(EXPORT_PATH, metadata);
    
    // Create README
    createReadme(EXPORT_PATH, metadata);
    
    console.log('\n✅ Export completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Collections exported: ${metadata.collections.length}`);
    console.log(`   Total documents: ${metadata.totalDocuments}`);
    console.log(`   Export location: ${EXPORT_PATH}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review the exported files in: ${EXPORT_PATH}`);
    console.log(`   2. Transfer the export folder to your production server`);
    console.log(`   3. Run the import script: node import-data.js`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

async function getMongoVersion(client) {
  try {
    const adminDb = client.db().admin();
    const info = await adminDb.serverInfo();
    return info.version;
  } catch (error) {
    return 'unknown';
  }
}

function createImportScript(exportPath, metadata) {
  const importScript = `/**
 * Database Import Script for Production
 * Imports all collections from exported JSON files
 * 
 * Usage: 
 * 1. Set MONGODB_URI environment variable to your production database
 * 2. Run: node import-data.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// IMPORTANT: Set this to your production MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable not set!');
  console.log('Set it with: export MONGODB_URI="your-production-mongodb-uri"');
  process.exit(1);
}

const IMPORT_DIR = __dirname;

async function importDatabase() {
  let client;
  
  try {
    console.log('🚀 Starting database import to PRODUCTION...');
    console.log('⚠️  WARNING: This will import data to:', MONGODB_URI.replace(/\\/\\/([^:]+):([^@]+)@/, '//$1:***@'));
    console.log('');
    
    // Safety check
    if (!process.env.CONFIRM_IMPORT) {
      console.log('🛑 Safety check: Set CONFIRM_IMPORT=true to proceed');
      console.log('   Example: CONFIRM_IMPORT=true node import-data.js');
      process.exit(0);
    }
    
    // Read metadata
    const metadata = JSON.parse(
      fs.readFileSync(path.join(IMPORT_DIR, '_metadata.json'), 'utf8')
    );
    
    console.log('📋 Import metadata:');
    console.log('   Export date:', metadata.exportDate);
    console.log('   Collections:', metadata.collections.length);
    console.log('   Total documents:', metadata.totalDocuments);
    console.log('');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to production MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db();
    
    // Import each collection
    for (const collectionInfo of metadata.collections) {
      try {
        console.log(\`\\n📦 Importing \${collectionInfo.name}... (\${collectionInfo.documentCount} documents)\`);
        
        const filepath = path.join(IMPORT_DIR, collectionInfo.filename);
        const documents = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        if (documents.length === 0) {
          console.log('   ⏭️  No documents to import');
          continue;
        }
        
        const collection = db.collection(collectionInfo.name);
        
        // Check if collection exists and has data
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
          console.log(\`   ⚠️  Collection already has \${existingCount} documents\`);
          console.log('   Skipping to avoid duplicates. Drop collection manually if needed.');
          continue;
        }
        
        // Insert documents
        const result = await collection.insertMany(documents, { ordered: false });
        console.log(\`   ✅ Imported \${result.insertedCount} documents\`);
        
      } catch (error) {
        if (error.code === 11000) {
          console.log('   ⚠️  Duplicate key error - some documents already exist, continuing...');
        } else {
          console.error(\`   ❌ Error importing \${collectionInfo.name}:\`, error.message);
        }
      }
    }
    
    console.log('\\n✅ Import completed!');
    console.log('\\n⚠️  IMPORTANT POST-IMPORT STEPS:');
    console.log('   1. Update sensitive data (passwords, API keys, etc.)');
    console.log('   2. Verify all collections imported correctly');
    console.log('   3. Test the application with production data');
    console.log('   4. Set up proper indexes (see database-indexes.js)');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\\n🔌 Disconnected from MongoDB');
    }
  }
}

importDatabase();
`;

  fs.writeFileSync(
    path.join(exportPath, 'import-data.js'),
    importScript
  );
  
  console.log(`\n   ✅ Created import script: import-data.js`);
}

function createReadme(exportPath, metadata) {
  const readme = `# Database Export - ${metadata.exportDate}

## Export Information

- **Export Date**: ${metadata.exportDate}
- **Source Database**: ${metadata.sourceDatabase}
- **MongoDB Version**: ${metadata.mongoVersion}
- **Collections Exported**: ${metadata.collections.length}
- **Total Documents**: ${metadata.totalDocuments}

## Collections

${metadata.collections.map(c => `- **${c.name}**: ${c.documentCount} documents → \`${c.filename}\``).join('\n')}

## Security Notes

⚠️ **IMPORTANT**: Sensitive data has been redacted:
- User passwords
- Password reset tokens
- Bank account numbers (last 4 digits only)
- Stripe customer IDs

**Before importing to production:**
1. User passwords will need to be reset (users will use "Forgot Password")
2. Bank information will need to be re-entered by artisans
3. Stripe connections will need to be re-established

## Import Instructions

### 1. Prerequisites
- Node.js installed on production server
- MongoDB connection string for production
- npm packages: \`npm install mongodb dotenv\`

### 2. Transfer Files
Transfer this entire folder to your production server:
\`\`\`bash
scp -r ${path.basename(EXPORT_PATH)} user@production-server:/path/to/destination/
\`\`\`

### 3. Set Production MongoDB URI
\`\`\`bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/bazaar"
# OR
export PROD_MONGODB_URI="your-production-uri"
\`\`\`

### 4. Run Import (with safety confirmation)
\`\`\`bash
cd ${path.basename(EXPORT_PATH)}
CONFIRM_IMPORT=true node import-data.js
\`\`\`

### 5. Post-Import Tasks

#### A. Create Database Indexes
\`\`\`bash
node backend/scripts/create-indexes.js
\`\`\`

#### B. Update Platform Settings
- Log in as admin
- Go to Platform Settings
- Verify/update:
  - Platform fee percentage
  - Payout settings
  - Payment processing configuration

#### C. Configure Stripe
- Set up Stripe production API keys
- Configure webhooks for production URL
- Test payment flows

#### D. Test Critical Functions
- [ ] User authentication
- [ ] Product browsing
- [ ] Order placement
- [ ] Payment processing
- [ ] Artisan payouts
- [ ] Admin dashboard

## Rollback Plan

If import fails or issues arise:

1. **Drop imported collections**:
\`\`\`javascript
// In MongoDB shell or Compass
db.getCollectionNames().forEach(c => db[c].drop())
\`\`\`

2. **Re-import from backup** (if you have a previous backup)

3. **Contact support** if data corruption occurs

## Troubleshooting

### Duplicate Key Errors
- Collections already exist with data
- Solution: Drop existing collections or import to a new database

### Connection Timeout
- Check MongoDB URI
- Verify network access from production server
- Check MongoDB Atlas IP whitelist

### Memory Issues
- Large collections may need batch imports
- Consider using \`mongorestore\` for very large datasets

## Support

For issues or questions:
- Check application logs
- Review MongoDB Atlas monitoring
- Contact development team

---
Generated by BazaarMKT Database Export Tool
`;

  fs.writeFileSync(
    path.join(exportPath, 'README.md'),
    readme
  );
  
  console.log(`   ✅ Created README: README.md`);
}

// Run export
exportDatabase();

