/**
 * Wallet Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 */

const { ObjectId } = require('mongodb');
const { catchAsync } = require('../../middleware/errorHandler');

/**
 * Get user's wallet balance
 */
const getWalletBalance = catchAsync(async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  
  // Get user's wallet balance from users collection
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const balance = user.walletBalance || 0;
  
  res.json({
    success: true,
    data: { balance }
  });
});

module.exports = {
  getWalletBalance
};
