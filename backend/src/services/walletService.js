const mongoose = require('mongoose');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const Artisan = require('../models/artisan');
const Order = require('../models/order');

class WalletService {
  /**
   * Get or create wallet for an artisan
   * @param {string} artisanId - The artisan profile ID
   * @returns {Promise<Object>} Wallet object
   */
  static async getOrCreateWallet(artisanId) {
    try {
      // Find the artisan profile to get the user ID
      const artisanProfile = await Artisan.findById(artisanId);
      if (!artisanProfile) {
        throw new Error('Artisan profile not found');
      }

      // Find or create wallet for the user
      let wallet = await Wallet.findOne({ artisanId: artisanProfile.user });
      if (!wallet) {
        wallet = new Wallet({
          artisanId: artisanProfile.user,
          balance: 0,
          currency: 'CAD',
          isActive: true
        });
        await wallet.save();
        console.log(`✅ Created new wallet for artisan ${artisanProfile.artisanName}: ${wallet._id}`);
      }

      return wallet;
    } catch (error) {
      console.error('Error getting/creating wallet:', error);
      throw error;
    }
  }

  /**
   * Credit wallet with revenue from order delivery
   * @param {string} orderId - The order ID
   * @param {number} platformFeeRate - Platform fee rate (default 0.10 for 10%)
   * @returns {Promise<Object>} Transaction result
   */
  static async creditOrderRevenue(orderId, platformFeeRate = 0.10) {
    try {
      console.log(`💰 Processing wallet credit for order ${orderId}`);
      
      // Get the order with populated artisan
      const order = await Order.findById(orderId).populate('artisan');
      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.artisan) {
        throw new Error('Order has no artisan information');
      }

      // Calculate financial breakdown
      const grossAmount = order.totalAmount;
      const platformFee = grossAmount * platformFeeRate;
      const netAmount = grossAmount - platformFee;

      console.log(`  Gross amount: ${grossAmount} CAD`);
      console.log(`  Platform fee (${platformFeeRate * 100}%): ${platformFee} CAD`);
      console.log(`  Net amount to artisan: ${netAmount} CAD`);

      // Get or create wallet
      const wallet = await this.getOrCreateWallet(order.artisan._id);
      console.log(`  Wallet ID: ${wallet._id}, Current balance: ${wallet.balance} CAD`);

      // Create revenue transaction
      const transaction = await WalletTransaction.createRevenueTransaction(
        wallet._id,
        wallet.artisanId,
        order._id,
        grossAmount,
        platformFee
      );
      console.log(`  Transaction created: ${transaction._id}`);

      // Add funds to wallet
      const balanceBefore = wallet.balance;
      await wallet.addFunds(netAmount, 'revenue');
      console.log(`  Balance updated: ${balanceBefore} → ${wallet.balance} CAD`);

      // Update transaction with actual balances
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = wallet.balance;
      await transaction.save();

      console.log(`✅ Successfully credited wallet for order ${orderId}: ${netAmount} CAD`);

      return {
        success: true,
        walletId: wallet._id,
        transactionId: transaction._id,
        grossAmount,
        platformFee,
        netAmount,
        balanceBefore,
        balanceAfter: wallet.balance
      };
    } catch (error) {
      console.error('❌ Error crediting order revenue:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance and transaction history
   * @param {string} artisanId - The artisan profile ID
   * @param {number} limit - Number of transactions to return (default 50)
   * @returns {Promise<Object>} Wallet information
   */
  static async getWalletInfo(artisanId, limit = 50) {
    try {
      const wallet = await this.getOrCreateWallet(artisanId);
      
      // Get recent transactions
      const transactions = await WalletTransaction.find({ walletId: wallet._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('referenceId', 'name totalAmount status');

      // Calculate summary statistics
      const totalEarnings = await WalletTransaction.aggregate([
        { $match: { walletId: wallet._id, type: 'revenue' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalPayouts = await WalletTransaction.aggregate([
        { $match: { walletId: wallet._id, type: 'payout' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalSpent = await WalletTransaction.aggregate([
        { $match: { walletId: wallet._id, type: 'purchase' } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
      ]);

      return {
        wallet: {
          id: wallet._id,
          balance: wallet.balance,
          currency: wallet.currency,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt
        },
        summary: {
          totalEarnings: totalEarnings[0]?.total || 0,
          totalPayouts: totalPayouts[0]?.total || 0,
          totalSpent: totalSpent[0]?.total || 0,
          availableBalance: wallet.balance
        },
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          formattedAmount: t.getFormattedAmount(),
          description: t.description,
          status: t.status,
          createdAt: t.createdAt,
          balanceAfter: t.balanceAfter,
          reference: t.reference
        }))
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      throw error;
    }
  }

  /**
   * Deduct funds from wallet (for purchases, fees, etc.)
   * @param {string} artisanId - The artisan profile ID
   * @param {number} amount - Amount to deduct
   * @param {string} type - Transaction type
   * @param {string} description - Transaction description
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Transaction result
   */
  static async deductFunds(artisanId, amount, type, description, metadata = {}) {
    try {
      const wallet = await this.getOrCreateWallet(artisanId);
      
      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Create transaction
      const transaction = new WalletTransaction({
        walletId: wallet._id,
        artisanId: wallet.artisanId,
        type,
        amount: -amount, // Negative for debit
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        description,
        metadata,
        status: 'completed'
      });

      // Deduct funds from wallet
      await wallet.deductFunds(amount, type);
      await transaction.save();

      console.log(`✅ Deducted ${amount} CAD from wallet ${wallet._id}`);

      return {
        success: true,
        walletId: wallet._id,
        transactionId: transaction._id,
        amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter
      };
    } catch (error) {
      console.error('Error deducting funds:', error);
      throw error;
    }
  }

  /**
   * Add funds to wallet (for top-ups, refunds, etc.)
   * @param {string} artisanId - The artisan profile ID
   * @param {number} amount - Amount to add
   * @param {string} type - Transaction type
   * @param {string} description - Transaction description
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Transaction result
   */
  static async addFunds(artisanId, amount, type, description, metadata = {}) {
    try {
      const wallet = await this.getOrCreateWallet(artisanId);

      // Create transaction
      const transaction = new WalletTransaction({
        walletId: wallet._id,
        artisanId: wallet.artisanId,
        type,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount,
        description,
        metadata,
        status: 'completed'
      });

      // Add funds to wallet
      await wallet.addFunds(amount, type);
      await transaction.save();

      console.log(`✅ Added ${amount} CAD to wallet ${wallet._id}`);

      return {
        success: true,
        walletId: wallet._id,
        transactionId: transaction._id,
        amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter
      };
    } catch (error) {
      console.error('Error adding funds:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance for an artisan
   * @param {string} artisanId - The artisan profile ID
   * @returns {Promise<number>} Current balance
   */
  static async getBalance(artisanId) {
    try {
      const wallet = await this.getOrCreateWallet(artisanId);
      return wallet.balance;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Check if wallet has sufficient balance
   * @param {string} artisanId - The artisan profile ID
   * @param {number} amount - Amount to check
   * @returns {Promise<boolean>} True if sufficient balance
   */
  static async hasSufficientBalance(artisanId, amount) {
    try {
      const wallet = await this.getOrCreateWallet(artisanId);
      return wallet.hasSufficientBalance(amount);
    } catch (error) {
      console.error('Error checking balance:', error);
      throw error;
    }
  }

  /**
   * Debit wallet for purchases (spotlight, promotional features, etc.)
   * @param {string} userId - The user ID (not artisan profile ID)
   * @param {number} amount - Amount to debit
   * @param {string} type - Transaction type (e.g., 'spotlight_purchase', 'promotional_feature')
   * @param {Object} metadata - Additional transaction metadata
   * @returns {Promise<Object>} Transaction result
   */
  static async debitWallet(userId, amount, type, metadata = {}) {
    try {
      console.log(`💳 Processing wallet debit for user ${userId}: ${amount} CAD for ${type}`);
      
      // Find or create wallet for the user
      let wallet = await Wallet.findOne({ artisanId: userId });
      if (!wallet) {
        wallet = new Wallet({
          artisanId: userId,
          balance: 0,
          currency: 'CAD',
          isActive: true
        });
        await wallet.save();
        console.log(`✅ Created new wallet for user ${userId}: ${wallet._id}`);
      }

      // Check if wallet has sufficient balance
      if (!wallet.hasSufficientBalance(amount)) {
        throw new Error(`Insufficient balance. Current: ${wallet.balance} CAD, Required: ${amount} CAD`);
      }

      // Create transaction record
      const transaction = new WalletTransaction({
        walletId: wallet._id,
        type,
        amount: -amount, // Negative amount for debit
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        status: 'completed',
        metadata: {
          ...metadata,
          debitReason: type,
          timestamp: new Date()
        }
      });

      // Deduct funds from wallet
      await wallet.deductFunds(amount, type);
      await transaction.save();

      console.log(`✅ Debited ${amount} CAD from wallet ${wallet._id} for ${type}`);

      return {
        success: true,
        walletId: wallet._id,
        transactionId: transaction._id,
        amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
        transaction
      };
    } catch (error) {
      console.error('Error debiting wallet:', error);
      throw error;
    }
  }
}

module.exports = WalletService;
