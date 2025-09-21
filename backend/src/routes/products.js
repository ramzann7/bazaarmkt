const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('../models/product');
const verifyToken = require('../middleware/authMiddleware');
const inventoryService = require('../services/inventoryService');
const { checkProductGeographicRestrictions } = require('../middleware/geographicRestrictions');

// Import category validation utilities
const { normalizeCategoryKey, normalizeSubcategoryKey } = require('../scripts/migrateCategoryData');

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

// Enhanced ranking algorithm with distance calculations
async function applyEnhancedRanking(products, searchQuery, userLat, userLng, proximityRadius) {
  if (!products || products.length === 0) return products;

  const searchTerms = searchQuery ? searchQuery.toLowerCase().trim().split(/\s+/) : [];
  const expandedTerms = searchTerms.flatMap(term => expandSearchTerms(term));
  
  // Import geocoding service
  const geocodingService = require('../services/geocodingService');

  return products.map(product => {
    let score = 0;
    const productName = (product.name || '').toLowerCase();
    const productDesc = (product.description || '').toLowerCase();
    const productTags = Array.isArray(product.tags) ? product.tags.map(tag => (tag || '').toLowerCase()) : [];
    const productCategory = (product.category || '').toLowerCase();
    const productSubcategory = (product.subcategory || '').toLowerCase();

    // 1. Exact Match + Keyword Tags (Highest Priority)
    if (searchQuery) {
      const fullSearchQuery = searchQuery.toLowerCase();
      
      // Exact name match
      if (productName === fullSearchQuery) {
        score += 1000;
      }
      
      // Name starts with search term
      if (productName.startsWith(fullSearchQuery)) {
        score += 500;
      }
      
      // Individual term exact matches
      searchTerms.forEach(term => {
        if (productName === term) {
          score += 800;
        }
        if (productName.startsWith(term)) {
          score += 400;
        }
        if (productName.includes(term)) {
          score += 200;
        }
      });
      
      // Tag exact matches
      searchTerms.forEach(term => {
        if (productTags.includes(term)) {
          score += 300;
        }
        if (productTags.some(tag => tag.includes(term))) {
          score += 150;
        }
      });
      
      // Category exact match
      if (productCategory === fullSearchQuery) {
        score += 500;
      }
      
      // Word boundary matches
      searchTerms.forEach(term => {
        if (new RegExp(`\\b${term}\\b`, 'i').test(productName)) {
          score += 150;
        }
      });
    }

    // 2. Proximity Weighting (Geo-based)
    if (userLat && userLng && product.artisan?.location?.coordinates) {
      const distance = calculateDistance(
        parseFloat(userLat),
        parseFloat(userLng),
        product.artisan.location.coordinates[1], // latitude
        product.artisan.location.coordinates[0]  // longitude
      );
      
      // Score based on distance (closer = higher score)
      if (distance <= 5) score += 200;      // Within 5km
      else if (distance <= 10) score += 150; // Within 10km
      else if (distance <= 25) score += 100; // Within 25km
      else if (distance <= 50) score += 50;  // Within 50km
    }

    // 3. Product Popularity & Engagement
    if (product.totalSales) {
      score += Math.min(product.totalSales * 10, 200); // Max 200 points
    }
    
    if (product.rating?.average) {
      score += product.rating.average * 20; // 5-star = 100 points
    }
    
    if (product.rating?.count) {
      score += Math.min(product.rating.count * 2, 100); // Max 100 points
    }
    
    if (product.favoriteCount) {
      score += Math.min(product.favoriteCount * 5, 100); // Max 100 points
    }

    // 4. Seller Quality Score
    if (product.artisan?.rating?.average) {
      score += product.artisan.rating.average * 30; // 5-star = 150 points
    }
    
    if (product.artisan?.isVerified) {
      score += 50;
    }
    
    if (product.artisan?.deliveryStats?.onTimeRate) {
      score += product.artisan.deliveryStats.onTimeRate * 100; // 100% = 100 points
    }
    
    if (product.artisan?.complaintRate) {
      score -= product.artisan.complaintRate * 200; // Penalty for complaints
    }

    // 5. Recency of Listing
    const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 7) score += 50;      // First week
    else if (daysSinceCreated <= 30) score += 30; // First month
    else if (daysSinceCreated <= 90) score += 15; // First quarter

    // 6. Featured/Curated Products
    if (product.isFeatured) score += 200;
    if (product.isSeasonal) score += 100;
    if (product.isCurated) score += 150;
    
    // Special badges
    if (product.badges?.includes('trending')) score += 100;
    if (product.badges?.includes('bestseller')) score += 150;
    if (product.badges?.includes('new')) score += 80;

    // 7. Quality Indicators
    if (product.isOrganic) score += 30;
    if (productName.includes('fresh')) score += 20;
    if (productName.includes('organic')) score += 20;
    if (productName.includes('artisan')) score += 20;
    if (productName.includes('homemade')) score += 20;
    
    // 8. Stock and Availability
    if (product.image) score += 10;
    if (product.stock > 10) score += 5;
    
    // 9. Starter boost for new products (first 30 days)
    if (daysSinceCreated <= 30) {
      score += Math.max(50 - daysSinceCreated, 0); // Decreasing boost over time
    }

    // 10. Proximity/Distance Scoring (if user location available)
    let distance = null;
    let proximityScore = 0;
    
    if (userLat && userLng && product.artisan && product.artisan.coordinates) {
      distance = geocodingService.calculateDistance(
        parseFloat(userLat),
        parseFloat(userLng),
        product.artisan.coordinates.latitude,
        product.artisan.coordinates.longitude
      );
      
      // Calculate proximity score (0-1, higher is better)
      if (distance !== null) {
        const maxDistance = parseFloat(proximityRadius) || 50;
        proximityScore = Math.exp(-distance / maxDistance);
        score += Math.round(proximityScore * 200); // Max 200 points for proximity
        
        // Add distance information to product
        product.distance = distance;
        product.formattedDistance = geocodingService.formatDistance(distance);
        product.proximityScore = proximityScore;
      }
    }

    return { 
      ...product.toObject(), 
      enhancedScore: Math.round(score),
      distance: distance,
      formattedDistance: distance ? geocodingService.formatDistance(distance) : null,
      proximityScore: proximityScore
    };
  }).sort((a, b) => b.enhancedScore - a.enhancedScore);
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
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
    }).populate('artisan', 'artisanName type description address deliveryOptions');
    
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
      .populate('artisan', 'artisanName type description address deliveryOptions');
    
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
    
    // Transform products to include artisan information
    const productsWithArtisan = rankedProducts.map((product) => {
      const productObj = product.toObject ? product.toObject() : product;
      
      // Extract artisan information directly from populated field
      let artisanInfo = null;
      if (product.artisan && product.artisan.artisanName) {
        artisanInfo = { 
          _id: product.artisan._id,
          artisanName: product.artisan.artisanName,
          type: product.artisan.type,
          address: product.artisan.address,
          deliveryOptions: product.artisan.deliveryOptions
        };
      } else {
        // Fallback if no artisan data
        artisanInfo = { 
          _id: null,
          artisanName: 'Unknown Artisan',
          type: 'other',
          address: null,
          deliveryOptions: null
        };
      }
      
      productObj.artisan = artisanInfo;
      return productObj;
    });
    
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

// Enhanced search endpoint with sophisticated ranking
router.get('/enhanced-search', async (req, res) => {
  try {
    const { 
      search, 
      userLat, 
      userLng, 
      proximityRadius = 10,
      category, 
      subcategory, 
      tags, 
      organic, 
      glutenFree, 
      vegan, 
      halal,
      minPrice,
      maxPrice,
      enhancedRanking = 'true'
    } = req.query;

    let query = { status: 'active' };
    
    // Build search query with exact matching priority
    if (search) {
      const searchTerms = search.toLowerCase().trim().split(/\s+/);
      const expandedTerms = searchTerms.flatMap(term => expandSearchTerms(term));
      
      // Prioritize exact matches
      query.$or = [
        // 1. Exact name matches (highest priority)
        { name: { $regex: `^${search}$`, $options: 'i' } },
        // 2. Name starts with search term
        { name: { $regex: `^${search}`, $options: 'i' } },
        // 3. Exact word boundary matches
        ...searchTerms.map(term => ({ name: { $regex: `\\b${term}\\b`, $options: 'i' } })),
        // 4. Name contains search term
        { name: { $regex: search, $options: 'i' } },
        // 5. Expanded term matches in name
        ...expandedTerms.map(term => ({ name: { $regex: term, $options: 'i' } })),
        // 6. Tag exact matches
        { tags: { $in: searchTerms.map(term => new RegExp(`^${term}$`, 'i')) } },
        // 7. Tag contains matches
        { tags: { $in: searchTerms.map(term => new RegExp(term, 'i')) } },
        // 8. Category exact match
        { category: { $regex: `^${search}$`, $options: 'i' } },
        // 9. Category contains
        { category: { $regex: search, $options: 'i' } },
        // 10. Description matches (lowest priority)
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply filters
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    if (organic === 'true') query.isOrganic = true;
    if (glutenFree === 'true') query.isGlutenFree = true;
    if (vegan === 'true') query.isVegan = true;
    if (halal === 'true') query.isHalal = true;
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Get products with artisan information
    let products = await Product.find(query)
      .populate('artisan', 'artisanName type description address deliveryOptions rating isVerified');

    // Enhanced ranking algorithm
    if (enhancedRanking === 'true') {
      products = await applyEnhancedRanking(products, search, userLat, userLng, proximityRadius);
    }

    res.json({
      products,
      searchMetadata: {
        query: search,
        totalResults: products.length,
        userLocation: userLat && userLng ? 'available' : 'unavailable',
        enhancedRanking: enhancedRanking === 'true',
        rankingFactors: {
          exactMatch: true,
          proximity: !!userLat,
          quality: true,
          engagement: true,
          recency: true,
          featured: true
        }
      }
    });
  } catch (error) {
    console.error('Enhanced search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enhanced search suggestions
router.get('/enhanced-suggestions', async (req, res) => {
  try {
    const { q, userLat, userLng } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchTerm = q.toLowerCase().trim();
    const expandedTerms = expandSearchTerms(searchTerm);
    
    // Get suggestions with ranking
    const suggestions = await Product.aggregate([
      {
        $match: {
          status: 'active',
          $or: [
            { name: { $regex: `^${searchTerm}`, $options: 'i' } },
            { name: { $regex: `\\b${searchTerm}`, $options: 'i' } },
            { category: { $regex: `^${searchTerm}$`, $options: 'i' } },
            { tags: { $in: expandedTerms.map(term => new RegExp(`^${term}$`, 'i')) } }
          ]
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $unwind: { path: '$artisan', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          relevanceScore: {
            $sum: [
              // Exact name match
              { $cond: [{ $eq: [{ $toLower: '$name' }, searchTerm] }, 1000, 0] },
              // Name starts with
              { $cond: [{ $regexMatch: { input: { $toLower: '$name' }, regex: `^${searchTerm}` } }, 500, 0] },
              // Category exact match
              { $cond: [{ $eq: [{ $toLower: '$category' }, searchTerm] }, 300, 0] },
              // Tag exact match
              { $cond: [{ $in: [searchTerm, '$tags'] }, 200, 0] },
              // Rating boost
              { $multiply: ['$rating.average', 20] },
              // Recent boost
              { $cond: [{ $lt: [{ $subtract: [new Date(), '$createdAt'] }, 7 * 24 * 60 * 60 * 1000] }, 50, 0] }
            ]
          }
        }
      },
      {
        $sort: { relevanceScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $group: {
          _id: '$name',
          category: { $first: '$category' },
          relevanceScore: { $first: '$relevanceScore' },
          artisan: { $first: '$artisan' }
        }
      },
      {
        $project: {
          name: '$_id',
          category: 1,
          relevanceScore: 1,
          artisan: 1
        }
      }
    ]);
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Enhanced suggestions error:', error);
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
      .populate('artisan', 'artisanName type description address deliveryOptions');
    
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
        .populate('artisan', 'artisanName type description address deliveryOptions')
        .sort(sortOptions);
    }
    
    // Transform products to include artisan information
    const productsWithArtisan = products.map((product) => {
      const productObj = product.toObject ? product.toObject() : product;
      
      // Extract artisan information directly from populated field
      let artisanInfo = null;
      if (product.artisan && product.artisan.artisanName) {
        artisanInfo = { 
          _id: product.artisan._id,
          artisanName: product.artisan.artisanName,
          type: product.artisan.type,
          address: product.artisan.address,
          deliveryOptions: product.artisan.deliveryOptions
        };
      } else {
        // Fallback if no artisan data
        artisanInfo = { 
          _id: null,
          artisanName: 'Unknown Artisan',
          type: 'other',
          address: null,
          deliveryOptions: null
        };
      }
      
      productObj.artisan = artisanInfo;
      return productObj;
    });
    
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

// Get artisan's products (requires authentication)
router.get('/my-products', verifyToken, async (req, res) => {
  try {
    // Find the artisan profile for the current user
    const Artisan = require('../models/artisan');
    const artisan = await Artisan.findOne({ user: req.user._id });
    
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }
    
    const products = await Product.find({ artisan: artisan._id })
      .populate('artisan', 'artisanName type address deliveryOptions')
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching artisan products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get products by artisan ID (public endpoint)
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const products = await Product.find({ 
      artisan: req.params.artisanId,
      status: { $in: ['active', 'out_of_stock'] } // Include both active and out-of-stock products
    })
    .populate('artisan', 'artisanName type address deliveryOptions')
    .sort({ createdAt: -1 });
    
    // Transform products to include artisan information
    const productsWithArtisan = products.map((product) => {
      const productObj = product.toObject ? product.toObject() : product;
      
      // Extract artisan information directly from populated field
      let artisanInfo = null;
      if (product.artisan && product.artisan.artisanName) {
        artisanInfo = { 
          _id: product.artisan._id,
          artisanName: product.artisan.artisanName,
          type: product.artisan.type,
          address: product.artisan.address,
          deliveryOptions: product.artisan.deliveryOptions
        };
      } else {
        // Fallback if no artisan data
        artisanInfo = { 
          _id: null,
          artisanName: 'Unknown Artisan',
          type: 'other',
          address: null,
          deliveryOptions: null
        };
      }
      
      productObj.artisan = artisanInfo;
      return productObj;
    });
    
    res.json(productsWithArtisan);
  } catch (error) {
    console.error('Error fetching artisan products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ 
      isFeatured: true, 
      status: 'active'
    })
    .populate('artisan', 'artisanName type address deliveryOptions rating')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean(); // Use lean() for better performance

    // Transform products to include artisan information
    const productsWithArtisan = featuredProducts.map((product) => {
      // Extract artisan information directly from populated field
      let artisanInfo = null;
      if (product.artisan && product.artisan.artisanName) {
        artisanInfo = { 
          _id: product.artisan._id,
          artisanName: product.artisan.artisanName,
          type: product.artisan.type,
          address: product.artisan.address,
          deliveryOptions: product.artisan.deliveryOptions,
          rating: product.artisan.rating
        };
      } else {
        // Fallback if no artisan data
        artisanInfo = { 
          _id: null,
          artisanName: 'Unknown Artisan',
          type: 'other',
          address: null,
          deliveryOptions: null,
          rating: null
        };
      }
      
      return {
        ...product,
        artisan: artisanInfo
      };
    });

    res.json({
      success: true,
      products: productsWithArtisan,
      count: productsWithArtisan.length
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching featured products' 
    });
  }
});

// Get popular products (most bought in the past month)
router.get('/popular', async (req, res) => {
  try {
    const Order = require('../models/order');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Aggregate orders to get product purchase counts from the past month
    const popularProducts = await Order.aggregate([
      // Match orders from the past 30 days with delivered status
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['delivered', 'confirmed', 'preparing', 'ready', 'delivering'] }
        }
      },
      // Unwind the items array to work with individual products
      {
        $unwind: '$items'
      },
      // Group by product and sum quantities
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      // Sort by total orders (most popular first) - number of unique purchases
      {
        $sort: { totalOrders: -1 }
      },
      // Limit to top products
      {
        $limit: 20
      },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      // Unwind the product array
      {
        $unwind: '$product'
      },
      // Match only active products
      {
        $match: {
          'product.status': 'active'
        }
      },
      // Lookup artisan information
      {
        $lookup: {
          from: 'artisans',
          localField: 'product.artisan',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      // Unwind artisan array
      {
        $unwind: '$artisan'
      },
      // Project the final structure
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          description: '$product.description',
          price: '$product.price',
          category: '$product.category',
          subcategory: '$product.subcategory',
          productType: '$product.productType',
          stock: '$product.stock',
          unit: '$product.unit',
          weight: '$product.weight',
          expiryDate: '$product.expiryDate',
          image: '$product.image',
          images: '$product.images',
          tags: '$product.tags',
          isOrganic: '$product.isOrganic',
          isGlutenFree: '$product.isGlutenFree',
          isVegan: '$product.isVegan',
          isHalal: '$product.isHalal',
          leadTimeHours: '$product.leadTimeHours',
          leadTime: '$product.leadTime',
          leadTimeUnit: '$product.leadTimeUnit',
          nextAvailableDate: '$product.nextAvailableDate',
          availableQuantity: '$product.availableQuantity',
          status: '$product.status',
          createdAt: '$product.createdAt',
          updatedAt: '$product.updatedAt',
          artisan: {
            _id: '$artisan._id',
            artisanName: '$artisan.artisanName',
            type: '$artisan.type',
            address: '$artisan.address',
            deliveryOptions: '$artisan.deliveryOptions',
            rating: '$artisan.rating'
          },
          popularity: {
            totalQuantity: '$totalQuantity',
            totalOrders: '$totalOrders',
            totalRevenue: '$totalRevenue'
          }
        }
      }
    ]);

    // Transform products to include artisan information
    const productsWithArtisan = popularProducts.map((product) => {
      // Extract artisan information directly from populated field
      let artisanInfo = null;
      if (product.artisan && product.artisan.artisanName) {
        artisanInfo = { 
          _id: product.artisan._id,
          artisanName: product.artisan.artisanName,
          type: product.artisan.type,
          address: product.artisan.address,
          deliveryOptions: product.artisan.deliveryOptions,
          rating: product.artisan.rating
        };
      } else {
        // Fallback if no artisan data
        artisanInfo = { 
          _id: null,
          artisanName: 'Unknown Artisan',
          type: 'other',
          address: null,
          deliveryOptions: null,
          rating: null
        };
      }
      
      return {
        ...product,
        artisan: artisanInfo
      };
    });

    res.json({
      success: true,
      products: productsWithArtisan,
      count: productsWithArtisan.length,
      timeRange: 'past_30_days',
      popularityMetric: 'number_of_orders'
    });
  } catch (error) {
    console.error('Error fetching popular products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching popular products' 
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('artisan', 'artisanName type address deliveryOptions');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Transform product to include artisan information
    const productObj = product.toObject();
    if (product.artisan) {
      productObj.artisan = {
        _id: product.artisan._id,
        artisanName: product.artisan.artisanName,
        type: product.artisan.type,
        address: product.artisan.address,
        deliveryOptions: product.artisan.deliveryOptions
      };
    } else {
      productObj.artisan = {
        _id: null,
        artisanName: 'Unknown Artisan',
        type: 'other',
        address: null,
        deliveryOptions: null
      };
    }
    
    res.json(productObj);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new product (requires authentication)
router.post('/', verifyToken, checkProductGeographicRestrictions, upload.single('image'), async (req, res) => {
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
      productType,
      stock,
      lowStockThreshold,
      leadTime,
      leadTimeUnit,
      maxOrderQuantity,
      totalCapacity,
      capacityPeriod,
      scheduleType,
      scheduleDetails,
      nextAvailableDate,
      nextAvailableTime,
      availableQuantity,
      unit,
      weight,
      expiryDate,
      tags,
      isOrganic,
      isGlutenFree,
      isVegan,
      isHalal,
      isKosher,
      isDairyFree,
      isNutFree,
      isSoyFree,
      isSugarFree,
      isLowCarb,
      isKetoFriendly,
      isPaleo,
      isRaw
    } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !category || !productType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate and normalize category
    const normalizedCategory = normalizeCategoryKey(category);
    if (!normalizedCategory) {
      return res.status(400).json({ 
        message: `Invalid category: ${category}. Please use a valid category key.` 
      });
    }

    // Validate and normalize subcategory if provided
    let normalizedSubcategory = null;
    if (subcategory) {
      normalizedSubcategory = normalizeSubcategoryKey(normalizedCategory, subcategory);
      if (!normalizedSubcategory) {
        return res.status(400).json({ 
          message: `Invalid subcategory: ${subcategory} for category: ${normalizedCategory}. Please use a valid subcategory key.` 
        });
      }
    }

    // Validate product type specific fields
    if (productType === 'ready_to_ship' && (stock === undefined || stock === null || stock === '')) {
      return res.status(400).json({ message: 'Stock is required for ready-to-ship products' });
    }
    if (productType === 'made_to_order' && (!leadTime || !leadTimeUnit || !totalCapacity)) {
      return res.status(400).json({ message: 'Lead time, unit, and total capacity are required for made-to-order products' });
    }
    if (productType === 'scheduled_order' && (!availableQuantity || !nextAvailableDate || !nextAvailableTime || !scheduleType)) {
      return res.status(400).json({ message: 'Available quantity, next available date, next available time, and schedule type are required for scheduled order products' });
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
    
    // Check if user has an artisan profile
    const Artisan = require('../models/artisan');
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    
    if (!artisanProfile) {
      return res.status(400).json({ message: 'You must have an artisan profile to create products' });
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category: normalizedCategory,
      subcategory: normalizedSubcategory,
      productType: productType || 'ready_to_ship',
      unit: unit || 'piece',
      weight: weight ? parseFloat(weight) : null,
      expiryDate: expiryDate || null,
      image: imageUrl,
      tags: parsedTags,
      isOrganic: isOrganic === 'true' || isOrganic === true,
      isGlutenFree: isGlutenFree === 'true' || isGlutenFree === true,
      isVegan: isVegan === 'true' || isVegan === true,
      isHalal: isHalal === 'true' || isHalal === true,
      isKosher: isKosher === 'true' || isKosher === true,
      isDairyFree: isDairyFree === 'true' || isDairyFree === true,
      isNutFree: isNutFree === 'true' || isNutFree === true,
      isSoyFree: isSoyFree === 'true' || isSoyFree === true,
      isSugarFree: isSugarFree === 'true' || isSugarFree === true,
      isLowCarb: isLowCarb === 'true' || isLowCarb === true,
      isKetoFriendly: isKetoFriendly === 'true' || isKetoFriendly === true,
      isPaleo: isPaleo === 'true' || isPaleo === true,
      isRaw: isRaw === 'true' || isRaw === true,
      artisan: artisanProfile._id,
      // Product type specific fields
      ...(productType === 'ready_to_ship' && {
        stock: parseInt(stock),
        lowStockThreshold: parseInt(lowStockThreshold) || 5
      }),
      ...(productType === 'made_to_order' && {
        leadTime: parseInt(leadTime),
        leadTimeUnit: leadTimeUnit || 'days',
        maxOrderQuantity: parseInt(maxOrderQuantity) || 10,
        totalCapacity: parseInt(totalCapacity) || 10,
        capacityPeriod: capacityPeriod || 'daily'
      }),
      ...(productType === 'scheduled_order' && {
        scheduleType: scheduleType,
        scheduleDetails: scheduleDetails ? (typeof scheduleDetails === 'string' && scheduleDetails !== '[object Object]' ? JSON.parse(scheduleDetails) : (typeof scheduleDetails === 'object' ? scheduleDetails : { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 })) : { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 },
        nextAvailableDate: nextAvailableDate ? new Date(nextAvailableDate) : null,
        nextAvailableTime: nextAvailableTime || '09:00',
        availableQuantity: parseInt(availableQuantity)
      })
    });
    
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product (requires authentication and ownership)
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    console.log('🔍 Updating product with data:', req.body);
    console.log('🔍 File:', req.file);
    console.log('🔍 Product ID:', req.params.id);
    console.log('🔍 User ID:', req.user?._id);
    console.log('🔍 totalCapacity in request:', req.body.totalCapacity);
    console.log('🔍 availableQuantity in request:', req.body.availableQuantity);
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product by checking if they have the artisan profile
    const Artisan = require('../models/artisan');
    const userArtisan = await Artisan.findOne({ user: req.user._id });
    
    if (!userArtisan || product.artisan.toString() !== userArtisan._id.toString()) {
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
      isKosher,
      isDairyFree,
      isNutFree,
      isSoyFree,
      isSugarFree,
      isLowCarb,
      isKetoFriendly,
      isPaleo,
      isRaw,
      status,
      leadTimeHours,
      // New product type fields
      productType,
      lowStockThreshold,
      leadTime,
      leadTimeUnit,
      maxOrderQuantity,
      totalCapacity,
      capacityPeriod,
      scheduleType,
      scheduleDetails,
      nextAvailableDate,
      nextAvailableTime,
      availableQuantity
    } = req.body;
    
    // Validate and normalize category if provided
    if (category !== undefined) {
      const normalizedCategory = normalizeCategoryKey(category);
      if (!normalizedCategory) {
        return res.status(400).json({ 
          message: `Invalid category: ${category}. Please use a valid category key.` 
        });
      }
      product.category = normalizedCategory;
    }

    // Validate and normalize subcategory if provided
    if (subcategory !== undefined) {
      const currentCategory = product.category; // Use current category if not being updated
      const normalizedSubcategory = normalizeSubcategoryKey(currentCategory, subcategory);
      if (!normalizedSubcategory) {
        return res.status(400).json({ 
          message: `Invalid subcategory: ${subcategory} for category: ${currentCategory}. Please use a valid subcategory key.` 
        });
      }
      product.subcategory = normalizedSubcategory;
    }

    // Update other fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (unit !== undefined) product.unit = unit;
    if (weight !== undefined) product.weight = weight ? parseFloat(weight) : null;
    if (expiryDate !== undefined) product.expiryDate = expiryDate || null;
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : JSON.parse(tags || '[]');
    if (isOrganic !== undefined) product.isOrganic = isOrganic === 'true' || isOrganic === true;
    if (isGlutenFree !== undefined) product.isGlutenFree = isGlutenFree === 'true' || isGlutenFree === true;
    if (isVegan !== undefined) product.isVegan = isVegan === 'true' || isVegan === true;
    if (isHalal !== undefined) product.isHalal = isHalal === 'true' || isHalal === true;
    if (isKosher !== undefined) product.isKosher = isKosher === 'true' || isKosher === true;
    if (isDairyFree !== undefined) product.isDairyFree = isDairyFree === 'true' || isDairyFree === true;
    if (isNutFree !== undefined) product.isNutFree = isNutFree === 'true' || isNutFree === true;
    if (isSoyFree !== undefined) product.isSoyFree = isSoyFree === 'true' || isSoyFree === true;
    if (isSugarFree !== undefined) product.isSugarFree = isSugarFree === 'true' || isSugarFree === true;
    if (isLowCarb !== undefined) product.isLowCarb = isLowCarb === 'true' || isLowCarb === true;
    if (isKetoFriendly !== undefined) product.isKetoFriendly = isKetoFriendly === 'true' || isKetoFriendly === true;
    if (isPaleo !== undefined) product.isPaleo = isPaleo === 'true' || isPaleo === true;
    if (isRaw !== undefined) product.isRaw = isRaw === 'true' || isRaw === true;
    if (status !== undefined) product.status = status;
    if (leadTimeHours !== undefined) product.leadTimeHours = parseInt(leadTimeHours);
    
    // Update new product type fields
    if (productType !== undefined) product.productType = productType;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = parseInt(lowStockThreshold);
    if (leadTime !== undefined) product.leadTime = parseInt(leadTime);
    if (leadTimeUnit !== undefined) product.leadTimeUnit = leadTimeUnit;

    if (maxOrderQuantity !== undefined) product.maxOrderQuantity = parseInt(maxOrderQuantity);
    if (totalCapacity !== undefined) {
      console.log('🔍 Updating totalCapacity:', totalCapacity, 'to:', parseInt(totalCapacity));
      product.totalCapacity = parseInt(totalCapacity);
    }
    if (capacityPeriod !== undefined) product.capacityPeriod = capacityPeriod;
    if (scheduleType !== undefined) product.scheduleType = scheduleType;
    if (scheduleDetails !== undefined) {
      if (typeof scheduleDetails === 'string' && scheduleDetails !== '[object Object]') {
        product.scheduleDetails = JSON.parse(scheduleDetails);
      } else if (typeof scheduleDetails === 'object') {
        product.scheduleDetails = scheduleDetails;
      } else {
        product.scheduleDetails = { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 };
      }
    }
    if (nextAvailableDate !== undefined) product.nextAvailableDate = nextAvailableDate ? new Date(nextAvailableDate) : null;
    if (nextAvailableTime !== undefined) product.nextAvailableTime = nextAvailableTime;
    if (availableQuantity !== undefined) {
      console.log('🔍 Updating availableQuantity:', availableQuantity, 'to:', parseInt(availableQuantity));
      product.availableQuantity = parseInt(availableQuantity);
    }
    
    // Clear old fields when switching product types (only if productType is being changed)
    if (productType !== undefined && productType !== product.productType) {
      if (productType === 'ready_to_ship') {
        product.leadTime = undefined;
        product.leadTimeUnit = undefined;
        product.maxOrderQuantity = undefined;
        product.scheduleType = undefined;
        product.scheduleDetails = undefined;
        product.nextAvailableDate = undefined;
        product.nextAvailableTime = undefined;
        product.availableQuantity = undefined;
      } else if (productType === 'made_to_order') {
        product.stock = undefined;
        product.lowStockThreshold = undefined;
        product.scheduleType = undefined;
        product.scheduleDetails = undefined;
        product.nextAvailableDate = undefined;
        product.nextAvailableTime = undefined;
        product.availableQuantity = undefined;
      } else if (productType === 'scheduled_order') {
        product.stock = undefined;
        product.lowStockThreshold = undefined;
        product.leadTime = undefined;
        product.leadTimeUnit = undefined;
        product.maxOrderQuantity = undefined;
      }
    }
    
    // Handle image upload
    if (req.file) {
      product.image = `/uploads/products/${req.file.filename}`;
    }
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Product data being updated:', req.body);
    console.error('❌ Product ID:', req.params.id);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete product (requires authentication and ownership)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product by checking if they have the artisan profile
    const Artisan = require('../models/artisan');
    const userArtisan = await Artisan.findOne({ user: req.user._id });
    
    if (!userArtisan || product.artisan.toString() !== userArtisan._id.toString()) {
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

// Update product inventory (for artisan management)
router.patch('/:id/inventory', verifyToken, async (req, res) => {
  try {
    const { stock, totalCapacity, remainingCapacity, availableQuantity, status } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user owns the product by checking if they have the artisan profile
    const Artisan = require('../models/artisan');
    const userArtisan = await Artisan.findOne({ user: req.user._id });
    
    if (!userArtisan || product.artisan.toString() !== userArtisan._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }
    
    // Update inventory based on product type
    if (product.productType === 'ready_to_ship' && stock !== undefined) {
      product.stock = parseInt(stock);
      
      // Update status based on stock
      if (product.stock === 0) {
        product.status = 'out_of_stock';
      } else if (product.status === 'out_of_stock' && product.stock > 0) {
        product.status = 'active';
      }
    } else if (product.productType === 'made_to_order') {
      if (totalCapacity !== undefined) {
        product.totalCapacity = parseInt(totalCapacity);
      }
      if (remainingCapacity !== undefined) {
        product.remainingCapacity = parseInt(remainingCapacity);
      }
      
      // Update status based on remaining capacity
      const currentRemaining = product.remainingCapacity || 0;
      if (currentRemaining === 0) {
        product.status = 'out_of_stock';
      } else if (product.status === 'out_of_stock' && currentRemaining > 0) {
        product.status = 'active';
      }
    } else if (product.productType === 'scheduled_order' && availableQuantity !== undefined) {
      product.availableQuantity = parseInt(availableQuantity);
      
      // Update status based on available quantity
      if (product.availableQuantity === 0) {
        product.status = 'out_of_stock';
      } else if (product.status === 'out_of_stock' && product.availableQuantity > 0) {
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

// ==================== INVENTORY MANAGEMENT ROUTES ====================

/**
 * Update product inventory
 * PUT /api/products/:id/inventory
 */
router.put('/:id/inventory', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const inventoryData = req.body;
    
    const updatedProduct = await inventoryService.updateInventory(id, inventoryData);
    
    res.json({
      success: true,
      message: 'Inventory updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Update product capacity (for made-to-order products)
 * PUT /api/products/:id/capacity
 */
router.put('/:id/capacity', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { totalCapacity } = req.body;
    
    if (!totalCapacity || totalCapacity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Total capacity must be at least 1'
      });
    }
    
    const updatedProduct = await inventoryService.updateCapacity(id, totalCapacity);
    
    res.json({
      success: true,
      message: 'Capacity updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating capacity:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Check and restore inventory for all products
 * POST /api/products/inventory/restore
 */
router.post('/inventory/restore', verifyToken, async (req, res) => {
  try {
    const updates = await inventoryService.checkAndRestoreInventory();
    
    res.json({
      success: true,
      message: `${updates.length} product(s) inventory restored`,
      updates: updates
    });
  } catch (error) {
    console.error('Error restoring inventory:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Get inventory summary
 * GET /api/products/inventory/summary
 */
router.get('/inventory/summary', verifyToken, async (req, res) => {
  try {
    const { artisanId } = req.query;
    const summary = await inventoryService.getInventorySummary(artisanId);
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Get inventory data for a specific product
 * GET /api/products/:id/inventory
 */
router.get('/:id/inventory', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const inventoryData = inventoryService.getProductInventoryData(product);
    
    res.json({
      success: true,
      inventory: inventoryData
    });
  } catch (error) {
    console.error('Error getting product inventory:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;


