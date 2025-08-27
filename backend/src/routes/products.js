const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/product');
const verifyToken = require('../middleware/authMiddleware');

// Food synonyms and common terms for better search matching
const FOOD_SYNONYMS = {
  'eggs': ['egg', 'fresh eggs', 'farm eggs', 'organic eggs', 'chicken eggs'],
  'bread': ['loaf', 'sourdough', 'artisan bread', 'fresh bread', 'baked bread'],
  'milk': ['dairy', 'fresh milk', 'organic milk', 'farm milk'],
  'cheese': ['artisan cheese', 'fresh cheese', 'farm cheese'],
  'honey': ['raw honey', 'organic honey', 'local honey'],
  'jam': ['jelly', 'preserves', 'fruit spread', 'homemade jam'],
  'tomatoes': ['tomato', 'fresh tomatoes', 'organic tomatoes'],
  'lettuce': ['lettuce', 'fresh lettuce', 'organic lettuce', 'salad greens'],
  'carrots': ['carrot', 'fresh carrots', 'organic carrots'],
  'potatoes': ['potato', 'fresh potatoes', 'organic potatoes'],
  'onions': ['onion', 'fresh onions', 'organic onions'],
  'apples': ['apple', 'fresh apples', 'organic apples'],
  'bananas': ['banana', 'fresh bananas', 'organic bananas'],
  'strawberries': ['strawberry', 'fresh strawberries', 'organic strawberries'],
  'blueberries': ['blueberry', 'fresh blueberries', 'organic blueberries'],
  'chicken': ['fresh chicken', 'organic chicken', 'farm chicken'],
  'beef': ['fresh beef', 'organic beef', 'grass-fed beef'],
  'pork': ['fresh pork', 'organic pork', 'farm pork'],
  'fish': ['fresh fish', 'wild fish', 'organic fish'],
  'coffee': ['fresh coffee', 'artisan coffee', 'small-batch coffee'],
  'tea': ['fresh tea', 'artisan tea', 'organic tea']
};

// Helper function to expand search terms with synonyms
function expandSearchTerms(searchTerm) {
  const term = searchTerm.toLowerCase();
  const expanded = [term];
  
  // Add synonyms
  if (FOOD_SYNONYMS[term]) {
    expanded.push(...FOOD_SYNONYMS[term]);
  }
  
  // Add singular/plural variations
  if (term.endsWith('s')) {
    expanded.push(term.slice(0, -1));
  } else {
    expanded.push(term + 's');
  }
  
  // Add common prefixes
  const prefixes = ['fresh', 'organic', 'local', 'artisan', 'homemade'];
  prefixes.forEach(prefix => {
    expanded.push(`${prefix} ${term}`);
  });
  
  // Add common misspellings and variations
  const commonMisspellings = {
    'eggs': ['eggs', 'egg', 'egs'],
    'bread': ['bread', 'bred', 'brad'],
    'tomatoes': ['tomatoes', 'tomato', 'tomatos'],
    'potatoes': ['potatoes', 'potato', 'potatos'],
    'strawberries': ['strawberries', 'strawberry', 'strawberies'],
    'blueberries': ['blueberries', 'blueberry', 'blueberies'],
    'honey': ['honey', 'hone'],
    'cheese': ['cheese', 'cheeze'],
    'milk': ['milk', 'mil'],
    'coffee': ['coffee', 'coffe', 'cofee'],
    'tea': ['tea', 'te']
  };
  
  if (commonMisspellings[term]) {
    expanded.push(...commonMisspellings[term]);
  }
  
  return [...new Set(expanded)]; // Remove duplicates
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/products';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Test search route
router.get('/test-search', async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Test search with query:', q);
    
    if (!q) {
      return res.json({ products: [] });
    }
    
    const products = await Product.find({
      status: 'active',
      name: { $regex: q, $options: 'i' }
    }).populate('seller', 'firstName lastName email phone').populate('artisan', 'artisanName type description');
    
    console.log('Found products:', products.length);
    res.json({ products });
  } catch (error) {
    console.error('Error in test search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enhanced search route
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Enhanced search with query:', q);
    
    if (!q) {
      return res.json({ products: [] });
    }
    
    // Use the same enhanced search logic
    const searchTerms = q.toLowerCase().trim().split(/\s+/);
    const expandedTerms = searchTerms.flatMap(term => expandSearchTerms(term));
    const searchRegex = expandedTerms.map(term => new RegExp(term, 'i'));
    
    // Build comprehensive search query
    const query = {
      status: 'active',
      $or: [
        // Exact name matches (highest priority)
        { name: { $regex: `^${q}$`, $options: 'i' } },
        // Name starts with search term
        { name: { $regex: `^${q}`, $options: 'i' } },
        // Name contains search term
        { name: { $regex: q, $options: 'i' } },
        // Expanded term matches in name
        ...expandedTerms.map(term => ({ name: { $regex: term, $options: 'i' } })),
        // Description contains search term
        { description: { $regex: q, $options: 'i' } },
        // Tags contain search term
        { tags: { $in: searchRegex } },
        // Category matches
        { category: { $regex: q, $options: 'i' } },
        // Subcategory matches
        { subcategory: { $regex: q, $options: 'i' } },
        // Partial word matches in name
        ...searchTerms.map(term => ({ name: { $regex: `\\b${term}`, $options: 'i' } })),
        // Partial word matches in description
        ...searchTerms.map(term => ({ description: { $regex: `\\b${term}`, $options: 'i' } }))
      ]
    };
    
    const products = await Product.find(query)
      .populate('seller', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type description');
    
    console.log('Found products:', products.length);
    
    // Apply enhanced ranking
    const rankedProducts = products.map(product => {
      let score = 0;
      const productName = (product.name || '').toLowerCase();
      const productDesc = (product.description || '').toLowerCase();
      const productTags = Array.isArray(product.tags) ? product.tags.map(tag => (tag || '').toLowerCase()) : [];
      const productCategory = (product.category || '').toLowerCase();
      const productSubcategory = (product.subcategory || '').toLowerCase();
      
      // Exact name match (highest priority)
      if (productName === q.toLowerCase()) {
        score += 1000;
      }
      
      // Name starts with search term
      if (productName.startsWith(q.toLowerCase())) {
        score += 500;
      }
      
      // Name contains search term
      if (productName.includes(q.toLowerCase())) {
        score += 300;
      }
      
      // Expanded term matches (synonyms, variations)
      expandedTerms.forEach(term => {
        if (productName.includes(term)) {
          score += 250;
        }
        // Exact expanded term match
        if (productName === term) {
          score += 400;
        }
      });
      
      // Word boundary matches in name
      searchTerms.forEach(term => {
        if (productName.includes(term)) {
          score += 200;
        }
        // Word boundary match (whole word)
        if (new RegExp(`\\b${term}\\b`, 'i').test(productName)) {
          score += 150;
        }
      });
      
      // Category match
      if (productCategory.includes(q.toLowerCase())) {
        score += 100;
      }
      
      // Subcategory match
      if (productSubcategory.includes(q.toLowerCase())) {
        score += 80;
      }
      
      // Tag matches
      searchTerms.forEach(term => {
        if (productTags.some(tag => tag.includes(term))) {
          score += 50;
        }
      });
      
      // Description matches
      searchTerms.forEach(term => {
        if (productDesc.includes(term)) {
          score += 30;
        }
      });
      
      // Boost for organic/fresh products
      if (product.isOrganic) score += 20;
      if (productName.includes('fresh')) score += 15;
      if (productName.includes('organic')) score += 15;
      if (productName.includes('artisan')) score += 15;
      if (productName.includes('homemade')) score += 15;
      
      // Boost for products with images
      if (product.image) score += 10;
      
      // Boost for products with good stock
      if (product.stock > 10) score += 5;
      
      // Recent products get slight boost
      const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 5;
      
      return { ...product.toObject(), relevanceScore: score };
    });
    
    // Sort by relevance score
    rankedProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Populate artisan information for each product
    const Artisan = require('../models/artisan');
    const productsWithArtisan = await Promise.all(
      rankedProducts.map(async (product) => {
        try {
          const artisan = await Artisan.findOne({ user: product.seller?._id || product.seller });
          const productObj = product.toObject ? product.toObject() : product;
          productObj.artisan = artisan;
          return productObj;
        } catch (error) {
          console.error('Error populating artisan for product:', product._id, error);
          const productObj = product.toObject ? product.toObject() : product;
          productObj.artisan = null;
          return productObj;
        }
      })
    );
    
    res.json({ 
      products: productsWithArtisan,
      searchMetadata: {
        query: q,
        totalResults: productsWithArtisan.length,
        searchTerms: searchTerms,
        expandedTerms: expandedTerms,
        hasRelevanceScores: true
      }
    });
  } catch (error) {
    console.error('Error in enhanced search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchTerm = q.toLowerCase().trim();
    const expandedTerms = expandSearchTerms(searchTerm);
    
    // Get popular products that match the search term
    const suggestions = await Product.aggregate([
      {
        $match: {
          status: 'active',
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { category: { $regex: searchTerm, $options: 'i' } },
            { tags: { $in: expandedTerms.map(term => new RegExp(term, 'i')) } }
          ]
        }
      },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
          category: { $first: '$category' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          name: '$_id',
          category: 1,
          count: 1
        }
      }
    ]);
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products (for discover page)
router.get('/', async (req, res) => {
  try {
    console.log('Products route called with query:', req.query);
    
    const { 
      category, 
      subcategory, 
      search, 
      tags, 
      organic, 
      glutenFree, 
      vegan, 
      halal,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice
    } = req.query;
    
    let query = { status: 'active' };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Subcategory filter
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    // Enhanced search algorithm with intelligent ranking
    if (search) {
      console.log('Search query:', search);
      try {
        // Clean and normalize search terms
        const searchTerms = search.toLowerCase().trim().split(/\s+/);
        
        // Expand search terms with synonyms and variations
        const expandedTerms = searchTerms.flatMap(term => expandSearchTerms(term));
        const searchRegex = expandedTerms.map(term => new RegExp(term, 'i'));
        
        // Build comprehensive search query
        query.$or = [
          // Exact name matches (highest priority)
          { name: { $regex: `^${search}$`, $options: 'i' } },
          // Name starts with search term
          { name: { $regex: `^${search}`, $options: 'i' } },
          // Name contains search term
          { name: { $regex: search, $options: 'i' } },
          // Expanded term matches in name
          ...expandedTerms.map(term => ({ name: { $regex: term, $options: 'i' } })),
          // Description contains search term
          { description: { $regex: search, $options: 'i' } },
          // Tags contain search term
          { tags: { $in: searchRegex } },
          // Category matches
          { category: { $regex: search, $options: 'i' } },
          // Subcategory matches
          { subcategory: { $regex: search, $options: 'i' } },
          // Partial word matches in name
          ...searchTerms.map(term => ({ name: { $regex: `\\b${term}`, $options: 'i' } })),
          // Partial word matches in description
          ...searchTerms.map(term => ({ description: { $regex: `\\b${term}`, $options: 'i' } }))
        ];
        
        console.log('Enhanced search query built:', JSON.stringify(query));
      } catch (error) {
        console.error('Error building enhanced search query:', error);
        // Fallback to simple search
        query.name = { $regex: search, $options: 'i' };
      }
    }
    
    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Dietary preferences filters
    if (organic === 'true') query.isOrganic = true;
    if (glutenFree === 'true') query.isGlutenFree = true;
    if (vegan === 'true') query.isVegan = true;
    if (halal === 'true') query.isHalal = true;
    
    console.log('Final query:', JSON.stringify(query));
    
    // Get products
    let products = await Product.find(query)
      .populate('seller', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type description');
    
    console.log('Found products:', products.length);
    
    // Enhanced ranking for search
    if (search) {
      const searchTerms = search.toLowerCase().trim().split(/\s+/);
      const expandedTerms = searchTerms.flatMap(term => expandSearchTerms(term));
      
      products = products.map(product => {
        let score = 0;
        const productName = (product.name || '').toLowerCase();
        const productDesc = (product.description || '').toLowerCase();
        const productTags = Array.isArray(product.tags) ? product.tags.map(tag => (tag || '').toLowerCase()) : [];
        const productCategory = (product.category || '').toLowerCase();
        const productSubcategory = (product.subcategory || '').toLowerCase();
        
        // Exact name match (highest priority)
        if (productName === search.toLowerCase()) {
          score += 1000;
        }
        
        // Name starts with search term
        if (productName.startsWith(search.toLowerCase())) {
          score += 500;
        }
        
        // Name contains search term
        if (productName.includes(search.toLowerCase())) {
          score += 300;
        }
        
        // Expanded term matches (synonyms, variations)
        expandedTerms.forEach(term => {
          if (productName.includes(term)) {
            score += 250;
          }
          // Exact expanded term match
          if (productName === term) {
            score += 400;
          }
        });
        
        // Word boundary matches in name
        searchTerms.forEach(term => {
          if (productName.includes(term)) {
            score += 200;
          }
          // Word boundary match (whole word)
          if (new RegExp(`\\b${term}\\b`, 'i').test(productName)) {
            score += 150;
          }
        });
        
        // Category match
        if (productCategory.includes(search.toLowerCase())) {
          score += 100;
        }
        
        // Subcategory match
        if (productSubcategory.includes(search.toLowerCase())) {
          score += 80;
        }
        
        // Tag matches
        searchTerms.forEach(term => {
          if (productTags.some(tag => tag.includes(term))) {
            score += 50;
          }
        });
        
        // Description matches
        searchTerms.forEach(term => {
          if (productDesc.includes(term)) {
            score += 30;
          }
        });
        
        // Boost for organic/fresh products
        if (product.isOrganic) score += 20;
        if (productName.includes('fresh')) score += 15;
        if (productName.includes('organic')) score += 15;
        if (productName.includes('artisan')) score += 15;
        if (productName.includes('homemade')) score += 15;
        
        // Boost for products with images
        if (product.image) score += 10;
        
        // Boost for products with good stock
        if (product.stock > 10) score += 5;
        
        // Recent products get slight boost
        const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 7) score += 5;
        
        // Convert to object and add score
        const productObj = product.toObject ? product.toObject() : product;
        return { ...productObj, relevanceScore: score };
      });
      
      products.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else {
      // Regular sorting for non-search queries
      let sortOptions = {};
      switch (sortBy) {
        case 'price':
          sortOptions.price = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'name':
          sortOptions.name = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'createdAt':
        default:
          sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
          break;
      }
      
      products = await Product.find(query)
        .populate('seller', 'firstName lastName email phone')
        .sort(sortOptions);
    }
    
    // Populate artisan information for each product
    const Artisan = require('../models/artisan');
    const productsWithArtisan = await Promise.all(
      products.map(async (product) => {
        try {
          const artisan = await Artisan.findOne({ user: product.seller?._id || product.seller });
          const productObj = product.toObject ? product.toObject() : product;
          productObj.artisan = artisan;
          return productObj;
        } catch (error) {
          console.error('Error populating artisan for product:', product._id, error);
          const productObj = product.toObject ? product.toObject() : product;
          productObj.artisan = null;
          return productObj;
        }
      })
    );
    
    const response = {
      products: productsWithArtisan,
      searchMetadata: {
        query: search,
        totalResults: productsWithArtisan.length,
        hasRelevanceScores: search ? productsWithArtisan.some(p => p.relevanceScore !== undefined) : false
      }
    };
    
    console.log('Sending response with', productsWithArtisan.length, 'products');
    res.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get seller's products (requires authentication)
router.get('/my-products', verifyToken, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get products by artisan ID (public endpoint)
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const products = await Product.find({ 
              seller: req.params.artisanId,
      status: 'active'
    })
    .populate('seller', 'firstName lastName email')
    .sort({ createdAt: -1 });
    
    // Populate artisan information
    const Artisan = require('../models/artisan');
    const productsWithArtisan = await Promise.all(
      products.map(async (product) => {
        const artisan = await Artisan.findOne({ user: product.seller._id });
        const productObj = product.toObject ? product.toObject() : product;
        productObj.artisan = artisan;
        return productObj;
      })
    );
    
          res.json(productsWithArtisan);
  } catch (error) {
    console.error('Error fetching artisan products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'firstName lastName email phone');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Populate artisan information
    const Artisan = require('../models/artisan');
    const artisan = await Artisan.findOne({ user: product.seller._id });
    const productObj = product.toObject();
    productObj.artisan = artisan;
    
    res.json(productObj);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new product (requires authentication)
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Creating product with data:', req.body);
    console.log('File:', req.file);
    console.log('User from token:', req.user);
    console.log('User ID:', req.user._id);
    
    // Check if req.body exists and has data
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('req.body is empty or undefined');
      return res.status(400).json({ message: 'No product data received' });
    }
    
    const {
      name,
      description,
      price,
      category,
      subcategory,
      stock,
      unit,
      weight,
      expiryDate,
      tags,
      isOrganic,
      isGlutenFree,
      isVegan,
      isHalal,
      leadTimeHours
    } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !category || !stock) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }
    
    // Parse tags if it's a string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [tags];
      }
    }
    
    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      subcategory,
      stock: parseInt(stock),
      unit: unit || 'piece',
      weight: weight ? parseFloat(weight) : null,
      expiryDate: expiryDate || null,
      image: imageUrl,
      tags: parsedTags,
      isOrganic: isOrganic === 'true' || isOrganic === true,
      isGlutenFree: isGlutenFree === 'true' || isGlutenFree === true,
      isVegan: isVegan === 'true' || isVegan === true,
      isHalal: isHalal === 'true' || isHalal === true,
      leadTimeHours: leadTimeHours ? parseInt(leadTimeHours) : 24,
      seller: req.user._id
    });
    
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (requires authentication and ownership)
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Updating product with data:', req.body);
    console.log('File:', req.file);
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }
    
    // Check if req.body exists and has data
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('req.body is empty or undefined');
      return res.status(400).json({ message: 'No product data received' });
    }
    
    const {
      name,
      description,
      price,
      category,
      subcategory,
      stock,
      unit,
      weight,
      expiryDate,
      tags,
      isOrganic,
      isGlutenFree,
      isVegan,
      isHalal,
      status,
      leadTimeHours
    } = req.body;
    
    // Update fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (category !== undefined) product.category = category;
    if (subcategory !== undefined) product.subcategory = subcategory;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (unit !== undefined) product.unit = unit;
    if (weight !== undefined) product.weight = weight ? parseFloat(weight) : null;
    if (expiryDate !== undefined) product.expiryDate = expiryDate || null;
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : JSON.parse(tags || '[]');
    if (isOrganic !== undefined) product.isOrganic = isOrganic === 'true' || isOrganic === true;
    if (isGlutenFree !== undefined) product.isGlutenFree = isGlutenFree === 'true' || isGlutenFree === true;
    if (isVegan !== undefined) product.isVegan = isVegan === 'true' || isVegan === true;
    if (isHalal !== undefined) product.isHalal = isHalal === 'true' || isHalal === true;
    if (status !== undefined) product.status = status;
    if (leadTimeHours !== undefined) product.leadTimeHours = parseInt(leadTimeHours);
    
    // Handle image upload
    if (req.file) {
      product.image = `/uploads/products/${req.file.filename}`;
    }
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (requires authentication and ownership)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product stock (for when someone buys)
router.patch('/:id/stock', verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }
    
    product.stock -= quantity;
    product.soldCount += quantity;
    
    // Update status if out of stock
    if (product.stock === 0) {
      product.status = 'out_of_stock';
    }
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product stock:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product inventory (for seller management)
router.patch('/:id/inventory', verifyToken, async (req, res) => {
  try {
    const { stock, status } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }
    
    // Update stock if provided
    if (stock !== undefined) {
      product.stock = parseInt(stock);
      
      // Update status based on stock
      if (product.stock === 0) {
        product.status = 'out_of_stock';
      } else if (product.status === 'out_of_stock' && product.stock > 0) {
        product.status = 'active';
      }
    }
    
    // Update status if provided
    if (status !== undefined) {
      product.status = status;
    }
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reduce inventory (for purchases)
router.patch('/:id/reduce-inventory', verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }
    
    product.stock -= quantity;
    product.soldCount += quantity;
    
    // Update status if out of stock
    if (product.stock === 0) {
      product.status = 'out_of_stock';
    }
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Error reducing product inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const subcategories = await Product.distinct('subcategory');
    
    res.json({
      categories: categories.filter(cat => cat),
      subcategories: subcategories.filter(subcat => subcat)
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


