# Production Database Index Migration Guide

## Overview

This guide provides step-by-step instructions for migrating database indexes to production MongoDB Atlas. These optimizations are critical for search performance and must be applied carefully to avoid downtime.

## ⚠️ Important Considerations

### Before You Begin
- **Database Size**: Index creation time depends on collection size
- **Production Load**: Plan migration during low-traffic periods
- **Testing**: Test all indexes in staging environment first
- **Backup**: Ensure recent backup exists before migration
- **Monitoring**: Watch performance metrics during and after migration

### Index Creation Behavior
- **Non-Blocking**: By default, MongoDB creates indexes in foreground (locks the collection)
- **Background**: For production, always use `background: true` option
- **Atlas**: MongoDB Atlas may automatically optimize index creation

## Migration Strategy

### Option 1: Automated Script (Recommended for Dev/Staging)

For development or staging environments, use the automated script:

```bash
# Connect to your MongoDB instance
node backend/scripts/migrate-search-indexes.js
```

### Option 2: Manual Migration (Recommended for Production)

For production, manually apply indexes through MongoDB Atlas UI or shell for better control.

## Step-by-Step Production Migration

### Step 1: Connect to Production Database

#### Via MongoDB Atlas UI
1. Log into MongoDB Atlas
2. Navigate to your cluster
3. Click "Browse Collections"
4. Select your database

#### Via MongoDB Shell
```bash
# Connect to your production cluster
mongosh "mongodb+srv://your-cluster.mongodb.net/your-database" --username your-username
```

### Step 2: Check Existing Indexes

```javascript
// Check current indexes on products collection
db.products.getIndexes()

// Check index usage statistics
db.products.aggregate([{ $indexStats: {} }])
```

### Step 3: Drop Old Text Index (if exists)

**⚠️ IMPORTANT**: The old text index conflicts with our new optimized one.

```javascript
// First, check if old text index exists
db.products.getIndexes().filter(idx => idx.name.includes('text'))

// If you see an old text index like 'title_text_description_text_tags_text', drop it
db.products.dropIndex('title_text_description_text_tags_text')
```

### Step 4: Create New Optimized Text Search Index

```javascript
// Create optimized text search index with weighted fields
db.products.createIndex(
  {
    name: "text",
    description: "text", 
    tags: "text",
    category: "text"
  },
  {
    weights: {
      name: 10,       // Product name most important
      tags: 5,        // Tags moderately important
      category: 3,    // Category helpful for context
      description: 1  // Description least important
    },
    name: "optimized_text_search_index",
    background: true  // IMPORTANT: Non-blocking for production
  }
)
```

**Expected Time**: 2-10 minutes depending on collection size

### Step 5: Create Compound Indexes for Common Query Patterns

```javascript
// Compound indexes for filtered searches
db.products.createIndex(
  { isActive: 1, category: 1, price: 1 },
  { background: true, name: "active_category_price" }
)

db.products.createIndex(
  { category: 1, subcategory: 1, status: 1 },
  { background: true, name: "category_subcategory_status" }
)

db.products.createIndex(
  { isActive: 1, productType: 1, createdAt: -1 },
  { background: true, name: "active_type_created" }
)
```

**Expected Time**: 1-5 minutes each

### Step 6: Create Inventory-Aware Indexes

```javascript
// Indexes for inventory checking by product type
db.products.createIndex(
  { productType: 1, stock: 1, isActive: 1 },
  { background: true, name: "type_stock_active" }
)

db.products.createIndex(
  { productType: 1, remainingCapacity: 1, isActive: 1 },
  { background: true, name: "type_capacity_active" }
)

db.products.createIndex(
  { productType: 1, availableQuantity: 1, isActive: 1 },
  { background: true, name: "type_quantity_active" }
)
```

**Expected Time**: 1-5 minutes each

### Step 7: Create Performance Optimization Indexes

```javascript
// For popular/trending products
db.products.createIndex(
  { isActive: 1, views: -1, soldCount: -1 },
  { background: true, name: "active_popularity" }
)

// For featured products
db.products.createIndex(
  { isFeatured: 1, isActive: 1, createdAt: -1 },
  { background: true, name: "featured_active_created" }
)

// For recent products
db.products.createIndex(
  { isActive: 1, createdAt: -1 },
  { background: true, name: "active_created" }
)
```

**Expected Time**: 1-3 minutes each

### Step 8: Add Missing Basic Indexes

```javascript
// Add isActive index if not exists
db.products.createIndex(
  { isActive: 1 },
  { background: true, name: "isActive" }
)
```

## Verification Steps

### 1. Verify All Indexes Created

```javascript
// List all indexes
db.products.getIndexes()

// Expected indexes:
// - _id_ (default)
// - artisan_1
// - category_1
// - subcategory_1
// - status_1
// - isActive_1
// - price_1
// - createdAt_-1
// - updatedAt_-1
// - optimized_text_search_index
// - active_category_price
// - category_subcategory_status
// - active_type_created
// - type_stock_active
// - type_capacity_active
// - type_quantity_active
// - active_popularity
// - featured_active_created
// - active_created
```

### 2. Test Search Performance

```javascript
// Test text search
db.products.find(
  { 
    $text: { $search: "handmade pottery" },
    isActive: true 
  }
).explain("executionStats")

// Check if index is being used
// Look for: winningPlan.inputStage.stage: "TEXT"
```

### 3. Monitor Index Usage

```javascript
// Get index usage statistics
db.products.aggregate([
  { $indexStats: {} }
]).pretty()

// Look for:
// - ops: number of operations using this index
// - since: when index statistics collection began
```

## Performance Testing

### Before Migration Metrics
Document your current performance:

```javascript
// Test search query time before migration
var start = Date.now()
db.products.find({
  name: { $regex: "pottery", $options: "i" },
  isActive: true
}).limit(20).toArray()
var end = Date.now()
print("Query time (before): " + (end - start) + "ms")
```

### After Migration Metrics

```javascript
// Test search query time after migration
var start = Date.now()
db.products.find({
  $text: { $search: "pottery" },
  isActive: true
}).limit(20).toArray()
var end = Date.now()
print("Query time (after): " + (end - start) + "ms")

// Expected improvement: 60-80% reduction in query time
```

## Rollback Plan

If issues occur after migration:

### 1. Keep Old Regex Search Available

The backend code automatically falls back to regex if text search fails. No immediate action needed.

### 2. Drop Problematic Index

```javascript
// If a specific index causes issues
db.products.dropIndex("index_name_here")
```

### 3. Recreate Old Index

```javascript
// If you need to revert to old text index
db.products.createIndex(
  { title: "text", description: "text", tags: "text" },
  { background: true }
)
```

## Post-Migration Monitoring

### Monitor These Metrics

1. **Query Response Time**
   - Target: < 200ms for 95th percentile
   - Check: Application performance monitoring (APM)

2. **Database CPU Usage**
   - Expected: 30-50% reduction
   - Check: MongoDB Atlas Metrics

3. **Index Size**
   - Check: `db.products.stats().indexSizes`
   - Note: New indexes will increase total index size

4. **Slow Query Logs**
   - Check: MongoDB Atlas → Performance → Slow Queries
   - Look for: Queries not using new indexes

### MongoDB Atlas Monitoring

1. Navigate to Atlas Cluster → Metrics
2. Watch these charts:
   - Query Execution Times
   - Index Usage
   - CPU Utilization
   - Memory Usage

3. Set up alerts:
   - Slow query threshold: > 500ms
   - High CPU: > 80%
   - Index miss rate: > 10%

## Maintenance Schedule

### Weekly
- Review index usage statistics
- Check for unused indexes
- Monitor slow queries

### Monthly
- Analyze search patterns
- Optimize or add new indexes based on usage
- Review and remove unused indexes

### Quarterly
- Full performance audit
- Rebuild indexes if fragmented
- Update index strategy based on growth

## Troubleshooting

### Issue: Index Creation Fails

**Symptoms**: Error message during index creation

**Solutions**:
1. Check collection size and available disk space
2. Ensure no duplicate keys for unique indexes
3. Verify field names exist in documents
4. Try creating without `background: true` in staging first

### Issue: Queries Still Slow After Migration

**Symptoms**: No performance improvement

**Solutions**:
1. Verify backend code is using `$text` search (not regex)
2. Check if index is being used: `.explain("executionStats")`
3. Ensure text index covers search fields
4. Review compound index order

### Issue: Text Search Returns No Results

**Symptoms**: Searches that worked before now return empty

**Solutions**:
1. Check field names in text index match your schema
2. Verify documents have content in indexed fields
3. Test with simple search terms first
4. Check for language-specific issues

### Issue: High Memory Usage

**Symptoms**: Increased memory consumption after indexing

**Solutions**:
1. Indexes consume RAM - ensure adequate memory
2. Review index sizes: `db.products.stats().indexSizes`
3. Consider removing rarely-used indexes
4. Upgrade cluster tier if needed

## Automated Migration Script

For development/staging environments, use this script:

```javascript
// backend/scripts/migrate-search-indexes.js
const { getDB } = require('../config/database');
const { createProductIndexes } = require('../config/database-indexes');

async function migrateIndexes() {
  try {
    console.log('🔄 Starting index migration...');
    
    const db = await getDB();
    const productsCollection = db.collection('products');
    
    // Get existing indexes
    const existingIndexes = await productsCollection.indexes();
    console.log('📋 Existing indexes:', existingIndexes.map(i => i.name));
    
    // Drop old text index if exists
    const oldTextIndex = existingIndexes.find(i => 
      i.name && i.name.includes('text') && i.name !== 'optimized_text_search_index'
    );
    
    if (oldTextIndex) {
      console.log(`🗑️  Dropping old text index: ${oldTextIndex.name}`);
      await productsCollection.dropIndex(oldTextIndex.name);
    }
    
    // Create new indexes
    console.log('✨ Creating optimized indexes...');
    await createProductIndexes(db);
    
    // Verify
    const newIndexes = await productsCollection.indexes();
    console.log('✅ Migration complete!');
    console.log('📊 Total indexes:', newIndexes.length);
    
    // Test search
    console.log('🧪 Testing text search...');
    const testResult = await productsCollection.find(
      { $text: { $search: "test" } }
    ).limit(1).toArray();
    console.log('✅ Text search working');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateIndexes();
```

Run it:
```bash
node backend/scripts/migrate-search-indexes.js
```

## Summary Checklist

- [ ] Backup production database
- [ ] Test indexes in staging environment
- [ ] Plan migration during low-traffic period
- [ ] Connect to production database
- [ ] Check and document existing indexes
- [ ] Drop old conflicting text index
- [ ] Create new optimized text index
- [ ] Create all compound indexes
- [ ] Verify all indexes created successfully
- [ ] Test search functionality
- [ ] Monitor performance metrics
- [ ] Document before/after performance
- [ ] Set up ongoing monitoring
- [ ] Update team on changes

## Expected Results

After successful migration:

- **Search Response Time**: 70-80% faster
- **Database CPU**: 30-50% lower
- **Text Search**: Better relevance ranking
- **Scalability**: Support 10x more products
- **User Experience**: Near-instant search results

## Support

If you encounter issues during migration:

1. Check MongoDB Atlas documentation
2. Review MongoDB logs for errors
3. Consult your database administrator
4. Roll back problematic changes
5. Test in staging before reapplying

## References

- [MongoDB Text Indexes](https://docs.mongodb.com/manual/core/index-text/)
- [MongoDB Index Strategies](https://docs.mongodb.com/manual/applications/indexes/)
- [MongoDB Atlas Performance Optimization](https://docs.atlas.mongodb.com/performance-advisor/)
- [Index Build Process](https://docs.mongodb.com/manual/core/index-creation/)

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Status**: Production Ready
