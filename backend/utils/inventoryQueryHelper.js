/**
 * Inventory Query Helper
 * Provides reusable query filters for inventory-aware product queries
 * 
 * Each product type has different inventory concepts:
 * - ready_to_ship: Uses stock field
 * - made_to_order: Uses remainingCapacity field
 * - scheduled_order: Uses availableQuantity field
 */

/**
 * Get inventory-aware query filter for products
 * This ensures products are only shown if they have actual inventory
 * regardless of their status field
 * 
 * @returns {Object} MongoDB query filter
 */
const getInventoryAwareFilter = () => {
  return {
    isActive: { $ne: false },
    $or: [
      // ready_to_ship: has stock
      { productType: 'ready_to_ship', stock: { $gt: 0 } },
      // made_to_order: has remaining capacity
      { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
      // scheduled_order: has available quantity
      { productType: 'scheduled_order', availableQuantity: { $gt: 0 } },
      // Legacy products without productType: check availableQuantity or stock
      { 
        productType: { $exists: false },
        $or: [
          { availableQuantity: { $gt: 0 } },
          { stock: { $gt: 0 } }
        ]
      }
    ]
  };
};

/**
 * Merge inventory filter with additional query conditions
 * 
 * @param {Object} additionalQuery - Additional MongoDB query conditions
 * @returns {Object} Combined MongoDB query filter
 */
const mergeWithInventoryFilter = (additionalQuery = {}) => {
  const inventoryFilter = getInventoryAwareFilter();
  
  // If additionalQuery has $or, we need to use $and
  if (additionalQuery.$or) {
    return {
      $and: [
        inventoryFilter,
        additionalQuery
      ]
    };
  }
  
  // Otherwise, merge directly
  return {
    ...inventoryFilter,
    ...additionalQuery
  };
};

/**
 * Get the correct inventory field name for a product type
 * 
 * @param {string} productType - The product type
 * @returns {string} The inventory field name
 */
const getInventoryField = (productType) => {
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
};

/**
 * Check if a product has inventory based on its type
 * 
 * @param {Object} product - The product document
 * @returns {boolean} True if product has inventory
 */
const hasInventory = (product) => {
  if (!product) return false;
  
  switch (product.productType) {
    case 'ready_to_ship':
      return (product.stock || 0) > 0;
    case 'made_to_order':
      return (product.remainingCapacity || 0) > 0;
    case 'scheduled_order':
      return (product.availableQuantity || 0) > 0;
    default:
      return (product.availableQuantity || 0) > 0 || (product.stock || 0) > 0;
  }
};

/**
 * Get current inventory level for a product
 * 
 * @param {Object} product - The product document
 * @returns {number} Current inventory level
 */
const getInventoryLevel = (product) => {
  if (!product) return 0;
  
  switch (product.productType) {
    case 'ready_to_ship':
      return product.stock || 0;
    case 'made_to_order':
      return product.remainingCapacity || 0;
    case 'scheduled_order':
      return product.availableQuantity || 0;
    default:
      return product.availableQuantity || product.stock || 0;
  }
};

/**
 * Determine correct status based on inventory
 * 
 * @param {Object} product - The product document
 * @returns {string} 'active' or 'out_of_stock'
 */
const getCorrectStatus = (product) => {
  return hasInventory(product) ? 'active' : 'out_of_stock';
};

module.exports = {
  getInventoryAwareFilter,
  mergeWithInventoryFilter,
  getInventoryField,
  hasInventory,
  getInventoryLevel,
  getCorrectStatus
};

