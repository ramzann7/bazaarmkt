const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');

// Apply JWT verification to all wallet routes
router.use(verifyJWT);

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Get wallet balance
 * GET /api/wallet/balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const WalletService = require('../services/WalletService');
    const walletService = new WalletService(req.db);
    
    const userId = req.user.userId;
    const walletData = await walletService.getWalletBalance(userId);
    
    res.json({
      success: true,
      data: walletData
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance',
      error: error.message
    });
  }
};

/**
 * Get wallet transactions
 * GET /api/wallet/transactions
 */
const getWalletTransactions = async (req, res) => {
  try {
    const WalletService = require('../services/WalletService');
    const walletService = new WalletService(req.db);
    
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;
    
    const transactions = await walletService.getTransactions(userId, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet transactions',
      error: error.message
    });
  }
};

/**
 * Create Stripe payment intent for wallet top-up
 * POST /api/wallet/top-up/create-payment-intent
 */
const createTopUpPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

    const { amount, currency = 'CAD' } = req.body;
    const userId = req.user.userId;

    if (!amount || amount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum top-up amount is $10'
      });
    }

    if (amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum top-up amount is $10,000'
      });
    }

    console.log(`💳 Creating payment intent for wallet top-up: User ${userId}, Amount $${amount}`);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: userId,
        type: 'wallet_top_up'
      }
    });

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

/**
 * Confirm wallet top-up after successful payment
 * POST /api/wallet/top-up/confirm
 */
const confirmTopUp = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

    const { paymentIntentId } = req.body;
    const userId = req.user.userId;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    console.log(`🔍 Confirming top-up: User ${userId}, PaymentIntent ${paymentIntentId}`);

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Payment intent does not belong to this user'
      });
    }

    // Add funds to wallet
    const WalletService = require('../services/WalletService');
    const walletService = new WalletService(req.db);
    
    const amount = paymentIntent.amount / 100; // Convert from cents
    
    const result = await walletService.addFunds(
      userId,
      amount,
      'credit_card',
      {
        paymentIntentId: paymentIntent.id,
        paymentMethod: 'card',
        stripeCustomerId: paymentIntent.customer,
        description: 'Wallet top-up via card payment'
      }
    );

    console.log(`✅ Wallet topped up successfully: $${amount} added to user ${userId}`);

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        transaction: {
          id: result.transactionId,
          amount: amount
        },
        newBalance: result.newBalance,
        amount: amount
      }
    });
  } catch (error) {
    console.error('Confirm top-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm top-up',
      error: error.message
    });
  }
};

/**
 * Get wallet analytics/stats
 * GET /api/wallet/analytics
 */
const getWalletAnalytics = async (req, res) => {
  try {
    const WalletService = require('../services/WalletService');
    const walletService = new WalletService(req.db);
    
    const userId = req.user.userId;
    const analytics = await walletService.getWalletAnalytics(userId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get wallet analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet analytics',
      error: error.message
    });
  }
};

// Routes
router.get('/balance', getWalletBalance);
router.get('/transactions', getWalletTransactions);
router.get('/analytics', getWalletAnalytics);
router.post('/top-up/create-payment-intent', createTopUpPaymentIntent);
router.post('/top-up/confirm', confirmTopUp);

module.exports = router;

