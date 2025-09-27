/**
 * Wallet Service - Microservices Foundation
 * Handles wallet transactions, balance management, and financial operations
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class WalletService {
  constructor() {
    this.serviceName = 'wallet-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Wallet Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Wallet Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Wallet Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Wallet Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Wallet Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Wallet Service cache connected');

      this.isInitialized = true;
      console.log('✅ Wallet Service initialized successfully');
    } catch (error) {
      console.error('❌ Wallet Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const walletsCollection = db.collection('wallets');
      
      // Find or create wallet
      let wallet = await walletsCollection.findOne({
        userId: new ObjectId(userId)
      });
      
      if (!wallet) {
        // Create wallet if it doesn't exist
        const newWallet = {
          userId: new ObjectId(userId),
          balance: 0,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };
        
        const result = await walletsCollection.insertOne(newWallet);
        wallet = { ...newWallet, _id: result.insertedId };
      }
      
      await client.close();
      
      return {
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
        walletId: wallet._id
      };
    } catch (error) {
      console.error('Wallet Service - Get wallet balance error:', error);
      throw error;
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(userId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const transactionsCollection = db.collection('wallet_transactions');
      
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        type,
        status
      } = options;
      
      const skip = (page - 1) * limit;
      const query = { userId: new ObjectId(userId) };
      
      if (type) query.type = type;
      if (status) query.status = status;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [transactions, totalCount] = await Promise.all([
        transactionsCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        transactionsCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        transactions: transactions,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Wallet Service - Get wallet transactions error:', error);
      throw error;
    }
  }

  /**
   * Create a wallet transaction
   */
  async createTransaction(transactionData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const walletsCollection = db.collection('wallets');
      const transactionsCollection = db.collection('wallet_transactions');
      
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          const transaction = {
            ...transactionData,
            userId: new ObjectId(transactionData.userId),
            createdAt: new Date(),
            status: 'pending'
          };
          
          // Insert transaction
          const result = await transactionsCollection.insertOne(transaction, { session });
          transaction._id = result.insertedId;
          
          // Update wallet balance
          const balanceUpdate = transaction.type === 'credit' 
            ? { $inc: { balance: transaction.amount } }
            : { $inc: { balance: -transaction.amount } };
          
          await walletsCollection.updateOne(
            { userId: new ObjectId(transactionData.userId) },
            { ...balanceUpdate, $set: { updatedAt: new Date() } },
            { session, upsert: true }
          );
          
          // Update transaction status
          await transactionsCollection.updateOne(
            { _id: result.insertedId },
            { $set: { status: 'completed', completedAt: new Date() } },
            { session }
          );
        });
        
        await client.close();
        
        return {
          success: true,
          message: 'Transaction created successfully'
        };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.error('Wallet Service - Create transaction error:', error);
      throw error;
    }
  }

  /**
   * Add funds to wallet
   */
  async addFunds(userId, amount, paymentMethod, reference) {
    try {
      const transactionData = {
        userId: userId,
        type: 'credit',
        amount: amount,
        description: 'Funds added to wallet',
        paymentMethod: paymentMethod,
        reference: reference,
        category: 'deposit'
      };
      
      return await this.createTransaction(transactionData);
    } catch (error) {
      console.error('Wallet Service - Add funds error:', error);
      throw error;
    }
  }

  /**
   * Withdraw funds from wallet
   */
  async withdrawFunds(userId, amount, paymentMethod, reference) {
    try {
      // Check if user has sufficient balance
      const balance = await this.getWalletBalance(userId);
      if (balance.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      const transactionData = {
        userId: userId,
        type: 'debit',
        amount: amount,
        description: 'Funds withdrawn from wallet',
        paymentMethod: paymentMethod,
        reference: reference,
        category: 'withdrawal'
      };
      
      return await this.createTransaction(transactionData);
    } catch (error) {
      console.error('Wallet Service - Withdraw funds error:', error);
      throw error;
    }
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(fromUserId, toUserId, amount, description) {
    try {
      // Check if sender has sufficient balance
      const fromBalance = await this.getWalletBalance(fromUserId);
      if (fromBalance.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const walletsCollection = db.collection('wallets');
      const transactionsCollection = db.collection('wallet_transactions');
      
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          const transferId = new ObjectId();
          
          // Create debit transaction for sender
          const debitTransaction = {
            _id: transferId,
            userId: new ObjectId(fromUserId),
            type: 'debit',
            amount: amount,
            description: description || 'Transfer to another user',
            category: 'transfer',
            reference: `TRANSFER_${transferId}`,
            relatedUserId: new ObjectId(toUserId),
            createdAt: new Date(),
            status: 'completed',
            completedAt: new Date()
          };
          
          // Create credit transaction for receiver
          const creditTransaction = {
            _id: new ObjectId(),
            userId: new ObjectId(toUserId),
            type: 'credit',
            amount: amount,
            description: description || 'Transfer from another user',
            category: 'transfer',
            reference: `TRANSFER_${transferId}`,
            relatedUserId: new ObjectId(fromUserId),
            createdAt: new Date(),
            status: 'completed',
            completedAt: new Date()
          };
          
          // Insert both transactions
          await transactionsCollection.insertMany([debitTransaction, creditTransaction], { session });
          
          // Update sender's wallet balance
          await walletsCollection.updateOne(
            { userId: new ObjectId(fromUserId) },
            { 
              $inc: { balance: -amount },
              $set: { updatedAt: new Date() }
            },
            { session, upsert: true }
          );
          
          // Update receiver's wallet balance
          await walletsCollection.updateOne(
            { userId: new ObjectId(toUserId) },
            { 
              $inc: { balance: amount },
              $set: { updatedAt: new Date() }
            },
            { session, upsert: true }
          );
        });
        
        await client.close();
        
        return {
          success: true,
          message: 'Transfer completed successfully'
        };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.error('Wallet Service - Transfer funds error:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const transactionsCollection = db.collection('wallet_transactions');
      
      const transaction = await transactionsCollection.findOne({
        _id: new ObjectId(transactionId)
      });
      
      await client.close();
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      return {
        success: true,
        transaction: transaction
      };
    } catch (error) {
      console.error('Wallet Service - Get transaction by ID error:', error);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const transactionsCollection = db.collection('wallet_transactions');
      
      const stats = await transactionsCollection.aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
              }
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
              }
            },
            totalTransfers: {
              $sum: {
                $cond: [{ $eq: ['$category', 'transfer'] }, 1, 0]
              }
            }
          }
        }
      ]).toArray();
      
      const balance = await this.getWalletBalance(userId);
      
      await client.close();
      
      return {
        success: true,
        stats: {
          currentBalance: balance.balance,
          currency: balance.currency,
          totalTransactions: stats[0]?.totalTransactions || 0,
          totalCredits: stats[0]?.totalCredits || 0,
          totalDebits: stats[0]?.totalDebits || 0,
          totalTransfers: stats[0]?.totalTransfers || 0
        }
      };
    } catch (error) {
      console.error('Wallet Service - Get wallet stats error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        service: this.serviceName,
        status: 'healthy',
        version: this.version,
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.serviceName,
      version: this.version,
      initialized: this.isInitialized,
      endpoints: [
        'GET /api/wallet/balance',
        'GET /api/wallet/transactions',
        'POST /api/wallet/transactions',
        'POST /api/wallet/add-funds',
        'POST /api/wallet/withdraw-funds',
        'POST /api/wallet/transfer',
        'GET /api/wallet/transactions/:id',
        'GET /api/wallet/stats'
      ]
    };
  }
}

module.exports = new WalletService();
