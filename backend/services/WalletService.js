/**
 * Wallet Service
 * Handles wallet balance, transactions, and payment processing
 */

const BaseService = require('./BaseService');

class WalletService extends BaseService {
  constructor(db) {
    super(db);
    this.walletsCollection = 'wallets';
    this.transactionsCollection = 'wallettransactions';
    this.usersCollection = 'users';
  }

  /**
   * Get wallet balance for user
   */
  async getWalletBalance(userId) {
    // Try to find wallet by userId first (new format)
    let wallet = await this.getCollection(this.walletsCollection).findOne({ 
      userId: this.createObjectId(userId) 
    });
    
    // If not found, try by artisanId (legacy format)
    if (!wallet) {
      // Get artisan ID for this user
      const artisansCollection = this.getCollection('artisans');
      const artisan = await artisansCollection.findOne({ 
        user: this.createObjectId(userId) 
      });
      
      if (artisan) {
        // Try to find wallet by artisanId
        wallet = await this.getCollection(this.walletsCollection).findOne({ 
          artisanId: artisan._id 
        });
        
        // If found with artisanId, migrate it to use userId
        if (wallet) {
          console.log('🔄 Migrating wallet from artisanId to userId format for user:', userId);
          await this.getCollection(this.walletsCollection).updateOne(
            { _id: wallet._id },
            { 
              $set: { 
                userId: this.createObjectId(userId),
                updatedAt: new Date()
              }
            }
          );
          wallet.userId = this.createObjectId(userId);
        }
      }
    }
    
    // If wallet still doesn't exist, create it
    if (!wallet) {
      const user = await this.findById(this.usersCollection, userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      console.log('🆕 Creating new wallet for user:', userId);
      
      // Get platform settings for payout configuration
      const PlatformSettingsService = require('./platformSettingsService');
      const platformSettingsService = new PlatformSettingsService(this.db);
      const platformSettings = await platformSettingsService.getPlatformSettings();
      
      wallet = {
        userId: this.createObjectId(userId),
        balance: 0,
        currency: platformSettings.currency || 'CAD',
        stripeCustomerId: null,
        stripeAccountId: null,
        payoutSettings: {
          enabled: false,
          method: 'bank_transfer',
          bankAccount: null,
          schedule: platformSettings.payoutSettings?.payoutFrequency || 'weekly',
          minimumPayout: platformSettings.payoutSettings?.minimumPayoutAmount || 25,
          payoutDelay: platformSettings.payoutSettings?.payoutDelay || 7,
          lastPayoutDate: null,
          nextPayoutDate: null
        },
        metadata: {
          totalEarnings: 0,
          totalSpent: 0,
          totalPayouts: 0,
          platformFees: 0
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.getCollection(this.walletsCollection).insertOne(wallet);
      console.log('✅ Wallet created with platform settings:', {
        minimumPayout: wallet.payoutSettings.minimumPayout,
        schedule: wallet.payoutSettings.schedule,
        currency: wallet.currency
      });
    }
    
    return {
      balance: wallet.balance || 0,
      currency: wallet.currency || 'CAD',
      stripeCustomerId: wallet.stripeCustomerId,
      stripeAccountId: wallet.stripeAccountId,
      payoutSettings: wallet.payoutSettings || {
        method: 'bank_transfer',
        bankAccount: null,
        schedule: 'weekly',
        enabled: false,
        minimumPayout: 50
      },
      lastUpdated: wallet.updatedAt || wallet.createdAt
    };
  }

  /**
   * Add funds to wallet
   */
  async addFunds(userId, amount, paymentMethod = 'credit_card', metadata = {}) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Ensure wallet exists
    await this.getWalletBalance(userId);
    
    // Update wallet balance
    const result = await this.getCollection(this.walletsCollection).updateOne(
      { userId: this.createObjectId(userId) },
      { 
        $inc: { balance: amount },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('Wallet not found');
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
    const updatedWallet = await this.getCollection(this.walletsCollection).findOne({ 
      userId: this.createObjectId(userId) 
    });
    
    return {
      transactionId: transaction.insertedId,
      transaction: {
        id: transaction.insertedId,
        amount: amount,
        type: transactionType
      },
      amount: amount,
      newBalance: updatedWallet.balance,
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
    const walletData = await this.getWalletBalance(userId);
    const currentBalance = walletData.balance || 0;
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient funds. Current balance: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`);
    }
    
    // Update wallet balance
    await this.getCollection(this.walletsCollection).updateOne(
      { userId: this.createObjectId(userId) },
      { 
        $inc: { balance: -amount },
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
    const fromWalletData = await this.getWalletBalance(fromUserId);
    const currentBalance = fromWalletData.balance || 0;
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient funds. Current balance: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`);
    }
    
    // Ensure receiver wallet exists
    const toWalletData = await this.getWalletBalance(toUserId);
    
    // Get user names for transaction descriptions
    const [fromUser, toUser] = await Promise.all([
      this.findById(this.usersCollection, fromUserId),
      this.findById(this.usersCollection, toUserId)
    ]);
    
    // Perform transfer
    await Promise.all([
      // Deduct from sender
      this.getCollection(this.walletsCollection).updateOne(
        { userId: this.createObjectId(fromUserId) },
        { 
          $inc: { balance: -amount },
          $set: { updatedAt: new Date() }
        }
      ),
      // Add to receiver
      this.getCollection(this.walletsCollection).updateOne(
        { userId: this.createObjectId(toUserId) },
        { 
          $inc: { balance: amount },
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
      toNewBalance: (toWalletData.balance || 0) + amount,
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
   * Get transactions with pagination and summary (alias for compatibility)
   */
  async getTransactions(userId, page = 1, limit = 20, type = null, status = null) {
    const offset = (page - 1) * limit;
    const options = { limit, offset };
    
    if (type) options.type = type;
    if (status) options.status = status;
    
    const result = await this.getTransactionHistory(userId, options);
    
    // Calculate summary statistics
    const summary = await this.getTransactionSummary(userId);
    
    // Calculate pagination info
    const totalTransactions = await this.count(this.transactionsCollection, { 
      userId: this.createObjectId(userId) 
    });
    
    const totalPages = Math.ceil(totalTransactions / limit);
    
    return {
      transactions: result.transactions,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total: totalTransactions,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      summary: summary
    };
  }

  /**
   * Get transaction summary for user
   */
  async getTransactionSummary(userId) {
    const [creditSum, debitSum, transactionCount] = await Promise.all([
      // Sum of credits (positive amounts)
      this.aggregate(this.transactionsCollection, [
        { $match: { userId: this.createObjectId(userId), amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Sum of debits (negative amounts)
      this.aggregate(this.transactionsCollection, [
        { $match: { userId: this.createObjectId(userId), amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
      ]),
      // Total transaction count
      this.count(this.transactionsCollection, { userId: this.createObjectId(userId) })
    ]);

    const totalCredits = creditSum[0]?.total || 0;
    const totalDebits = debitSum[0]?.total || 0;
    const netAmount = totalCredits - totalDebits;

    return {
      totalCredits,
      totalDebits,
      netAmount,
      transactionCount
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
    await this.getCollection(this.walletsCollection).updateOne(
      { userId: this.createObjectId(userId) },
      { 
        $inc: { balance: refundAmount },
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
      
      // Calculate payment processing fee (Stripe fee: 2.9% + $0.30 CAD per transaction)
      const paymentProcessingFeeRate = (settings.paymentProcessingFee || 2.9) / 100;
      const paymentProcessingFeeFixed = settings.paymentProcessingFeeFixed || 0.30; // Stripe's fixed fee per transaction in CAD
      const paymentProcessingFee = (totalRevenue * paymentProcessingFeeRate) + paymentProcessingFeeFixed;
      
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
    const [totalWallets, totalBalance, totalTransactions, topWallets] = await Promise.all([
      this.count(this.walletsCollection, { balance: { $exists: true } }),
      this.aggregate(this.walletsCollection, [
        { $match: { balance: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]),
      this.count(this.transactionsCollection),
      this.aggregate(this.walletsCollection, [
        { $match: { balance: { $gt: 0 } } },
        { $sort: { balance: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            balance: 1
          }
        }
      ])
    ]);
    
    return {
      totalUsers: totalWallets,
      totalBalance: totalBalance[0]?.total || 0,
      totalTransactions: totalTransactions,
      topUsers: topWallets
    };
  }
}

module.exports = WalletService;
