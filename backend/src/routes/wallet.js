const express = require('express');
const router = express.Router();
const WalletService = require('../services/walletService');
const verifyToken = require('../middleware/authMiddleware');
const Artisan = require('../models/artisan');

// Get wallet information for the authenticated artisan
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access wallet information' });
    }

    // Get wallet information
    const walletInfo = await WalletService.getWalletInfo(req.user._id);
    
    res.json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    console.error('Error getting wallet info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wallet balance
router.get('/balance', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access wallet balance' });
    }

    // Get wallet balance and info
    const balance = await WalletService.getBalance(req.user._id);
    const walletInfo = await WalletService.getWalletInfo(req.user._id, 10);
    
    res.json({
      success: true,
      data: {
        balance: balance,
        currency: 'CAD',
        recentTransactionsCount: walletInfo.transactions.length,
        payoutSettings: {
          enabled: true,
          schedule: 'weekly',
          minimumPayout: 50,
          nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      }
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wallet transactions
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access wallet transactions' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const walletInfo = await WalletService.getWalletInfo(req.user._id, limit);
    
    // Calculate stats for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = walletInfo.transactions.filter(t => 
      new Date(t.createdAt) >= thirtyDaysAgo
    );

    const stats = {
      revenue: {
        total: recentTransactions
          .filter(t => t.type === 'revenue')
          .reduce((sum, t) => sum + t.amount, 0),
        count: recentTransactions.filter(t => t.type === 'revenue').length
      },
      top_up: {
        total: recentTransactions
          .filter(t => t.type === 'top_up')
          .reduce((sum, t) => sum + t.amount, 0),
        count: recentTransactions.filter(t => t.type === 'top_up').length
      },
      purchase: {
        total: Math.abs(recentTransactions
          .filter(t => t.type === 'purchase')
          .reduce((sum, t) => sum + t.amount, 0)),
        count: recentTransactions.filter(t => t.type === 'purchase').length
      }
    };
    
    res.json({
      success: true,
      data: {
        transactions: walletInfo.transactions,
        summary: walletInfo.summary,
        stats: stats
      }
    });
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if wallet has sufficient balance
router.post('/check-balance', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can check wallet balance' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Check if wallet has sufficient balance
    const hasSufficientBalance = await WalletService.hasSufficientBalance(artisanProfile.user, amount);
    
    res.json({
      success: true,
      hasSufficientBalance,
      amount,
      currency: 'CAD'
    });
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deduct funds from wallet (for purchases, fees, etc.)
router.post('/deduct', verifyToken, async (req, res) => {
  try {
    const { amount, type, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!type || !description) {
      return res.status(400).json({ message: 'Transaction type and description are required' });
    }

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can deduct from wallet' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Deduct funds from wallet
    const result = await WalletService.deductFunds(
      artisanProfile.user,
      amount,
      type,
      description,
      metadata
    );
    
    res.json({
      success: true,
      message: 'Funds deducted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deducting funds:', error);
    if (error.message === 'Insufficient wallet balance') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Add funds to wallet (for top-ups, refunds, etc.)
router.post('/add', verifyToken, async (req, res) => {
  try {
    const { amount, type, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!type || !description) {
      return res.status(400).json({ message: 'Transaction type and description are required' });
    }

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can add to wallet' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Add funds to wallet
    const result = await WalletService.addFunds(
      artisanProfile.user,
      amount,
      type,
      description,
      metadata
    );
    
    res.json({
      success: true,
      message: 'Funds added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Stripe payment intent for wallet top-up
router.post('/top-up/create-payment-intent', verifyToken, async (req, res) => {
  try {
    const { amount, currency = 'CAD' } = req.body;

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Minimum top-up amount is $10' });
    }

    if (amount > 10000) {
      return res.status(400).json({ message: 'Maximum top-up amount is $10,000' });
    }

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can top up wallet' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Import Stripe service
    const StripeService = require('../services/stripeService');
    
    // Create payment intent
    const paymentIntent = await StripeService.createPaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: req.user._id.toString(),
        artisanId: artisanProfile.user.toString(),
        type: 'wallet_top_up'
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm wallet top-up after successful payment
router.post('/top-up/confirm', verifyToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can confirm top-up' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Import Stripe service
    const StripeService = require('../services/stripeService');
    
    // Verify payment intent
    const paymentIntent = await StripeService.retrievePaymentIntent(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Verify the payment intent belongs to this user
    if (paymentIntent.metadata.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Payment intent does not belong to this user' });
    }

    const amount = paymentIntent.amount / 100; // Convert from cents

    // Add funds to wallet
    const result = await WalletService.addFunds(
      artisanProfile.user,
      amount,
      'top_up',
      `Wallet top-up via Stripe (${paymentIntentId})`,
      {
        paymentIntentId,
        stripeChargeId: paymentIntent.latest_charge,
        paymentMethod: paymentIntent.payment_method
      }
    );

    res.json({
      success: true,
      message: 'Top-up confirmed successfully',
      data: {
        transaction: result,
        newBalance: result.balanceAfter
      }
    });
  } catch (error) {
    console.error('Error confirming top-up:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;