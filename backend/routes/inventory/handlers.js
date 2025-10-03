/**
 * Inventory Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 */

const { catchAsync } = require('../../middleware/errorHandler');
const InventoryRestorationService = require('../../services/inventoryRestorationService');

/**
 * Manual inventory restoration
 */
const restoreInventory = catchAsync(async (req, res) => {
  const db = req.db;
  const restorationService = new InventoryRestorationService(db);
  
  console.log('🔄 Manual inventory restoration triggered by user:', req.user.userId);
  
  const result = await restorationService.processAllRestorations();
  
  res.json({
    success: true,
    message: `Successfully restored ${result.total} product(s)`,
    data: result
  });
});

/**
 * Check restoration status for specific product
 */
const checkRestorationStatus = catchAsync(async (req, res) => {
  const db = req.db;
  const { productId } = req.params;
  const restorationService = new InventoryRestorationService(db);
  
  const status = await restorationService.checkProductRestorationStatus(productId);
  
  res.json({
    success: true,
    data: status
  });
});

module.exports = {
  restoreInventory,
  checkRestorationStatus
};
