const express = require('express');
const router = express.Router();
const Artisan = require('../models/artisan');
const verifyToken = require('../middleware/authMiddleware');

// Get all artisans
router.get('/', async (req, res) => {
  try {
    const { category, type, location, search, includeProducts } = req.query;
    let query = { isActive: true };

    if (category) query.category = new RegExp(category, 'i');
    if (type && type !== 'all') query.type = type;
    if (location) query['address.city'] = new RegExp(location, 'i');
    
    // Add search functionality
    if (search) {
      query.$or = [
        { artisanName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') }
      ];
    }

    const artisans = await Artisan.find(query)
      .populate('user', 'firstName lastName email phone')
      .sort({ rating: -1 })
      .lean(); // Use lean() for better performance

    // If includeProducts is requested, add product count and sample products
    if (includeProducts === 'true') {
      const Product = require('../models/product');
      const artisansWithProducts = await Promise.all(
        artisans.map(async (artisan) => {
          // Check if artisan has a valid user reference
          if (!artisan.user || !artisan.user._id) {
            return {
              ...artisan,
              products: [],
              productCount: 0
            };
          }

          try {
            const [products, productCount] = await Promise.all([
              Product.find({ 
                artisan: artisan._id, 
                status: 'active' 
              }).limit(3).lean(),
              Product.countDocuments({ 
                artisan: artisan._id, 
                status: 'active' 
              })
            ]);

            return {
              ...artisan,
              products: products,
              productCount: productCount
            };
          } catch (error) {
            console.error(`Error fetching products for artisan ${artisan._id}:`, error);
            return {
              ...artisan,
              products: [],
              productCount: 0
            };
          }
        })
      );
      
      return res.json(artisansWithProducts);
    }

    res.json(artisans);
  } catch (error) {
    console.error('Error fetching artisans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get artisan by ID
router.get('/:id', async (req, res) => {
  try {
    const { includeProducts } = req.query;
    
    let artisan = await Artisan.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .select('artisanName type description businessImage address phone email rating artisanHours deliveryOptions pickupLocation pickupInstructions pickupHours pickupUseBusinessAddress pickupAddress pickupSchedule deliveryInstructions professionalDelivery photos isActive isVerified createdAt');
    
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // If includeProducts is requested, add products
    if (includeProducts === 'true') {
      const Product = require('../models/product');
      
      // Fetch products linked to this artisan
      const products = await Product.find({ 
        artisan: artisan._id,
        status: { $in: ['active', 'out_of_stock'] } // Include both active and out-of-stock products
      }).select('name price image category subcategory description stock unit soldCount tags isOrganic isGlutenFree isVegan isHalal weight expiryDate leadTimeHours productType availableQuantity remainingCapacity totalCapacity maxOrderQuantity lowStockThreshold isActive isFeatured status createdAt updatedAt');
      
      artisan = artisan.toObject();
      artisan.products = products;
    }

    res.json(artisan);
  } catch (error) {
    console.error('Error fetching artisan by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new artisan (requires authentication)
router.post('/', verifyToken, async (req, res) => {
  try {
    const artisanData = {
      ...req.body,
      user: req.user._id
    };

    const artisan = new Artisan(artisanData);
    await artisan.save();

    res.status(201).json(artisan);
  } catch (error) {
    console.error('Error creating artisan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update artisan (requires authentication and ownership)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.params.id);
    
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    if (artisan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedArtisan = await Artisan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedArtisan);
  } catch (error) {
    console.error('Error updating artisan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

