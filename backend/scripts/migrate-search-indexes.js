/**
 * Search Index Migration Script
 * Migrates database indexes to optimized text search configuration
 * 
 * Usage:
 * - Development: node backend/scripts/migrate-search-indexes.js
 * - Production: Follow manual migration guide in documentation
 */

const { getDB } = require('../config/database');
const { createProductIndexes } = require('../config/database-indexes');

async function migrateIndexes() {
  console.log('🔄 Starting search index migration...\n');
  
  try {
    // Connect to database
    const db = await getDB();
    const productsCollection = db.collection('products');
    
    // Step 1: Analyze existing indexes
    console.log('📋 Step 1: Analyzing existing indexes...');
    const existingIndexes = await productsCollection.indexes();
    console.log(`   Found ${existingIndexes.length} existing indexes:`);
    existingIndexes.forEach(idx => {
      console.log(`   - ${idx.name}`);
    });
    console.log('');
    
    // Step 2: Check for old text index
    console.log('🔍 Step 2: Checking for old text indexes...');
    const textIndexes = existingIndexes.filter(i => 
      i.name && i.name.includes('text')
    );
    
    if (textIndexes.length > 0) {
      console.log(`   Found ${textIndexes.length} text index(es):`);
      textIndexes.forEach(idx => {
        console.log(`   - ${idx.name}`);
      });
      
      // Drop old text indexes (except our optimized one)
      for (const idx of textIndexes) {
        if (idx.name !== 'optimized_text_search_index') {
          console.log(`   🗑️  Dropping old text index: ${idx.name}`);
          try {
            await productsCollection.dropIndex(idx.name);
            console.log(`   ✅ Dropped: ${idx.name}`);
          } catch (error) {
            console.log(`   ⚠️  Could not drop ${idx.name}: ${error.message}`);
          }
        }
      }
    } else {
      console.log('   No old text indexes found');
    }
    console.log('');
    
    // Step 3: Get collection stats before migration
    console.log('📊 Step 3: Gathering collection statistics...');
    const statsBefore = await productsCollection.stats();
    console.log(`   Total documents: ${statsBefore.count}`);
    console.log(`   Collection size: ${(statsBefore.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total index size: ${(statsBefore.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Number of indexes: ${statsBefore.nindexes}`);
    console.log('');
    
    // Step 4: Create optimized indexes
    console.log('✨ Step 4: Creating optimized indexes...');
    console.log('   This may take several minutes depending on collection size...');
    
    const startTime = Date.now();
    await createProductIndexes(db);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`   ✅ Index creation completed in ${duration} seconds`);
    console.log('');
    
    // Step 5: Verify new indexes
    console.log('🔍 Step 5: Verifying new indexes...');
    const newIndexes = await productsCollection.indexes();
    console.log(`   Total indexes now: ${newIndexes.length}`);
    
    // Check for our optimized text index
    const optimizedIndex = newIndexes.find(i => i.name === 'optimized_text_search_index');
    if (optimizedIndex) {
      console.log('   ✅ Optimized text search index created successfully');
      console.log(`      Fields: ${Object.keys(optimizedIndex.weights || {}).join(', ')}`);
    } else {
      console.log('   ⚠️  Optimized text search index not found!');
    }
    console.log('');
    
    // Step 6: Get collection stats after migration
    console.log('📊 Step 6: Post-migration statistics...');
    const statsAfter = await productsCollection.stats();
    console.log(`   Total index size: ${(statsAfter.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Index size increase: ${((statsAfter.totalIndexSize - statsBefore.totalIndexSize) / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    
    // Step 7: Test text search functionality
    console.log('🧪 Step 7: Testing text search functionality...');
    
    try {
      // Test basic text search
      const testStart = Date.now();
      const testResults = await productsCollection.find(
        { 
          $text: { $search: "test" },
          isActive: { $ne: false }
        }
      ).limit(5).toArray();
      const testEnd = Date.now();
      
      console.log(`   ✅ Text search working`);
      console.log(`      Query time: ${testEnd - testStart}ms`);
      console.log(`      Results found: ${testResults.length}`);
      
      // Test text search with scoring
      const scoredResults = await productsCollection.find(
        { $text: { $search: "handmade" } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(3).toArray();
      
      if (scoredResults.length > 0) {
        console.log(`   ✅ Text score sorting working`);
        console.log(`      Top result score: ${scoredResults[0].score?.toFixed(2) || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Text search test failed: ${error.message}`);
      console.log(`      This might be normal if collection is empty`);
    }
    console.log('');
    
    // Step 8: Generate index usage report
    console.log('📈 Step 8: Index usage analysis...');
    try {
      const indexStats = await productsCollection.aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      console.log('   Index usage statistics:');
      indexStats.forEach(stat => {
        const ops = stat.accesses?.ops || 0;
        console.log(`   - ${stat.name}: ${ops} operations`);
      });
    } catch (error) {
      console.log('   ⚠️  Could not retrieve index statistics');
      console.log('      (This feature may not be available in all MongoDB versions)');
    }
    console.log('');
    
    // Migration complete
    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Before: ${statsBefore.nindexes} indexes, ${(statsBefore.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - After: ${statsAfter.nindexes} indexes, ${(statsAfter.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Duration: ${duration} seconds`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Restart your application to use the new indexes');
    console.log('   2. Monitor search performance in production');
    console.log('   3. Check MongoDB Atlas metrics for improvements');
    console.log('   4. Review slow query logs for any issues');
    console.log('');
    console.log('📚 For production migration, see:');
    console.log('   documentation/PRODUCTION_DATABASE_INDEX_MIGRATION.md');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error(`   Error: ${error.message}`);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check database connection');
    console.error('   2. Verify collection exists');
    console.error('   3. Ensure adequate disk space');
    console.error('   4. Check MongoDB logs for details');
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run migration
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Search Index Migration Script                        ║');
console.log('║         Optimizing database for better search performance    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

migrateIndexes();

