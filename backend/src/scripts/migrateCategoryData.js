// Database Migration Script: Standardize Category Data
// This script fixes any existing products that have category names instead of keys

const mongoose = require('mongoose');
const Product = require('../models/product');
const { PRODUCT_CATEGORIES } = require('../../frontend/src/data/productReference');

// Category mapping from names to keys
const categoryNameToKeyMap = {};
const subcategoryNameToKeyMap = {};

// Build mapping from reference data
Object.keys(PRODUCT_CATEGORIES).forEach(categoryKey => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  categoryNameToKeyMap[category.name] = categoryKey;
  
  if (category.subcategories) {
    Object.keys(category.subcategories).forEach(subcategoryKey => {
      const subcategory = category.subcategories[subcategoryKey];
      if (!subcategoryNameToKeyMap[categoryKey]) {
        subcategoryNameToKeyMap[categoryKey] = {};
      }
      subcategoryNameToKeyMap[categoryKey][subcategory.name] = subcategoryKey;
    });
  }
});

/**
 * Normalizes a category value to a valid key
 * @param {string} categoryValue - The category value to normalize
 * @returns {string|null} - The normalized category key or null if invalid
 */
function normalizeCategoryKey(categoryValue) {
  if (!categoryValue) return null;
  
  // If it's already a valid key, return it
  if (PRODUCT_CATEGORIES.hasOwnProperty(categoryValue)) {
    return categoryValue;
  }
  
  // Try to find by name
  return categoryNameToKeyMap[categoryValue] || null;
}

/**
 * Normalizes a subcategory value to a valid key
 * @param {string} categoryKey - The category key
 * @param {string} subcategoryValue - The subcategory value to normalize
 * @returns {string|null} - The normalized subcategory key or null if invalid
 */
function normalizeSubcategoryKey(categoryKey, subcategoryValue) {
  if (!categoryKey || !subcategoryValue) return null;
  
  const normalizedCategoryKey = normalizeCategoryKey(categoryKey);
  if (!normalizedCategoryKey) return null;
  
  // If it's already a valid key, return it
  const category = PRODUCT_CATEGORIES[normalizedCategoryKey];
  if (category && category.subcategories && category.subcategories.hasOwnProperty(subcategoryValue)) {
    return subcategoryValue;
  }
  
  // Try to find by name
  const subcategoryMap = subcategoryNameToKeyMap[normalizedCategoryKey];
  if (subcategoryMap) {
    return subcategoryMap[subcategoryValue] || null;
  }
  
  return null;
}

/**
 * Migrates all products to use consistent category keys
 */
async function migrateCategoryData() {
  try {
    console.log('🚀 Starting category data migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-finder-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get all products
    const products = await Product.find({});
    console.log(`📊 Found ${products.length} products to check`);
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const product of products) {
      try {
        let needsUpdate = false;
        const updates = {};
        
        // Check and normalize category
        if (product.category) {
          const normalizedCategory = normalizeCategoryKey(product.category);
          if (normalizedCategory && normalizedCategory !== product.category) {
            updates.category = normalizedCategory;
            needsUpdate = true;
            console.log(`📝 Product ${product._id}: "${product.category}" → "${normalizedCategory}"`);
          } else if (!normalizedCategory) {
            console.warn(`⚠️  Product ${product._id}: Invalid category "${product.category}"`);
            errors.push({
              productId: product._id,
              productName: product.name,
              error: `Invalid category: ${product.category}`
            });
            errorCount++;
          }
        }
        
        // Check and normalize subcategory
        if (product.subcategory && updates.category) {
          const normalizedSubcategory = normalizeSubcategoryKey(updates.category, product.subcategory);
          if (normalizedSubcategory && normalizedSubcategory !== product.subcategory) {
            updates.subcategory = normalizedSubcategory;
            needsUpdate = true;
            console.log(`📝 Product ${product._id}: subcategory "${product.subcategory}" → "${normalizedSubcategory}"`);
          } else if (!normalizedSubcategory) {
            console.warn(`⚠️  Product ${product._id}: Invalid subcategory "${product.subcategory}" for category "${updates.category}"`);
            errors.push({
              productId: product._id,
              productName: product.name,
              error: `Invalid subcategory: ${product.subcategory} for category: ${updates.category}`
            });
            errorCount++;
          }
        }
        
        // Update product if needed
        if (needsUpdate) {
          await Product.findByIdAndUpdate(product._id, updates);
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing product ${product._id}:`, error.message);
        errors.push({
          productId: product._id,
          productName: product.name,
          error: error.message
        });
        errorCount++;
      }
    }
    
    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Products updated: ${updatedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`📝 Total products processed: ${products.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => {
        console.log(`  - Product ${error.productId} (${error.productName}): ${error.error}`);
      });
    }
    
    // Create index for better performance
    console.log('\n🔧 Creating database indexes...');
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ subcategory: 1 });
    await Product.collection.createIndex({ category: 1, subcategory: 1 });
    console.log('✅ Indexes created');
    
    console.log('\n🎉 Category data migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Validates that all products have valid category keys
 */
async function validateCategoryData() {
  try {
    console.log('🔍 Validating category data...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-finder-app';
    await mongoose.connect(mongoUri);
    
    const products = await Product.find({});
    const invalidProducts = [];
    
    for (const product of products) {
      const issues = [];
      
      // Check category
      if (product.category && !PRODUCT_CATEGORIES.hasOwnProperty(product.category)) {
        issues.push(`Invalid category: ${product.category}`);
      }
      
      // Check subcategory
      if (product.subcategory && product.category) {
        const category = PRODUCT_CATEGORIES[product.category];
        if (category && category.subcategories && !category.subcategories.hasOwnProperty(product.subcategory)) {
          issues.push(`Invalid subcategory: ${product.subcategory} for category: ${product.category}`);
        }
      }
      
      if (issues.length > 0) {
        invalidProducts.push({
          productId: product._id,
          productName: product.name,
          issues
        });
      }
    }
    
    if (invalidProducts.length === 0) {
      console.log('✅ All products have valid category data!');
    } else {
      console.log(`❌ Found ${invalidProducts.length} products with invalid category data:`);
      invalidProducts.forEach(product => {
        console.log(`  - Product ${product.productId} (${product.productName}):`);
        product.issues.forEach(issue => {
          console.log(`    * ${issue}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'validate') {
    validateCategoryData()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
      });
  } else {
    migrateCategoryData()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateCategoryData,
  validateCategoryData,
  normalizeCategoryKey,
  normalizeSubcategoryKey
};
