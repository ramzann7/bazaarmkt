/**
 * Inventory Utility Functions
 * Mirrors frontend InventoryModel logic for consistent inventory checking across backend and frontend
 */

/**
 * Check if a product is out of stock based on its product type
 * This mirrors the frontend InventoryModel.isOutOfStock() method
 */
function isOutOfStock(product) {
  if (!product) return true;
  
  switch (product.productType) {
    case 'ready_to_ship':
      return (product.stock || 0) <= 0;
    
    case 'made_to_order':
      return (product.remainingCapacity || 0) <= 0;
    
    case 'scheduled_order':
      return (product.availableQuantity || 0) <= 0;
    
    default:
      // Legacy products without productType - check both fields
      return (product.availableQuantity || 0) <= 0 && (product.stock || 0) <= 0;
  }
}

/**
 * Get MongoDB query conditions for filtering in-stock products
 * Returns an $or array that checks inventory availability for all product types
 */
function getInStockInventoryConditions() {
  return {
    $or: [
      // ready_to_ship: must have stock
      { 
        productType: 'ready_to_ship', 
        stock: { $gt: 0 } 
      },
      // made_to_order: must have remaining capacity
      { 
        productType: 'made_to_order', 
        remainingCapacity: { $gt: 0 } 
      },
      // scheduled_order: must have available quantity
      { 
        productType: 'scheduled_order', 
        availableQuantity: { $gt: 0 } 
      },
      // Legacy products without productType: check both availableQuantity and stock
      { 
        productType: { $exists: false },
        $or: [
          { availableQuantity: { $gt: 0 } },
          { stock: { $gt: 0 } }
        ]
      }
    ]
  };
}

/**
 * Get inventory display information for a product
 * Mirrors frontend InventoryModel.getInventoryDisplayData()
 */
function getInventoryDisplayData(product) {
  if (!product || !product.productType) {
    return null;
  }
  
  switch (product.productType) {
    case 'ready_to_ship':
      return {
        label: 'Stock',
        current: product.stock || 0,
        total: null,
        unit: product.unit || 'units',
        isLow: (product.stock || 0) <= 5,
        lowThreshold: 5,
        available: product.stock || 0
      };

    case 'made_to_order':
      return {
        label: 'Capacity',
        current: product.remainingCapacity || 0,
        total: product.totalCapacity || 0,
        unit: product.unit || 'units',
        isLow: (product.remainingCapacity || 0) <= 1,
        lowThreshold: 1,
        available: product.remainingCapacity || 0,
        period: product.capacityPeriod ? `per ${product.capacityPeriod}` : null
      };

    case 'scheduled_order':
      return {
        label: 'Available',
        current: product.availableQuantity || 0,
        total: null,
        unit: product.unit || 'units',
        isLow: (product.availableQuantity || 0) <= 5,
        lowThreshold: 5,
        available: product.availableQuantity || 0
      };

    default:
      return null;
  }
}

/**
 * Get out of stock status with details
 * Mirrors frontend InventoryModel.getOutOfStockStatus()
 */
function getOutOfStockStatus(product) {
  const isOut = isOutOfStock(product);
  
  if (!isOut) {
    return {
      isOutOfStock: false,
      message: null,
      reason: null
    };
  }

  let message = '';
  let reason = '';

  switch (product.productType) {
    case 'ready_to_ship':
      message = 'Out of Stock';
      reason = 'No items available';
      break;
    
    case 'made_to_order':
      message = 'No Capacity Available';
      reason = 'All production slots are filled';
      break;
    
    case 'scheduled_order':
      message = 'Fully Booked';
      reason = 'All available slots are taken';
      break;
    
    default:
      message = 'Unavailable';
      reason = 'Product not available';
  }

  return {
    isOutOfStock: true,
    message,
    reason
  };
}

/**
 * Get the inventory field name for a product type
 */
function getInventoryFieldName(productType) {
  switch (productType) {
    case 'ready_to_ship':
      return 'stock';
    case 'made_to_order':
      return 'remainingCapacity';
    case 'scheduled_order':
      return 'availableQuantity';
    default:
      return 'availableQuantity';
  }
}

/**
 * Get the current inventory value for a product
 */
function getCurrentInventory(product) {
  if (!product) return 0;
  
  const fieldName = getInventoryFieldName(product.productType);
  return product[fieldName] || 0;
}

/**
 * Validate inventory value based on product type
 */
function validateInventoryValue(product, field, value) {
  const errors = [];

  switch (product.productType) {
    case 'ready_to_ship':
      if (field === 'stock') {
        if (value < 0) errors.push('Stock cannot be negative');
        if (!Number.isInteger(value)) errors.push('Stock must be a whole number');
      }
      break;

    case 'made_to_order':
      if (field === 'totalCapacity') {
        if (value < 0) errors.push('Total capacity cannot be negative');
        if (!Number.isInteger(value)) errors.push('Total capacity must be a whole number');
        if (value < 1) errors.push('Total capacity must be at least 1');
      }
      if (field === 'remainingCapacity') {
        if (value < 0) errors.push('Remaining capacity cannot be negative');
        if (value > (product.totalCapacity || 0)) {
          errors.push('Remaining capacity cannot exceed total capacity');
        }
      }
      break;

    case 'scheduled_order':
      if (field === 'availableQuantity') {
        if (value < 0) errors.push('Available quantity cannot be negative');
        if (!Number.isInteger(value)) errors.push('Available quantity must be a whole number');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Filter array of products to only include in-stock items
 */
function filterInStockProducts(products) {
  return products.filter(product => !isOutOfStock(product));
}

/**
 * Add inventory metadata to products for debugging/logging
 */
function addInventoryMetadata(products) {
  return products.map(product => ({
    ...product,
    inventoryMetadata: {
      isOutOfStock: isOutOfStock(product),
      status: getOutOfStockStatus(product),
      displayData: getInventoryDisplayData(product),
      currentInventory: getCurrentInventory(product),
      inventoryField: getInventoryFieldName(product.productType)
    }
  }));
}

module.exports = {
  isOutOfStock,
  getInStockInventoryConditions,
  getInventoryDisplayData,
  getOutOfStockStatus,
  getInventoryFieldName,
  getCurrentInventory,
  validateInventoryValue,
  filterInStockProducts,
  addInventoryMetadata
};

