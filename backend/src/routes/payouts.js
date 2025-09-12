const express = require('express');
const router = express.Router();
const PayoutService = require('../services/payoutService');
const verifyToken = require('../middleware/authmiddleware');
const Artisan = require('../models/artisan');

// Get payout status for the authenticated artisan
router.get('/status', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can access payout status' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Get payout status
    const status = await PayoutService.getPayoutStatus(artisanProfile._id);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting payout status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set up Stripe Connect account for payouts
router.post('/setup-stripe', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can set up Stripe accounts' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Set up Stripe account
    const result = await PayoutService.setupStripeAccount(artisanProfile._id);

    res.json({
      success: true,
      message: result.message,
      data: {
        accountId: result.accountId,
        onboardingUrl: result.onboardingUrl,
        requiresOnboarding: result.requiresOnboarding
      }
    });
  } catch (error) {
    console.error('Error setting up Stripe account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process manual payout request
router.post('/request', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Check if user is an artisan
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can request payouts' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Process manual payout
    const result = await PayoutService.processManualPayout(artisanProfile._id, amount);

    res.json({
      success: true,
      message: result.message,
      data: {
        payoutAmount: result.payoutAmount,
        stripePayoutId: result.stripePayoutId,
        transactionId: result.transactionId,
        newBalance: result.newBalance
      }
    });
  } catch (error) {
    console.error('Error processing payout request:', error);
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.message === 'Stripe account not set up for payouts') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.message === 'Stripe account is not ready for payouts') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Process automatic payout (admin only)
router.post('/process-automatic', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can process automatic payouts' });
    }

    const { artisanId } = req.body;

    if (!artisanId) {
      return res.status(400).json({ message: 'Artisan ID is required' });
    }

    // Process automatic payout
    const result = await PayoutService.processAutomaticPayout(artisanId);

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error processing automatic payout:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payout history
router.get('/history', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can access payout history' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const history = await PayoutService.getPayoutHistory(artisanProfile._id, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting payout history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Stripe account information
router.get('/stripe-account', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can access Stripe account info' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Get wallet to find Stripe account ID
    const Wallet = require('../models/wallet');
    const wallet = await Wallet.findOne({ artisanId: req.user._id });
    
    if (!wallet || !wallet.stripeAccountId) {
      return res.json({
        success: true,
        data: {
          hasAccount: false,
          message: 'No Stripe account set up'
        }
      });
    }

    // Get Stripe account information
    const StripeService = require('../services/stripeService');
    const account = await StripeService.getAccount(wallet.stripeAccountId);

    res.json({
      success: true,
      data: {
        hasAccount: true,
        accountId: account.id,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        requirements: account.requirements,
        country: account.country,
        defaultCurrency: account.default_currency
      }
    });
  } catch (error) {
    console.error('Error getting Stripe account info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
