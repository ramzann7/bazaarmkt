/**
 * Wallet Service
 * Handles wallet balance, transactions, and payment processing
 */

const BaseService = require('./BaseService');

class WalletService extends BaseService {
  constructor(db) {
    super(db);
    this.usersCollection = 'users';
    this.transactionsCollection = 'transactions';
  }

  /**
   * Get wallet balance for user
   */
  async getWalletBalance(userId) {
    const user = await this.findById(this.usersCollection, userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      balance: user.walletBalance || 0,
      currency: 'CAD',
      lastUpdated: user.updatedAt || user.createdAt
    };
  }

  /**
   * Add funds to wallet
   */
  async addFunds(userId, amount, paymentMethod = 'credit_card', metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Update user wallet balance
    const result = await this.getCollection(this.usersCollection).updateOne(
      { _id: this.createObjectId(userId) },
      { 
        $inc: { walletBalance: amount },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    
    // Determine transaction type and description based on payment method
    let transactionType = 'wallet_topup';
    let description = `Wallet top-up of $${amount.toFixed(2)}`;
    
    if (paymentMethod === 'order_completion') {
      transactionType = 'order_revenue';
      const orderNumber = metadata?.orderNumber || 'Unknown';
      description = `Revenue from order #${orderNumber} - $${amount.toFixed(2)}`;
    }
    
    // Create transaction record
    const transaction = await this.create(this.transactionsCollection, {
      userId: this.createObjectId(userId),
      type: transactionType,
      amount: amount,
      description: description,
      paymentMethod: paymentMethod,
      status: 'completed',
      metadata: {
        ...metadata,
        transactionType: transactionType
      }
    });
    
    // Get updated balance
    const updatedUser = await this.findById(this.usersCollection, userId);
    
    return {
      transactionId: transaction.insertedId,
      amount: amount,
      newBalance: updatedUser.walletBalance,
      paymentMethod: paymentMethod
    };
  }

  /**
   * Deduct funds from wallet
   */
  async deductFunds(userId, amount, description, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check current balance
    const user = await this.findById(this.usersCollection, userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const currentBalance = user.walletBalance || 0;
    if (currentBalance < amount) {
      throw new Error(`Insufficient funds. Current balance: $${currentBalance}, Required: $${amount}`);
    }
    
    // Update user wallet balance
    await this.getCollection(this.usersCollection).updateOne(
      { _id: this.createObjectId(userId) },
      { 
        $inc: { walletBalance: -amount },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Create transaction record
    const transaction = await this.create(this.transactionsCollection, {
      userId: this.createObjectId(userId),
      type: 'wallet_deduction',
      amount: -amount,
      description: description,
      paymentMethod: 'wallet',
      status: 'completed',
      metadata: {
        ...metadata,
        deductionAmount: amount
      }
    });
    
    return {
      transactionId: transaction.insertedId,
      amount: amount,
      newBalance: currentBalance - amount,
      description: description
    };
  }

  /**
   * Transfer funds between users
   */
  async transferFunds(fromUserId, toUserId, amount, description, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    if (fromUserId === toUserId) {
      throw new Error('Cannot transfer funds to yourself');
    }
    
    // Check sender balance
    const fromUser = await this.findById(this.usersCollection, fromUserId);
    if (!fromUser) {
      throw new Error('Sender not found');
    }
    
    const currentBalance = fromUser.walletBalance || 0;
    if (currentBalance < amount) {
      throw new Error(`Insufficient funds. Current balance: $${currentBalance}, Required: $${amount}`);
    }
    
    // Check receiver exists
    const toUser = await this.findById(this.usersCollection, toUserId);
    if (!toUser) {
      throw new Error('Receiver not found');
    }
    
    // Perform transfer
    await Promise.all([
      // Deduct from sender
      this.getCollection(this.usersCollection).updateOne(
        { _id: this.createObjectId(fromUserId) },
        { 
          $inc: { walletBalance: -amount },
          $set: { updatedAt: new Date() }
        }
      ),
      // Add to receiver
      this.getCollection(this.usersCollection).updateOne(
        { _id: this.createObjectId(toUserId) },
        { 
          $inc: { walletBalance: amount },
          $set: { updatedAt: new Date() }
        }
      )
    ]);
    
    // Create transaction records
    const [senderTransaction, receiverTransaction] = await Promise.all([
      this.create(this.transactionsCollection, {
        userId: this.createObjectId(fromUserId),
        type: 'wallet_transfer_out',
        amount: -amount,
        description: `Transfer to ${toUser.firstName} ${toUser.lastName}: ${description}`,
        paymentMethod: 'wallet',
        status: 'completed',
        metadata: {
          ...metadata,
          toUserId: toUserId,
          transferAmount: amount
        }
      }),
      this.create(this.transactionsCollection, {
        userId: this.createObjectId(toUserId),
        type: 'wallet_transfer_in',
        amount: amount,
        description: `Transfer from ${fromUser.firstName} ${fromUser.lastName}: ${description}`,
        paymentMethod: 'wallet',
        status: 'completed',
        metadata: {
          ...metadata,
          fromUserId: fromUserId,
          transferAmount: amount
        }
      })
    ]);
    
    return {
      transferId: senderTransaction.insertedId,
      amount: amount,
      fromUserId: fromUserId,
      toUserId: toUserId,
      fromNewBalance: currentBalance - amount,
      toNewBalance: (toUser.walletBalance || 0) + amount,
      description: description
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId, options = {}) {
    const { limit = 20, offset = 0, type, startDate, endDate } = options;
    
    const query = { userId: this.createObjectId(userId) };
    
    if (type) {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await this.aggregate(this.transactionsCollection, [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) }
    ]);
    
    return {
      transactions,
      count: transactions.length
    };
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId) {
    const [balance, totalTopups, totalSpent, transactionCount] = await Promise.all([
      this.getWalletBalance(userId),
      this.aggregate(this.transactionsCollection, [
        { $match: { userId: this.createObjectId(userId), type: 'wallet_topup' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      this.aggregate(this.transactionsCollection, [
        { $match: { userId: this.createObjectId(userId), amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
      ]),
      this.count(this.transactionsCollection, { userId: this.createObjectId(userId) })
    ]);
    
    return {
      currentBalance: balance.balance,
      totalTopups: totalTopups[0]?.total || 0,
      totalSpent: totalSpent[0]?.total || 0,
      transactionCount,
      currency: balance.currency
    };
  }

  /**
   * Process payment
   */
  async processPayment(userId, amount, description, paymentMethod = 'wallet', metadata = {}) {
    if (paymentMethod === 'wallet') {
      return await this.deductFunds(userId, amount, description, metadata);
    } else {
      // For other payment methods, create a pending transaction
      const transaction = await this.create(this.transactionsCollection, {
        userId: this.createObjectId(userId),
        type: 'payment',
        amount: -amount,
        description: description,
        paymentMethod: paymentMethod,
        status: 'pending',
        metadata: {
          ...metadata,
          paymentAmount: amount
        }
      });
      
      return {
        transactionId: transaction.insertedId,
        amount: amount,
        status: 'pending',
        paymentMethod: paymentMethod,
        description: description
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, userId, reason = 'Refund') {
    const transaction = await this.findById(this.transactionsCollection, transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized refund request');
    }
    
    if (transaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }
    
    const refundAmount = Math.abs(transaction.amount);
    
    // Add funds back to wallet
    await this.getCollection(this.usersCollection).updateOne(
      { _id: this.createObjectId(userId) },
      { 
        $inc: { walletBalance: refundAmount },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Create refund transaction
    const refundTransaction = await this.create(this.transactionsCollection, {
      userId: this.createObjectId(userId),
      type: 'refund',
      amount: refundAmount,
      description: `Refund: ${reason}`,
      paymentMethod: 'wallet',
      status: 'completed',
      metadata: {
        originalTransactionId: transactionId,
        refundReason: reason,
        refundAmount: refundAmount
      }
    });
    
    return {
      refundId: refundTransaction.insertedId,
      amount: refundAmount,
      reason: reason,
      originalTransactionId: transactionId
    };
  }

  /**
   * Process order completion revenue recognition
   * Credits artisan wallet and creates transaction/revenue records
   */
  async processOrderCompletion(orderData, db) {
    try {
      console.log('💰 Processing order completion revenue recognition for order:', orderData._id);
      
      // Get platform settings for fee calculations
      const platformSettingsService = require('./platformSettingsService');
      const settingsService = new platformSettingsService(db);
      const settings = await settingsService.getPlatformSettings();
      
      // Calculate revenue components
      const orderSubtotal = orderData.subtotal || orderData.totalAmount || 0;
      const deliveryFee = orderData.deliveryFee || 0;
      const totalRevenue = orderSubtotal + deliveryFee;
      
      // Calculate platform fee (percentage of revenue)
      const platformFeeRate = (settings.platformFeePercentage || 10) / 100;
      const platformFee = totalRevenue * platformFeeRate;
      
      // Calculate payment processing fee (Stripe fee)
      const paymentProcessingFeeRate = (settings.paymentProcessingFee || 2.9) / 100;
      const paymentProcessingFee = totalRevenue * paymentProcessingFeeRate;
      
      // Calculate net earnings for artisan
      const netEarnings = totalRevenue - platformFee - paymentProcessingFee;
      
      console.log('💰 Revenue breakdown:', {
        orderId: orderData._id,
        subtotal: orderSubtotal,
        deliveryFee: deliveryFee,
        totalRevenue: totalRevenue,
        platformFee: platformFee,
        paymentProcessingFee: paymentProcessingFee,
        netEarnings: netEarnings
      });
      
      // Get the user ID from the artisan record
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ 
        _id: this.createObjectId(orderData.artisan) 
      });
      
      if (!artisan || !artisan.user) {
        throw new Error(`Artisan user not found for artisan ID: ${orderData.artisan}`);
      }
      
      const artisanUserId = artisan.user.toString();
      console.log('💰 Crediting wallet for artisan user:', artisanUserId);
      
      // Credit artisan wallet with net earnings
      const walletResult = await this.addFunds(
        artisanUserId,
        netEarnings,
        'order_completion',
        {
          orderId: orderData._id,
          orderNumber: orderData._id.toString().slice(-8),
          revenueBreakdown: {
            subtotal: orderSubtotal,
            deliveryFee: deliveryFee,
            totalRevenue: totalRevenue,
            platformFee: platformFee,
            paymentProcessingFee: paymentProcessingFee,
            netEarnings: netEarnings
          },
          completionType: 'order_completed'
        }
      );
      
      // Create revenue record
      const revenueRecord = await this.create('revenues', {
        orderId: this.createObjectId(orderData._id),
        artisanId: this.createObjectId(orderData.artisan),
        revenue: {
          subtotal: orderSubtotal,
          deliveryFee: deliveryFee,
          totalRevenue: totalRevenue,
          platformFee: platformFee,
          paymentProcessingFee: paymentProcessingFee,
          netEarnings: netEarnings
        },
        fees: {
          platformFeeRate: platformFeeRate,
          platformFeeAmount: platformFee,
          paymentProcessingFeeRate: paymentProcessingFeeRate,
          paymentProcessingFeeAmount: paymentProcessingFee
        },
        orderDetails: {
          orderNumber: orderData._id.toString().slice(-8),
          totalAmount: orderData.totalAmount,
          deliveryMethod: orderData.deliveryMethod,
          status: orderData.status,
          completedAt: new Date()
        },
        transactionId: walletResult.transactionId,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Order completion revenue processed:', {
        orderId: orderData._id,
        artisanId: orderData.artisan,
        netEarnings: netEarnings,
        transactionId: walletResult.transactionId,
        revenueId: revenueRecord.insertedId
      });
      
      return {
        success: true,
        data: {
          orderId: orderData._id,
          artisanId: orderData.artisan,
          revenue: {
            subtotal: orderSubtotal,
            deliveryFee: deliveryFee,
            totalRevenue: totalRevenue,
            platformFee: platformFee,
            paymentProcessingFee: paymentProcessingFee,
            netEarnings: netEarnings
          },
          walletTransaction: walletResult,
          revenueRecord: {
            id: revenueRecord.insertedId,
            orderId: orderData._id,
            artisanId: orderData.artisan
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error processing order completion revenue:', error);
      throw error;
    }
  }

  /**
   * Get wallet analytics
   */
  async getWalletAnalytics() {
    const [totalUsers, totalBalance, totalTransactions, topUsers] = await Promise.all([
      this.count(this.usersCollection, { walletBalance: { $exists: true } }),
      this.aggregate(this.usersCollection, [
        { $match: { walletBalance: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$walletBalance' } } }
      ]),
      this.count(this.transactionsCollection),
      this.aggregate(this.usersCollection, [
        { $match: { walletBalance: { $gt: 0 } } },
        { $sort: { walletBalance: -1 } },
        { $limit: 10 },
        { $project: { firstName: 1, lastName: 1, walletBalance: 1, email: 1 } }
      ])
    ]);
    
    return {
      totalUsers: totalUsers,
      totalBalance: totalBalance[0]?.total || 0,
      totalTransactions: totalTransactions,
      topUsers: topUsers
    };
  }
}

module.exports = WalletService;
