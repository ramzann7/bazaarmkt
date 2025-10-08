/**
 * Wallet Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 * Updated to use service layer
 */

const { ObjectId } = require('mongodb');
const { catchAsync } = require('../../middleware/errorHandler');
const { createWalletService } = require('../../services');

/**
 * Get user's wallet balance
 */
const getWalletBalance = catchAsync(async (req, res) => {
  const walletService = await createWalletService();
  const balance = await walletService.getWalletBalance(req.user.userId);
  
  res.json({
    success: true,
    data: balance
  });
});

module.exports = {
  getWalletBalance
};
