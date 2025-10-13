# Inventory Consistency Guide

## Overview

This guide documents how inventory is handled consistently across backend and frontend to ensure that out-of-stock products are properly filtered in search results and throughout the application.

## Product Types and Inventory Fields

Each product type uses different fields to track inventory:

### 1. Ready to Ship (`ready_to_ship`)
- **Inventory Field**: `stock`
- **Logic**: Product is in stock if `stock > 0`
- **Display**: "Stock: X units"
- **Out of Stock When**: `stock <= 0`

### 2. Made to Order (`made_to_order`)
- **Inventory Fields**: `totalCapacity` and `remainingCapacity`
- **Logic**: Product is available if `remainingCapacity > 0`
- **Display**: "Capacity: X / Y per period"
- **Out of Stock When**: `remainingCapacity <= 0`
- **Note**: Capacity represents production slots, not physical inventory

### 3. Scheduled Order (`scheduled_order`)
- **Inventory Field**: `availableQuantity`
- **Logic**: Product is available if `availableQuantity > 0`
- **Display**: "Available: X units"
- **Out of Stock When**: `availableQuantity <= 0`
- **Note**: Represents pre-allocated quantities for specific dates

### 4. Legacy Products (no `productType` field)
- **Fallback Logic**: Check both `availableQuantity > 0` OR `stock > 0`
- **Used For**: Products created before product type system

## Backend Implementation

### Inventory Utility (`backend/utils/inventoryUtils.js`)

Provides centralized inventory logic that mirrors the frontend InventoryModel:

```javascript
const { getInStockInventoryConditions } = require('../utils/inventoryUtils');

// In your MongoDB query:
const query = {
  isActive: { $ne: false },
  ...getInStockInventoryConditions()
};
```

The `getInStockInventoryConditions()` function returns:

```javascript
{
  $or: [
    // ready_to_ship: must have stock
    { productType: 'ready_to_ship', stock: { $gt: 0 } },
    
    // made_to_order: must have remaining capacity
    { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
    
    // scheduled_order: must have available quantity
    { productType: 'scheduled_order', availableQuantity: { $gt: 0 } },
    
    // Legacy: check both fields
    { 
      productType: { $exists: false },
      $or: [
        { availableQuantity: { $gt: 0 } },
        { stock: { $gt: 0 } }
      ]
    }
  ]
}
```

### Search Endpoints

Both `getProducts()` and `enhancedSearch()` endpoints now use this utility:

```javascript
const query = {
  isActive: { $ne: false },
  ...getInStockInventoryConditions()
};

// Combine with search filters
const andConditions = [];
if (req.query.search) {
  andConditions.push({
    $text: { $search: req.query.search }
  });
}

if (andConditions.length > 0) {
  query.$and = andConditions;
}
```

## Frontend Implementation

### InventoryModel (`frontend/src/models/InventoryModel.js`)

The frontend InventoryModel provides the same logic:

```javascript
import InventoryModel from '../models/InventoryModel';

const inventoryModel = new InventoryModel(product);

// Check if out of stock
if (inventoryModel.isOutOfStock()) {
  // Product is not available
}

// Get detailed status
const status = inventoryModel.getOutOfStockStatus();
// Returns: { isOutOfStock: boolean, message: string, reason: string }
```

### Search Results Filtering

The SearchResults component filters products using InventoryModel:

```javascript
const filterInStockProducts = (products) => {
  return products.filter(product => {
    const inventoryModel = new InventoryModel(product);
    const outOfStockStatus = inventoryModel.getOutOfStockStatus();
    return !outOfStockStatus.isOutOfStock;
  });
};
```

## Query Structure Best Practices

### ✅ Correct: Using $and for Multiple Conditions

```javascript
const query = {
  isActive: { $ne: false },
  ...getInStockInventoryConditions()
};

// Add search/filters via $and array
const andConditions = [];
if (searchQuery) {
  andConditions.push({ $text: { $search: searchQuery } });
}
if (category) {
  andConditions.push({ category });
}

if (andConditions.length > 0) {
  query.$and = andConditions;
}
```

### ❌ Incorrect: Directly Adding to Query

```javascript
// DON'T DO THIS - conflicts with existing $or
const query = { isActive: { $ne: false }, $or: [...] };
query.$text = { $search: searchQuery };  // May not work as expected
```

## Debugging Inventory Issues

### Backend Logging

The search endpoints now log detailed inventory information:

```
📦 Found 2 products for search: "table"
   ✅ 1. Wooden Dining Table
      Type: ready_to_ship
      Stock: 5, Capacity: 0, Qty: 0
      Status: In Stock
   ❌ 2. Custom Table
      Type: ready_to_ship
      Stock: 0, Capacity: 0, Qty: 0
      Status: Out of Stock
```

### Check Backend Query

Enable query logging to see what MongoDB is executing:

```javascript
// In products route
console.log('🔍 Search query:', JSON.stringify(query, null, 2));
```

### Check Frontend Filtering

Add logging to see what's being filtered:

```javascript
console.log('Before filter:', products.length);
const inStock = filterInStockProducts(products);
console.log('After filter:', inStock.length);
```

## Common Issues and Solutions

### Issue 1: Products Found but Not Displayed

**Symptoms**: Backend returns products, frontend shows empty results

**Causes**:
1. Product has `stock: 0`, `remainingCapacity: 0`, or `availableQuantity: 0`
2. Frontend filtering removing backend results
3. Mismatch between backend query and frontend filter

**Solution**:
- Verify inventory values in database
- Ensure backend uses `getInStockInventoryConditions()`
- Check backend logs for inventory status

### Issue 2: Legacy Products Not Appearing

**Symptoms**: Old products missing from search

**Cause**: Products without `productType` field

**Solution**:
- Backend automatically handles via fallback logic
- Migrate old products to have `productType` field:

```javascript
db.products.updateMany(
  { productType: { $exists: false } },
  { $set: { productType: 'ready_to_ship' } }
);
```

### Issue 3: Made-to-Order Products Always Out of Stock

**Symptoms**: Products with capacity showing as unavailable

**Cause**: `remainingCapacity` not set or zero

**Solution**:
- Check `totalCapacity` is set
- Verify `remainingCapacity` is calculated correctly
- Formula: `remainingCapacity = totalCapacity - ordersCount`

### Issue 4: Text Search Not Respecting Inventory

**Symptoms**: Search returns out-of-stock products

**Cause**: Query structure doesn't properly combine $text with $or inventory conditions

**Solution**:
- Use $and array for combining conditions
- Apply pattern shown in "Query Structure Best Practices"

## Testing Inventory Logic

### Backend Test

```javascript
const { isOutOfStock, getOutOfStockStatus } = require('./utils/inventoryUtils');

// Test ready_to_ship
const product1 = { productType: 'ready_to_ship', stock: 5 };
console.log(isOutOfStock(product1)); // false

const product2 = { productType: 'ready_to_ship', stock: 0 };
console.log(isOutOfStock(product2)); // true

// Test made_to_order
const product3 = { productType: 'made_to_order', remainingCapacity: 3 };
console.log(isOutOfStock(product3)); // false
```

### Frontend Test

```javascript
import InventoryModel from './models/InventoryModel';

const product = {
  productType: 'ready_to_ship',
  stock: 0
};

const model = new InventoryModel(product);
console.log(model.isOutOfStock()); // true
console.log(model.getOutOfStockStatus());
// { isOutOfStock: true, message: 'Out of Stock', reason: 'No items available' }
```

## Database Migrations

### Add Product Type to Legacy Products

```javascript
// For products that are clearly ready-to-ship
db.products.updateMany(
  { 
    productType: { $exists: false },
    stock: { $exists: true }
  },
  { 
    $set: { productType: 'ready_to_ship' }
  }
);

// For products with capacity fields
db.products.updateMany(
  { 
    productType: { $exists: false },
    totalCapacity: { $exists: true }
  },
  { 
    $set: { productType: 'made_to_order' }
  }
);
```

### Fix Zero Inventory Products

```javascript
// Products that should be inactive if out of stock
db.products.updateMany(
  {
    productType: 'ready_to_ship',
    stock: { $lte: 0 },
    isActive: true
  },
  {
    $set: { isActive: false }
  }
);
```

## Monitoring

### Key Metrics to Track

1. **Search Success Rate**: % of searches returning results
2. **Zero Result Searches**: Searches returning no products
3. **Inventory Accuracy**: Products displayed vs actually available
4. **Filter Consistency**: Backend results vs frontend display

### Add to Analytics

```javascript
// Track inventory-related metrics
{
  searchQuery: 'table',
  productsFound: 5,
  inStockProducts: 3,
  outOfStockFiltered: 2,
  displayedToUser: 3
}
```

## Summary

**Key Principles:**

1. ✅ **Single Source of Truth**: `inventoryUtils.js` defines inventory logic
2. ✅ **Consistent Logic**: Backend and frontend use same rules
3. ✅ **Type-Specific**: Each product type has appropriate inventory check
4. ✅ **Query Structure**: Use `$and` to combine `$text` search with inventory `$or` conditions
5. ✅ **Defensive Coding**: Handle legacy products without `productType`

**Files to Review:**

- Backend: `backend/utils/inventoryUtils.js`
- Backend: `backend/routes/products/index.js`
- Frontend: `frontend/src/models/InventoryModel.js`
- Frontend: `frontend/src/components/SearchResults.jsx`

---

**Last Updated**: October 2025  
**Status**: Production Ready
