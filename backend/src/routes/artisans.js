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
                seller: artisan.user._id, 
                status: 'active' 
              }).limit(3).lean(),
              Product.countDocuments({ 
                seller: artisan.user._id, 
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
    console.log('🔍 Route /:id - Artisan ID requested:', req.params.id);
    console.log('🔍 Route /:id - includeProducts:', includeProducts);
    console.log('🔍 Route /:id - req.query:', req.query);
    
    let artisan = await Artisan.findById(req.params.id)
      .populate('user', 'firstName lastName email phone');
    
    if (!artisan) {
      console.log('❌ Artisan not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Artisan not found' });
    }
    
    console.log('✅ Artisan found:', artisan.artisanName, 'ID:', artisan._id);

    // If includeProducts is requested, add products
    if (includeProducts === 'true') {
      const Product = require('../models/product');
      
      console.log('🔍 Fetching products for artisan ID:', artisan._id);
      console.log('🔍 IncludeProducts parameter:', includeProducts);
      
      // Fetch products linked to this artisan
      const products = await Product.find({ 
        artisan: artisan._id,
        status: 'active'
      }).select('name price image category subcategory description stock unit soldCount tags isOrganic isGlutenFree isVegan isHalal weight expiryDate leadTimeHours');
      
      console.log(`🔍 Products query result: ${products.length} products found`);
      console.log('🔍 Sample products:', products.slice(0, 2).map(p => ({ name: p.name, artisan: p.artisan })));
      
      artisan = artisan.toObject();
      artisan.products = products;
      console.log(`✅ Final artisan data has ${artisan.products.length} products`);
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

