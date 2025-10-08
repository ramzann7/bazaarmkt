/**
 * Inventory Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 * Updated to use service layer
 */

const { catchAsync } = require('../../middleware/errorHandler');
const { createInventoryService } = require('../../services');

/**
 * Manual inventory restoration
 */
const restoreInventory = catchAsync(async (req, res) => {
  const inventoryService = await createInventoryService();
  const result = await inventoryService.restoreInventory(req.body.productId, req.user.userId);
  
  res.json({
    success: true,
    message: result.message,
    data: {
      productId: result.productId,
      status: result.status,
      restoredAt: result.restoredAt
    }
  });
});

/**
 * Check restoration status for specific product
 */
const checkRestorationStatus = catchAsync(async (req, res) => {
  const inventoryService = await createInventoryService();
  const result = await inventoryService.getRestorationStatus(req.params.productId);
  
  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  restoreInventory,
  checkRestorationStatus
};
