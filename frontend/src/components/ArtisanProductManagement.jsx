import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  StarIcon,
  XMarkIcon,
  SparklesIcon,
  PlusIcon,
  ClockIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { promotionalService } from '../services/promotionalService';
import { productService } from '../services/productService';

export default function ArtisanProductManagement() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionData, setPromotionData] = useState({
    featureType: '',
    durationDays: 7,
    customText: '',
    searchKeywords: '',
    categoryBoost: []
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkArtisanAccess();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      applyFiltersAndSort();
    }
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Product management functions
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (selectedProduct) {
        // Update existing product
        const updatedProduct = await productService.updateProduct(selectedProduct._id, productData);
        setProducts(products.map(p => p._id === selectedProduct._id ? updatedProduct : p));
        toast.success('Product updated successfully!');
      } else {
        // Add new product
        const newProduct = await productService.createProduct(productData);
        setProducts([...products, newProduct]);
        toast.success('Product added successfully!');
      }
      setShowProductModal(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(productId);
        setProducts(products.filter(p => p._id !== productId));
        toast.success('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleStockUpdate = async (productId, newStock) => {
    try {
      const updatedProduct = await productService.updateProduct(productId, { stock: newStock });
      setProducts(products.map(p => p._id === productId ? updatedProduct : p));
      toast.success('Stock updated successfully!');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const checkArtisanAccess = async () => {
    try {
      const token = authToken.getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const profile = await getProfile();
      if (!['artisan', 'producer', 'food_maker'].includes(profile.role)) {
        toast.error('Access denied. Artisan privileges required.');
        navigate('/');
        return;
      }

      setUser(profile);
      loadProducts();
    } catch (error) {
      console.error('Error checking artisan access:', error);
      toast.error('Authentication error');
      navigate('/login');
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      // Load artisan's products - you'll need to implement this service
      const productsData = await loadArtisanProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const loadArtisanProducts = async () => {
    // Mock data for now - replace with actual API call
    return [
      {
        _id: '1',
        name: 'Artisan Bread',
        description: 'Fresh baked artisan bread',
        price: 5.99,
        category: 'bakery',
        status: 'active',
        stock: 20,
        image: null,
        createdAt: new Date(),
        promotionalFeatures: []
      },
      {
        _id: '2',
        name: 'Organic Honey',
        description: 'Pure organic honey from local bees',
        price: 12.99,
        category: 'produce',
        status: 'active',
        stock: 15,
        image: null,
        createdAt: new Date(),
        promotionalFeatures: []
      },
      {
        _id: '3',
        name: 'Fresh Milk',
        description: 'Farm fresh whole milk',
        price: 4.99,
        category: 'dairy',
        status: 'active',
        stock: 30,
        image: null,
        createdAt: new Date(),
        promotionalFeatures: []
      }
    ];
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(product => product.status === selectedStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  };

  const handlePromotionSubmit = async () => {
    try {
      if (!promotionData.featureType) {
        toast.error('Please select a promotional feature');
        return;
      }

      if (!promotionData.durationDays || promotionData.durationDays < 1) {
        toast.error('Please enter a valid duration');
        return;
      }

      const featureData = {
        productId: selectedProduct._id,
        featureType: promotionData.featureType,
        durationDays: parseInt(promotionData.durationDays),
        customText: promotionData.customText.trim() || undefined,
        searchKeywords: promotionData.featureType === 'sponsored_product' ? promotionData.searchKeywords.split(',').map(k => k.trim()).filter(k => k) : [],
        categoryBoost: promotionData.featureType === 'sponsored_product' ? promotionData.categoryBoost : []
      };

      const result = await promotionalService.createPromotionalFeature(featureData);
      
      toast.success('Promotional feature request submitted successfully! Awaiting admin approval.');
      
      // Refresh products to show updated promotional status
      loadProducts();
      
      setShowPromotionModal(false);
      setSelectedProduct(null);
      setPromotionData({
        featureType: '',
        durationDays: 7,
        customText: '',
        searchKeywords: '',
        categoryBoost: []
      });
    } catch (error) {
      toast.error(error.message || 'Failed to submit promotional feature request');
    }
  };

  const getPromotionalPricing = () => {
    return {
      featured_product: {
        price: 25,
        currency: 'USD',
        duration: 'Flexible (1-365 days)',
        description: 'Featured on homepage with distance-based ranking',
        benefits: [
          'Homepage visibility',
          'Distance-based ranking',
          'Priority placement',
          'Admin approval required'
        ]
      },
      sponsored_product: {
        price: 40,
        currency: 'USD',
        duration: '7 days',
        description: 'Enhanced search visibility and ranking',
        benefits: [
          'Search result boost',
          'Keyword targeting',
          'Category boost',
          'Proximity boost',
          'Admin approval required'
        ]
      }
    };
  };

  const calculatePromotionCost = (featureType, durationDays) => {
    const pricing = getPromotionalPricing();
    
    if (featureType === 'featured_product') {
      return pricing.featured_product.price;
    } else if (featureType === 'sponsored_product') {
      // Sponsored products are $40 for 7 days, additional days at $5/day
      const baseCost = pricing.sponsored_product.price;
      const additionalDays = Math.max(0, durationDays - 7);
      const additionalCost = additionalDays * 5;
      return baseCost + additionalCost;
    }
    
    return 0;
  };

  const getPromotionStatus = (product) => {
    if (!product.promotionalFeatures || product.promotionalFeatures.length === 0) {
      return { status: 'none', text: 'No Promotions', color: 'text-gray-500' };
    }

    const activeFeatures = product.promotionalFeatures.filter(feature => 
      feature.status === 'active' || feature.status === 'pending'
    );

    if (activeFeatures.length === 0) {
      return { status: 'none', text: 'No Active Promotions', color: 'text-gray-500' };
    }

    const featuredCount = activeFeatures.filter(f => f.featureType === 'featured_product').length;
    const sponsoredCount = activeFeatures.filter(f => f.featureType === 'sponsored_product').length;

    if (featuredCount > 0 && sponsoredCount > 0) {
      return { status: 'both', text: 'Featured + Sponsored', color: 'text-purple-600' };
    } else if (featuredCount > 0) {
      return { status: 'featured', text: 'Featured Product', color: 'text-amber-600' };
    } else if (sponsoredCount > 0) {
      return { status: 'sponsored', text: 'Sponsored Product', color: 'text-purple-600' };
    }

    return { status: 'other', text: 'Promoted', color: 'text-blue-600' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D77A61]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#D77A61] rounded-full mb-6 shadow-lg">
                <CubeIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3 font-serif">My Product Management</h2>
              <p className="text-gray-600 text-lg">
                Manage your products and promotional features
              </p>
            </div>
            <button
              onClick={handleAddProduct}
              className="bg-[#D77A61] text-white px-6 py-3 rounded-lg hover:bg-[#C06A51] transition-colors duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Product</span>
            </button>
          </div>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <StarIcon className="w-5 h-5 text-amber-500" />
              <span className="font-medium">Featured Product: $25</span>
            </div>
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Sponsored Product: $40/7 days</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
              >
                <option value="all">All Categories</option>
                <option value="bakery">Bakery</option>
                <option value="dairy">Dairy</option>
                <option value="produce">Produce</option>
                <option value="meat">Meat</option>
                <option value="beverages">Beverages</option>
                <option value="snacks">Snacks</option>
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Products ({filteredProducts.length})
            </h3>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No products found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <div key={product._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">No Image</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPromotionStatus(product).color}`}>
                            {getPromotionStatus(product).text}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Category:</span>
                            <p className="capitalize">{product.category}</p>
                          </div>
                          <div>
                            <span className="font-medium">Price:</span>
                            <p>${product.price}</p>
                          </div>
                          <div>
                            <span className="font-medium">Stock:</span>
                            <p>{product.stock}</p>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <p>{new Date(product.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductModal(true);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowPromotionModal(true);
                        }}
                        className="p-2 text-purple-600 hover:text-purple-700 transition-colors"
                        title="Promote Product"
                      >
                        <SparklesIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promotion Modal */}
        {showPromotionModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Promote Your Product</h2>
                  <button
                    onClick={() => setShowPromotionModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-gray-600 mt-2">
                  Choose a promotional feature to increase your product's visibility
                </p>
              </div>

              {/* Product Info */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  {selectedProduct.image && (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">{selectedProduct.category}</p>
                    <p className="text-sm text-gray-600">${selectedProduct.price}</p>
                  </div>
                </div>
              </div>

              {/* Feature Selection */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Promotional Feature</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Featured Product Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      promotionData.featureType === 'featured_product'
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-200'
                    }`}
                    onClick={() => setPromotionData({...promotionData, featureType: 'featured_product'})}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <StarIcon className="w-6 h-6 text-amber-500" />
                      <h4 className="font-semibold text-gray-900">Featured Product</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Showcase your product on the homepage with distance-based ranking
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-amber-600">$25</span>
                      <span className="text-sm text-gray-500">One-time</span>
                    </div>
                  </div>

                  {/* Sponsored Product Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      promotionData.featureType === 'sponsored_product'
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-200'
                    }`}
                    onClick={() => setPromotionData({...promotionData, featureType: 'sponsored_product'})}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <SparklesIcon className="w-6 h-6 text-purple-500" />
                      <h4 className="font-semibold text-gray-900">Sponsored Product</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Boost search visibility with enhanced ranking and targeting
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-purple-600">$40</span>
                      <span className="text-sm text-gray-500">7 days</span>
                    </div>
                  </div>
                </div>

                {/* Feature Details */}
                {promotionData.featureType && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (days)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={promotionData.durationDays}
                          onChange={(e) => setPromotionData({...promotionData, durationDays: parseInt(e.target.value) || 1})}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                        />
                        <span className="text-sm text-gray-600">days</span>
                      </div>
                      {promotionData.featureType === 'sponsored_product' && promotionData.durationDays > 7 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Additional days: ${(promotionData.durationDays - 7) * 5}
                        </p>
                      )}
                    </div>

                    {/* Custom Text */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Text (optional)
                      </label>
                      <textarea
                        value={promotionData.customText}
                        onChange={(e) => setPromotionData({...promotionData, customText: e.target.value})}
                        placeholder="Add custom text for your promotion..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                        rows="2"
                      />
                    </div>

                    {/* Sponsored Product Specific Fields */}
                    {promotionData.featureType === 'sponsored_product' && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Keywords (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={promotionData.searchKeywords}
                            onChange={(e) => setPromotionData({...promotionData, searchKeywords: e.target.value})}
                            placeholder="bread, fresh, organic, local..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Keywords that will boost your product in search results
                          </p>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category Boost
                          </label>
                          <select
                            value={promotionData.categoryBoost}
                            onChange={(e) => setPromotionData({...promotionData, categoryBoost: [e.target.value]})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                          >
                            <option value="">Select category</option>
                            <option value="bakery">Bakery</option>
                            <option value="dairy">Dairy</option>
                            <option value="produce">Produce</option>
                            <option value="meat">Meat</option>
                            <option value="beverages">Beverages</option>
                            <option value="snacks">Snacks</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Cost Summary */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${calculatePromotionCost(promotionData.featureType, promotionData.durationDays)}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        Duration: {promotionData.durationDays} days
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        * Admin approval required before activation
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowPromotionModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromotionSubmit}
                    disabled={!promotionData.featureType}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      promotionData.featureType
                        ? 'bg-[#D77A61] text-white hover:bg-[#C06A51]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Add/Edit Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
              </div>

              <div className="p-6">
                <ProductForm
                  product={selectedProduct}
                  onSave={handleSaveProduct}
                  onCancel={() => setShowProductModal(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Product Form Component
const ProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    unit: product?.unit || 'piece',
    category: product?.category || 'bakery',
    subcategory: product?.subcategory || '',
    stock: product?.stock || '',
    weight: product?.weight || '',
    dimensions: product?.dimensions || '',
    allergens: product?.allergens || '',
    ingredients: product?.ingredients || '',
    image: product?.image || null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price *
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit *
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          >
            <option value="piece">Piece</option>
            <option value="kg">Kilogram</option>
            <option value="g">Gram</option>
            <option value="l">Liter</option>
            <option value="ml">Milliliter</option>
            <option value="dozen">Dozen</option>
            <option value="pack">Pack</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock *
          </label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          >
            <option value="bakery">Bakery</option>
            <option value="dairy">Dairy</option>
            <option value="produce">Produce</option>
            <option value="meat">Meat</option>
            <option value="beverages">Beverages</option>
            <option value="snacks">Snacks</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory
          </label>
          <input
            type="text"
            name="subcategory"
            value={formData.subcategory}
            onChange={handleChange}
            placeholder="e.g., Sourdough, Whole Grain"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight
          </label>
          <input
            type="text"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder="e.g., 500g, 1kg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dimensions
          </label>
          <input
            type="text"
            name="dimensions"
            value={formData.dimensions}
            onChange={handleChange}
            placeholder="e.g., 10x5x3 cm"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allergens
        </label>
        <input
          type="text"
          name="allergens"
          value={formData.allergens}
          onChange={handleChange}
          placeholder="e.g., Gluten, Dairy, Nuts"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ingredients
        </label>
        <textarea
          name="ingredients"
          value={formData.ingredients}
          onChange={handleChange}
          rows="2"
          placeholder="List main ingredients..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
        />
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[#D77A61] text-white rounded-lg hover:bg-[#C06A51] transition-colors"
        >
          {product ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
};
