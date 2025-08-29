const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');
const Artisan = require('../models/artisan');

// Get user's favorite artisans
router.get('/artisans', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteArtisans');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const favorites = user.favoriteArtisans || [];
    
    res.json({
      success: true,
      favorites: favorites,
      count: favorites.length
    });
  } catch (error) {
    console.error('Error fetching favorite artisans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add artisan to favorites
router.post('/artisans', authMiddleware, async (req, res) => {
  try {
    const { artisanId } = req.body;
    
    if (!artisanId) {
      return res.status(400).json({ message: 'Artisan ID is required' });
    }

    // Check if artisan exists
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already favorited
    if (user.favoriteArtisans && user.favoriteArtisans.includes(artisanId)) {
      return res.status(400).json({ message: 'Artisan already in favorites' });
    }

    // Add to favorites
    if (!user.favoriteArtisans) {
      user.favoriteArtisans = [];
    }
    user.favoriteArtisans.push(artisanId);
    await user.save();

    res.json({
      success: true,
      message: 'Artisan added to favorites',
      favoriteArtisans: user.favoriteArtisans
    });
  } catch (error) {
    console.error('Error adding favorite artisan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove artisan from favorites
router.delete('/artisans/:artisanId', authMiddleware, async (req, res) => {
  try {
    const { artisanId } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from favorites
    if (user.favoriteArtisans) {
      user.favoriteArtisans = user.favoriteArtisans.filter(
        id => id.toString() !== artisanId
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Artisan removed from favorites',
      favoriteArtisans: user.favoriteArtisans
    });
  } catch (error) {
    console.error('Error removing favorite artisan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Check if artisan is favorited
router.get('/artisans/:artisanId/check', authMiddleware, async (req, res) => {
  try {
    const { artisanId } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFavorited = user.favoriteArtisans && 
      user.favoriteArtisans.some(id => id.toString() === artisanId);

    res.json({
      success: true,
      isFavorited: isFavorited
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get favorite count for an artisan
router.get('/artisans/:artisanId/count', async (req, res) => {
  try {
    const { artisanId } = req.params;
    
    const count = await User.countDocuments({
      favoriteArtisans: artisanId
    });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error getting favorite count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
