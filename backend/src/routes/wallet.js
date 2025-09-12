const express = require('express');
const router = express.Router();
const WalletService = require('../services/walletService');
const verifyToken = require('../middleware/authmiddleware');
const Artisan = require('../models/artisan');

// Get wallet information for the authenticated artisan
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access wallet information' });
    }

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Get wallet information
    const walletInfo = await WalletService.getWalletInfo(artisanProfile._id);
    
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

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Get wallet balance
    const balance = await WalletService.getBalance(artisanProfile._id);
    
    res.json({
      success: true,
      balance: balance,
      currency: 'CAD'
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

    // Find the artisan profile for this user
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const walletInfo = await WalletService.getWalletInfo(artisanProfile._id, limit);
    
    res.json({
      success: true,
      transactions: walletInfo.transactions,
      summary: walletInfo.summary
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
    const hasSufficientBalance = await WalletService.hasSufficientBalance(artisanProfile._id, amount);
    
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
      artisanProfile._id,
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
      artisanProfile._id,
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

module.exports = router;