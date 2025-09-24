import React, { useState, useEffect } from 'react';
import config from '../config/environment.js';
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
  CubeIcon,
  TruckIcon,
  CalendarIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { promotionalService } from '../services/promotionalService';
import walletService from '../services/walletService';
import { productService } from '../services/productService';
import { PRODUCT_CATEGORIES, getAllCategories, getAllSubcategories } from '../data/productReference';
import InventoryManagement, { InventoryDisplay } from './InventoryManagement';
import InventoryModel from '../models/InventoryModel';

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
    durationDays: 7
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Helper function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If it's a local path, prefix with backend URL
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
  };

  useEffect(() => {
    const initializeComponent = async () => {
      await checkArtisanAccess();
      // Check and restore inventory after loading products
      setTimeout(() => checkAndRestoreInventory(), 1000);
    };
    
    initializeComponent();
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
    // Get the most current product data from the products array
    const currentProduct = products.find(p => p._id === product._id) || product;
    setSelectedProduct(currentProduct);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      console.log('🔍 Saving product with data:', productData);
      console.log('🔍 Selected product ID:', selectedProduct?._id);
      
      if (selectedProduct) {
        // Update existing product
        console.log('🔍 Updating existing product...');
        const updatedProduct = await productService.updateProduct(selectedProduct._id, productData);
        setProducts(products.map(p => p._id === selectedProduct._id ? updatedProduct : p));
        toast.success('Product updated successfully!');
      } else {
        // Add new product
        console.log('🔍 Creating new product...');
        const newProduct = await productService.createProduct(productData);
        setProducts([...products, newProduct]);
        toast.success('Product added successfully!');
      }
      setShowProductModal(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('❌ Error saving product:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(`Failed to save product: ${error.response?.data?.message || error.message}`);
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

  // Unified inventory update handler using the new inventory system
  const handleInventoryUpdate = (updatedProduct) => {
    // Create a new object reference to ensure React detects the change
    const updatedProducts = products.map(p => 
      p._id === updatedProduct._id ? { ...updatedProduct } : { ...p }
    );
    setProducts(updatedProducts);
    
    // If we're currently editing this product, update the form data to stay in sync
    if (selectedProduct && selectedProduct._id === updatedProduct._id) {
      // Update the selectedProduct with the latest data
      setSelectedProduct(updatedProduct);
      
      // Update the form data to match the updated product
      setFormData(prev => ({
        ...prev,
        stock: updatedProduct.productType === 'made_to_order' ? (updatedProduct.totalCapacity || 0) :
               updatedProduct.productType === 'scheduled_order' ? (updatedProduct.availableQuantity || 0) :
               (updatedProduct.stock || 0),
        // Update capacity period if it exists
        capacityPeriod: updatedProduct.capacityPeriod || prev.capacityPeriod,
        // Update other inventory fields
        totalCapacity: updatedProduct.totalCapacity || prev.totalCapacity,
        remainingCapacity: updatedProduct.remainingCapacity || prev.remainingCapacity,
        availableQuantity: updatedProduct.availableQuantity || prev.availableQuantity
      }));
    }
    
    // The useEffect will automatically update filteredProducts when products change
  };

  // Function to check and restore inventory using the new InventoryModel
  const checkAndRestoreInventory = async () => {
    try {
      const restorationUpdates = InventoryModel.processInventoryRestoration(products);
      
      if (restorationUpdates.length > 0) {
        for (const update of restorationUpdates) {
          await productService.updateProduct(update.productId, update.updates);
        }
        // Reload products to reflect changes
        await loadProducts();
        toast.success(`${restorationUpdates.length} product(s) inventory restored!`);
      }
    } catch (error) {
      console.error('Error restoring inventory:', error);
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
    try {
      // Load actual artisan products from the backend using the authenticated user's artisan profile
      const products = await productService.getMyProducts();
      console.log('Loaded artisan products:', products);
      return products || [];
    } catch (error) {
      console.error('Error loading artisan products:', error);
      toast.error('Failed to load your products. Please try again.');
      return [];
    }
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
        durationDays: parseInt(promotionData.durationDays)
        // Keywords and categories are now automatically generated from product data
      };

      const result = await promotionalService.createPromotionalFeature(featureData);
      
      toast.success('Promotional feature activated successfully! Your product is now being promoted.');
      
      // Refresh products to show updated promotional status
      loadProducts();
      
      setShowPromotionModal(false);
      setSelectedProduct(null);
      setPromotionData({
        featureType: '',
        durationDays: 7
        // Keywords and categories are automatically generated
      });
    } catch (error) {
      toast.error(error.message || 'Failed to activate promotional feature');
    }
  };

  const [promotionalPricing, setPromotionalPricing] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch promotional pricing and wallet balance on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricing, walletResponse] = await Promise.all([
          promotionalService.getPromotionalPricing(),
          walletService.getWalletBalance()
        ]);
        
        setPromotionalPricing(pricing);
        
        if (walletResponse.success) {
          setWalletBalance(walletResponse.data.balance);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set fallback pricing
        setPromotionalPricing(promotionalService.getFallbackPricing());
      }
    };
    
    fetchData();
  }, []);

  const getPromotionalPricing = () => {
    return promotionalPricing || promotionalService.getFallbackPricing();
  };

  const calculatePromotionCost = (featureType, durationDays) => {
    const pricing = getPromotionalPricing();
    
    if (pricing[featureType]) {
      return durationDays * pricing[featureType].pricePerDay;
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
            <div className="flex items-center space-x-3">
              <button
                onClick={loadProducts}
                className="bg-[#E6B655] text-white px-4 py-2 rounded-lg hover:bg-[#D4A545] transition-colors duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                title="Refresh Products"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              <button
                onClick={handleAddProduct}
                className="bg-[#D77A61] text-white px-6 py-3 rounded-lg hover:bg-[#C06A51] transition-colors duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Product</span>
              </button>
            </div>
          </div>
          
          {/* Promotional Features Info */}
          <div className="bg-gradient-to-r from-amber-50 to-purple-50 rounded-xl p-6 border border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Promotional Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-amber-200">
                <StarIcon className="w-6 h-6 text-amber-500" />
                <div>
                  <span className="font-semibold text-amber-700">Featured Product</span>
                  <p className="text-sm text-gray-600">$5/day - Homepage visibility with distance-based ranking</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-200">
                <SparklesIcon className="w-6 h-6 text-purple-500" />
                <div>
                  <span className="font-semibold text-purple-700">Sponsored Product</span>
                  <p className="text-sm text-gray-600">$10/day - Enhanced search visibility</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Search & Filter Products</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, description, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
                  >
                    <option value="all">All Categories</option>
                    <option value="bakery">Bakery</option>
                    <option value="dairy">Dairy</option>
                    <option value="produce">Produce</option>
                    <option value="meat">Meat</option>
                    <option value="beverages">Beverages</option>
                    <option value="snacks">Snacks</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="stock">Stock</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                My Products
              </h3>
              <p className="text-gray-600 mt-1">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Last updated:</span>
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by adding your first product'}
              </p>
              {!searchQuery && selectedCategory === 'all' && selectedStatus === 'all' && (
                <button
                  onClick={handleAddProduct}
                  className="bg-[#D77A61] text-white px-6 py-3 rounded-lg hover:bg-[#C06A51] transition-colors duration-200 flex items-center space-x-2 mx-auto"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add Your First Product</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product._id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              console.error('Image failed to load:', getImageUrl(product.image));
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${product.image ? 'hidden' : 'flex'}`}>
                          <div className="text-center">
                            <CubeIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                            <span className="text-xs text-gray-400">No Image</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h4>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' : 
                            product.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            product.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.status === 'active' ? 'Active' : 
                             product.status === 'inactive' ? 'Inactive' :
                             product.status === 'out_of_stock' ? 'Out of Stock' :
                             'Draft'}
                          </span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPromotionStatus(product).color} bg-opacity-10`}>
                            {getPromotionStatus(product).text}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Category:</span>
                            <p className="capitalize text-gray-600">{product.category}</p>
                            {product.subcategory && (
                              <p className="text-xs text-gray-500 capitalize">({product.subcategory})</p>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Price:</span>
                            <p className="text-gray-600">${product.price} / {product.unit || 'piece'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              {product.productType === 'ready_to_ship' ? 'Stock:' :
                               product.productType === 'made_to_order' ? 'Capacity:' :
                               'Quantity:'}
                            </span>
                            <InventoryDisplay product={product} />
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Created:</span>
                            <p className="text-gray-600">{new Date(product.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {/* Additional Product Details */}
                        {(product.weight || product.dimensions || product.allergens) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {product.weight && (
                                <div className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                                  <span className="font-medium text-gray-700">Weight:</span>
                                  <p className="text-gray-600">{product.weight}</p>
                                </div>
                              )}
                              {product.dimensions && (
                                <div className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                                  <span className="font-medium text-gray-700">Dimensions:</span>
                                  <p className="text-gray-600">{product.dimensions}</p>
                                </div>
                              )}
                              {product.allergens && (
                                <div className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                                  <span className="font-medium text-gray-700">Allergens:</span>
                                  <p className="text-gray-600">{product.allergens}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-3 ml-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowPromotionModal(true);
                          }}
                          className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
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
                      
                      {/* Quick Inventory Update */}
                      <InventoryManagement 
                        product={product} 
                        onInventoryUpdate={handleInventoryUpdate}
                      />
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
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Wallet Balance:</span>
                    <span className="text-lg font-bold text-[#D77A61]">
                      {walletService.formatCurrency(walletBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  {selectedProduct.image && (
                    <img
                      src={getImageUrl(selectedProduct.image)}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Image failed to load in promotion modal:', getImageUrl(selectedProduct.image));
                        e.target.style.display = 'none';
                      }}
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
                      <span className="text-2xl font-bold text-amber-600">
                        ${promotionalPricing?.featured_product?.pricePerDay ? 
                          (promotionalPricing.featured_product.pricePerDay * 7) : 25}
                      </span>
                      <span className="text-sm text-gray-500">7 days</span>
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
                      <span className="text-2xl font-bold text-purple-600">
                        ${promotionalPricing?.sponsored_product?.pricePerDay ? 
                          (promotionalPricing.sponsored_product.pricePerDay * 7) : 40}
                      </span>
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


                    {/* Sponsored Product Automatic Targeting Info */}
                    {promotionData.featureType === 'sponsored_product' && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Automatic Targeting</h4>
                            <p className="text-sm text-blue-700 mb-2">
                              Your product will be automatically optimized for search using:
                            </p>
                            <ul className="text-sm text-blue-600 space-y-1">
                              <li>• Product name: "{selectedProduct?.name}"</li>
                              <li>• Category: {selectedProduct?.category}</li>
                              <li>• Subcategory: {selectedProduct?.subcategory}</li>
                              <li>• Product tags: {selectedProduct?.tags?.join(', ') || 'None'}</li>
                              <li>• Description keywords</li>
                            </ul>
                            <p className="text-xs text-blue-500 mt-2">
                              No manual configuration needed - targeting is optimized automatically!
                            </p>
                          </div>
                        </div>
                      </div>
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
                    Promote Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Add/Edit Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
              {/* Enhanced Header */}
              <div className="bg-gradient-to-r from-[#D77A61] to-[#E6B655] p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <CubeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {selectedProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      <p className="text-white text-opacity-90">
                        {selectedProduct ? 'Update your product information' : 'Create a new product for your customers'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-8">
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
    productType: product?.productType || 'ready_to_ship',
    category: product?.category || 'food_beverages',
    subcategory: product?.subcategory || 'baked_goods',
    stock: product?.productType === 'made_to_order' ? (product?.totalCapacity || 0) :
           product?.productType === 'scheduled_order' ? (product?.availableQuantity || 0) :
           (product?.stock || 0),
    weight: product?.weight || '',
    dimensions: product?.dimensions || '',
    allergens: product?.allergens || '',
    ingredients: product?.ingredients || '',
    image: product?.image || null,
    status: product?.status || 'active',
    isOrganic: product?.isOrganic || false,
    isGlutenFree: product?.isGlutenFree || false,
    isVegan: product?.isVegan || false,
    isDairyFree: product?.isDairyFree || false,
    isNutFree: product?.isNutFree || false,
    isKosher: product?.isKosher || false,
    isHalal: product?.isHalal || false,
    preparationTime: product?.preparationTime || '',
    // Made to Order specific fields
    leadTime: product?.leadTime || 1,
    leadTimeUnit: product?.leadTimeUnit || 'days',
    maxOrderQuantity: product?.maxOrderQuantity || 10,
    capacityPeriod: product?.capacityPeriod || '',
    // Scheduled specific fields
    scheduleType: product?.scheduleType || 'daily',
    scheduleDetails: product?.scheduleDetails || { frequency: 'every_day', customSchedule: [], orderCutoffHours: 24 },
    nextAvailableDate: product?.nextAvailableDate || '',
    nextAvailableTime: product?.nextAvailableTime || '09:00',
    availableQuantity: product?.availableQuantity || 1
  });

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image || null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Update form data when product changes
  useEffect(() => {
    if (product) {
      setFormData(prev => ({
        ...prev,
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        unit: product.unit || 'piece',
        productType: product.productType || 'ready_to_ship',
        category: product.category || 'food_beverages',
        subcategory: product.subcategory || 'baked_goods',
        stock: product.productType === 'made_to_order' ? (product.totalCapacity || 0) :
               product.productType === 'scheduled_order' ? (product.availableQuantity || 0) :
               (product.stock || 0),
        weight: product.weight || '',
        dimensions: product.dimensions || '',
        allergens: product.allergens || '',
        ingredients: product.ingredients || '',
        image: product.image || null,
        status: product.status || 'active',
        isOrganic: product.isOrganic || false,
        isGlutenFree: product.isGlutenFree || false,
        isVegan: product.isVegan || false,
        isDairyFree: product.isDairyFree || false,
        isNutFree: product.isNutFree || false,
        isKosher: product.isKosher || false,
        isHalal: product.isHalal || false,
        preparationTime: product.preparationTime || '',
        leadTime: product.leadTime || 1,
        leadTimeUnit: product.leadTimeUnit || 'days',
        maxOrderQuantity: product.maxOrderQuantity || 10,
        capacityPeriod: product.capacityPeriod || 'daily',
        scheduleType: product.scheduleType || 'daily',
        scheduleDetails: product.scheduleDetails || {
          frequency: 'every_day',
          customSchedule: [],
          orderCutoffHours: 24
        },
        nextAvailableDate: product.nextAvailableDate ? new Date(product.nextAvailableDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        nextAvailableTime: product.nextAvailableTime || '09:00',
        lowStockThreshold: product.lowStockThreshold || 5
      }));
      setImagePreview(product.image || null);
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter formData to only include fields that the backend expects
    const filteredData = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      category: formData.category,
      subcategory: formData.subcategory,
      productType: formData.productType,
      unit: formData.unit,
      weight: formData.weight,
      status: formData.status,
      isOrganic: formData.isOrganic,
      isGlutenFree: formData.isGlutenFree,
      isVegan: formData.isVegan,
      isDairyFree: formData.isDairyFree,
      isNutFree: formData.isNutFree,
      isKosher: formData.isKosher,
      isHalal: formData.isHalal,
      // Include image if present (will be handled by FormData in productService)
      ...(formData.image && { image: formData.image }),
      // Product type specific fields
      ...(formData.productType === 'ready_to_ship' && {
        stock: parseInt(formData.stock) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5
      }),
      ...(formData.productType === 'made_to_order' && {
        stock: parseInt(formData.stock) || 0, // Keep stock for backward compatibility
        totalCapacity: Math.max(parseInt(formData.stock) || 0, 1), // Map stock to totalCapacity, minimum 1
        remainingCapacity: Math.max(parseInt(formData.stock) || 0, 1), // Initialize remaining capacity same as total
        leadTime: parseInt(formData.leadTime) || 1,
        leadTimeUnit: formData.leadTimeUnit || 'days',
        maxOrderQuantity: parseInt(formData.maxOrderQuantity) || 10,
        capacityPeriod: formData.capacityPeriod || 'daily'
      }),
      ...(formData.productType === 'scheduled_order' && {
        stock: parseInt(formData.stock) || 0, // Keep stock for backward compatibility
        availableQuantity: Math.max(parseInt(formData.stock) || 0, 1), // Map stock to availableQuantity, minimum 1
        scheduleType: formData.scheduleType || 'daily',
        scheduleDetails: {
          frequency: formData.scheduleDetails?.frequency || 'every_day',
          customSchedule: formData.scheduleDetails?.customSchedule || [],
          orderCutoffHours: formData.scheduleDetails?.orderCutoffHours || 24
        },
        nextAvailableDate: formData.nextAvailableDate || new Date().toISOString().split('T')[0],
        nextAvailableTime: formData.nextAvailableTime || '09:00'
      })
    };
    
    console.log('🔍 Form data before filtering:', formData);
    console.log('🔍 Filtered data being sent:', filteredData);
    console.log('🔍 Stock value in formData:', formData.stock);
    console.log('🔍 Stock value in filteredData:', filteredData.stock);
    console.log('🔍 Image value in formData:', formData.image ? 'Present' : 'Not present');
    console.log('🔍 Image value in filteredData:', filteredData.image ? 'Present' : 'Not present');
    
    onSave(filteredData);
  };

  // Helper function to format product name
  const formatProductName = (name) => {
    if (!name) return name;
    // Capitalize first letter of each word, strip all caps, and limit to 30 characters
    const formatted = name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Limit to 30 characters
    return formatted.length > 30 ? formatted.substring(0, 30) : formatted;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for product name
    if (name === 'name') {
      const formattedValue = formatProductName(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Helper function to handle product type changes with stock validation
  const handleProductTypeChange = (newProductType) => {
    setFormData(prev => {
      const newFormData = { ...prev, productType: newProductType };
      
      // Ensure stock is at least 1 for made-to-order and scheduled order products
      if ((newProductType === 'made_to_order' || newProductType === 'scheduled_order') && 
          (parseInt(prev.stock) || 0) < 1) {
        newFormData.stock = 1;
      }
      
      return newFormData;
    });
  };

  // Image upload handlers
  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      console.log('📸 Image file selected:', file.name, file.size, file.type);
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('📸 Image converted to base64, length:', e.target.result.length);
        setImagePreview(e.target.result);
        // Store the actual file for upload, not base64
        setFormData(prev => ({ ...prev, image: file }));
      };
      reader.readAsDataURL(file);
    } else {
      console.log('❌ Invalid file type:', file?.type);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image: null }));
  };

  // Get available subcategories based on selected category
  const getAvailableSubcategories = () => {
    if (!formData.category || !PRODUCT_CATEGORIES[formData.category]) {
      return [];
    }
    return Object.keys(PRODUCT_CATEGORIES[formData.category].subcategories).map(key => ({
      key,
      name: PRODUCT_CATEGORIES[formData.category].subcategories[key].name,
      icon: PRODUCT_CATEGORIES[formData.category].subcategories[key].icon
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Product Information */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-[#D77A61] rounded-lg flex items-center justify-center mr-3">
            <CubeIcon className="w-6 h-6 text-white" />
              </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Basic Information</h3>
            <p className="text-sm text-gray-600">Essential details about your product</p>
            </div>
          </div>
          
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength="30"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
              placeholder="e.g., Organic Honey"
            />
            <p className="text-xs text-gray-500 flex items-center">
              <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
              Max 30 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={(e) => {
                handleChange(e);
                // Reset subcategory when category changes
                setFormData(prev => ({
                  ...prev,
                  category: e.target.value,
                  subcategory: Object.keys(PRODUCT_CATEGORIES[e.target.value]?.subcategories || {})[0] || ''
                }));
              }}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
            >
              {getAllCategories().map(category => (
                <option key={category.key} value={category.key}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
              </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Subcategory *
            </label>
            <select
              name="subcategory"
              value={formData.subcategory}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
            >
              {getAvailableSubcategories().map(subcategory => (
                <option key={subcategory.key} value={subcategory.key}>
                  {subcategory.icon} {subcategory.name}
                </option>
              ))}
            </select>
            </div>
          </div>
          
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            Product Status
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
              { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' },
              { value: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' },
              { value: 'draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
            ].map((status) => (
              <label
                key={status.value}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  formData.status === status.value
                    ? `${status.color} border-current`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#D77A61]'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status.value}
                  checked={formData.status === status.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{status.label}</span>
              </label>
            ))}
              </div>
            </div>
          </div>

      {/* Product Image Upload */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-[#E6B655] rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Product Image</h3>
            <p className="text-sm text-gray-600">Upload a high-quality image of your product</p>
        </div>
      </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            isDragOver
              ? 'border-[#D77A61] bg-[#F5F1EA] scale-[1.02]'
              : 'border-gray-300 hover:border-[#D77A61]/50 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {imagePreview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-32 h-32 object-cover rounded-2xl shadow-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">✓ Image uploaded successfully</p>
              <button
                type="button"
                onClick={() => document.getElementById('image-upload').click()}
                  className="text-[#D77A61] hover:text-[#C06A51] text-sm font-medium underline hover:no-underline transition-all duration-200"
              >
                Change Image
              </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#D77A61] to-[#E6B655] rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">Upload Product Image</p>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop your image here, or click to browse
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload').click()}
                  className="bg-gradient-to-r from-[#D77A61] to-[#E6B655] text-white px-6 py-3 rounded-xl hover:from-[#C06A51] hover:to-[#D4A545] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Choose Image
                </button>
              </div>
            </div>
          )}
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Image Requirements</p>
              <p className="text-xs text-blue-700 mt-1">
                Recommended: Square image, at least 400x400 pixels. Max file size: 5MB. Supported formats: JPG, PNG, WebP
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Type Selection */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-[#8B5CF6] rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        <div>
            <h3 className="text-xl font-bold text-gray-900">Product Type *</h3>
            <p className="text-sm text-gray-600">Choose how your product will be fulfilled</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              formData.productType === 'ready_to_ship'
                ? 'border-[#D77A61] bg-gradient-to-br from-[#F5F1EA] to-[#FEF7F0] shadow-lg'
                : 'border-gray-200 hover:border-[#D77A61]/50 hover:shadow-md bg-white'
            }`}
            onClick={() => handleProductTypeChange('ready_to_ship')}
          >
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                formData.productType === 'ready_to_ship' 
                  ? 'bg-[#D77A61]' 
                  : 'bg-gray-100'
              }`}>
                <TruckIcon className={`w-8 h-8 ${
                  formData.productType === 'ready_to_ship' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Ready to Ship</h4>
              <p className="text-sm text-gray-600 mb-3">Pre-made products ready for immediate delivery</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Available in stock</p>
                <p>• Immediate shipping</p>
                <p>• Standard inventory</p>
              </div>
            </div>
          </div>
          
          <div
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              formData.productType === 'made_to_order'
                ? 'border-[#D77A61] bg-gradient-to-br from-[#F5F1EA] to-[#FEF7F0] shadow-lg'
                : 'border-gray-200 hover:border-[#D77A61]/50 hover:shadow-md bg-white'
            }`}
            onClick={() => handleProductTypeChange('made_to_order')}
          >
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                formData.productType === 'made_to_order' 
                  ? 'bg-[#D77A61]' 
                  : 'bg-gray-100'
              }`}>
                <WrenchScrewdriverIcon className={`w-8 h-8 ${
                  formData.productType === 'made_to_order' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Made to Order</h4>
              <p className="text-sm text-gray-600 mb-3">Custom products made after order placement</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Custom preparation</p>
                <p>• Lead time required</p>
                <p>• Made after order</p>
              </div>
            </div>
          </div>
          
          <div
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              formData.productType === 'scheduled_order'
                ? 'border-[#D77A61] bg-gradient-to-br from-[#F5F1EA] to-[#FEF7F0] shadow-lg'
                : 'border-gray-200 hover:border-[#D77A61]/50 hover:shadow-md bg-white'
            }`}
            onClick={() => handleProductTypeChange('scheduled_order')}
          >
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                formData.productType === 'scheduled_order' 
                  ? 'bg-[#D77A61]' 
                  : 'bg-gray-100'
              }`}>
                <CalendarIcon className={`w-8 h-8 ${
                  formData.productType === 'scheduled_order' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Scheduled Order</h4>
              <p className="text-sm text-gray-600 mb-3">Products made at specific date and time</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Fixed production time</p>
                <p>• Limited quantity</p>
                <p>• Specific date/time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Type Specific Fields */}
      {formData.productType === 'ready_to_ship' && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
        <div>
              <h3 className="text-xl font-bold text-gray-900">Ready to Ship Product Details</h3>
              <p className="text-sm text-gray-600">Configure your inventory and pricing</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
            Price *
          </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
                  className="w-full pl-7 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
                  placeholder="0.00"
          />
              </div>
        </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
            Unit *
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
          >
            <optgroup label="Count/Quantity">
              <option value="piece">Piece</option>
              <option value="item">Item</option>
              <option value="each">Each</option>
              <option value="dozen">Dozen</option>
              <option value="half_dozen">Half Dozen</option>
            </optgroup>
                <optgroup label="Weight">
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="lb">Pound (lb)</option>
              <option value="oz">Ounce (oz)</option>
            </optgroup>
                <optgroup label="Volume">
              <option value="liter">Liter (L)</option>
              <option value="ml">Milliliter (ml)</option>
              <option value="cup">Cup</option>
                  <option value="tbsp">Tablespoon</option>
                  <option value="tsp">Teaspoon</option>
            </optgroup>
                <optgroup label="Food Items">
              <option value="bottle">Bottle</option>
              <option value="jar">Jar</option>
              <option value="bag">Bag</option>
              <option value="box">Box</option>
                  <option value="loaf">Loaf</option>
              <option value="slice">Slice</option>
              <option value="serving">Serving</option>
            </optgroup>
          </select>
        </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
            Stock *
          </label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            min={formData.productType === 'ready_to_ship' ? "0" : "1"}
            required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
                placeholder={formData.productType === 'ready_to_ship' ? "0" : "1"}
              />
              <p className="text-xs text-gray-500">
                {formData.productType === 'ready_to_ship' 
                  ? 'Current inventory available' 
                  : formData.productType === 'made_to_order'
                    ? 'Total production capacity (minimum 1)'
                    : 'Available quantity for this date (minimum 1)'
                }
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Preparation Time
              </label>
              <input
                type="text"
                name="preparationTime"
                value={formData.preparationTime}
                onChange={handleChange}
                placeholder="e.g., 30 minutes, 2 hours"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
              />
              <p className="text-xs text-gray-500">Time to prepare this product</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white resize-none"
              placeholder="Describe your product in detail..."
            />
            <p className="text-xs text-gray-500 mt-2">Help customers understand what makes your product special</p>
          </div>
        </div>
      )}

      {formData.productType === 'made_to_order' && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Made to Order Product Details</h3>
              <p className="text-sm text-gray-600">Configure custom production settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Price *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
            min="0"
            required
                  className="w-full pl-7 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
                  placeholder="0.00"
          />
              </div>
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
                <optgroup label="Count/Quantity">
                  <option value="piece">Piece</option>
                  <option value="item">Item</option>
                  <option value="each">Each</option>
                  <option value="dozen">Dozen</option>
                  <option value="half_dozen">Half Dozen</option>
                </optgroup>
                <optgroup label="Weight">
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="lb">Pound (lb)</option>
                  <option value="oz">Ounce (oz)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="liter">Liter (L)</option>
                  <option value="ml">Milliliter (ml)</option>
                  <option value="cup">Cup</option>
                  <option value="tbsp">Tablespoon</option>
                  <option value="tsp">Teaspoon</option>
                </optgroup>
                <optgroup label="Food Items">
                  <option value="bottle">Bottle</option>
                  <option value="jar">Jar</option>
                  <option value="bag">Bag</option>
                  <option value="box">Box</option>
                  <option value="loaf">Loaf</option>
                  <option value="slice">Slice</option>
                  <option value="serving">Serving</option>
                </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Capacity *
          </label>
              <input
                type="number"
                name="maxOrderQuantity"
                value={formData.maxOrderQuantity}
            onChange={handleChange}
                min="1"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                placeholder="Maximum inventory you can produce"
              />
              <p className="text-xs text-gray-500 mt-1">Total number of items you can produce</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capacity Period *
          </label>
          <select
            name="capacityPeriod"
            value={formData.capacityPeriod}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
          >
            <option value="">Select capacity period</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">How often does your production capacity reset?</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
                Preparation Time
          </label>
              <input
                type="text"
                name="preparationTime"
                value={formData.preparationTime}
            onChange={handleChange}
                placeholder="e.g., 30 minutes, 2 hours"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
              />
        </div>
      </div>

          <div className="mt-4">
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
              placeholder="Describe your product..."
        />
      </div>

          {/* Made to Order Settings */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-md font-semibold text-blue-900 mb-3">Made to Order Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Time *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="leadTime"
                  value={formData.leadTime}
                  onChange={handleChange}
                  min="1"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                  placeholder="e.g., 3"
                />
                <select
                  name="leadTimeUnit"
                  value={formData.leadTimeUnit}
                  onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                How long customers need to wait for this product
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Order Quantity
              </label>
              <input
                type="number"
                name="maxOrderQuantity"
                value={formData.maxOrderQuantity}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                placeholder="e.g., 50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum quantity per order (leave empty for no limit)
              </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.productType === 'scheduled_order' && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Scheduled Order Product Details</h3>
              <p className="text-sm text-gray-600">Configure scheduled production settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Price *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
              <input
                  type="number"
                  name="price"
                  value={formData.price}
                onChange={handleChange}
                  step="0.01"
                  min="0"
                required
                  className="w-full pl-7 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-all duration-200 bg-white"
                  placeholder="0.00"
              />
            </div>
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
                <optgroup label="Count/Quantity">
                  <option value="piece">Piece</option>
                  <option value="item">Item</option>
                  <option value="each">Each</option>
                  <option value="dozen">Dozen</option>
                  <option value="half_dozen">Half Dozen</option>
                </optgroup>
                <optgroup label="Weight">
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="lb">Pound (lb)</option>
                  <option value="oz">Ounce (oz)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="liter">Liter (L)</option>
                  <option value="ml">Milliliter (ml)</option>
                  <option value="cup">Cup</option>
                  <option value="tbsp">Tablespoon</option>
                  <option value="tsp">Teaspoon</option>
                </optgroup>
                <optgroup label="Food Items">
                  <option value="bottle">Bottle</option>
                  <option value="jar">Jar</option>
                  <option value="bag">Bag</option>
                  <option value="box">Box</option>
                  <option value="loaf">Loaf</option>
                  <option value="slice">Slice</option>
                  <option value="serving">Serving</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Quantity *
              </label>
              <input
                type="number"
                name="availableQuantity"
                value={formData.availableQuantity}
                onChange={handleChange}
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                placeholder="Total capacity for this scheduled production"
              />
              <p className="text-xs text-gray-500 mt-1">Total number of items you can produce for this schedule</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preparation Time
              </label>
              <input
                type="text"
                name="preparationTime"
                value={formData.preparationTime}
                onChange={handleChange}
                placeholder="e.g., 30 minutes, 2 hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
              />
            </div>
          </div>

          <div className="mt-4">
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
              placeholder="Describe your product..."
        />
      </div>

          {/* Scheduled Order Settings */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-md font-semibold text-green-900 mb-3">Scheduled Production Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Available Date *
        </label>
        <input
                  type="date"
                  name="nextAvailableDate"
                  value={formData.nextAvailableDate}
          onChange={handleChange}
                  required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Available Time *
        </label>
        <input
                  type="time"
                  name="nextAvailableTime"
                  value={formData.nextAvailableTime}
          onChange={handleChange}
                  required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
        />
        <p className="text-xs text-gray-500 mt-1">When the product will be ready for pickup/delivery</p>
      </div>
              <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Type *
            </label>
                <select
                  name="scheduleType"
                  value={formData.scheduleType}
          onChange={handleChange}
                  required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Schedule</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Cut-off (Hours)
            </label>
              <input
                  type="number"
                  name="orderCutoffHours"
                  value={formData.scheduleDetails?.orderCutoffHours || 24}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      scheduleDetails: {
                        ...prev.scheduleDetails,
                        orderCutoffHours: value
                      }
                    }));
                  }}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                  placeholder="24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many hours before production to stop taking orders
                </p>
              </div>
            </div>
              </div>
        </div>
      )}

      {/* Dietary Information */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
              <div>
            <h3 className="text-xl font-bold text-gray-900">Dietary Information & Certifications</h3>
            <p className="text-sm text-gray-600">Help customers find products that meet their dietary needs</p>
              </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { key: 'isOrganic', label: 'Organic', icon: '🌱', color: 'bg-green-50 border-green-200 text-green-800' },
            { key: 'isGlutenFree', label: 'Gluten Free', icon: '🌾', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
            { key: 'isVegan', label: 'Vegan', icon: '🥬', color: 'bg-green-50 border-green-200 text-green-800' },
            { key: 'isDairyFree', label: 'Dairy Free', icon: '🥛', color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { key: 'isNutFree', label: 'Nut Free', icon: '🥜', color: 'bg-orange-50 border-orange-200 text-orange-800' },
            { key: 'isKosher', label: 'Kosher', icon: '✡️', color: 'bg-purple-50 border-purple-200 text-purple-800' },
            { key: 'isHalal', label: 'Halal', icon: '☪️', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' }
          ].map((item) => (
            <label
              key={item.key}
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                formData[item.key]
                  ? `${item.color} border-current shadow-md`
                  : 'bg-white border-gray-200 hover:border-[#D77A61] hover:shadow-sm'
              }`}
            >
              <input
                type="checkbox"
                name={item.key}
                checked={formData[item.key]}
                onChange={(e) => setFormData({...formData, [item.key]: e.target.checked})}
                className="sr-only"
              />
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </label>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
              <div>
              <p className="text-sm font-medium text-amber-900">Important Note</p>
              <p className="text-xs text-amber-700 mt-1">
                Only select certifications that you can verify. Customers rely on this information for their dietary needs and safety.
              </p>
              </div>
          </div>
        </div>
      </div>


      {/* Form Actions */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-gray-700">Ready to {product ? 'update' : 'add'} your product?</p>
            <p className="text-xs text-gray-500 mt-1">* Required fields • All information will be visible to customers</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onCancel}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
              className="px-8 py-3 bg-gradient-to-r from-[#D77A61] to-[#E6B655] text-white rounded-xl hover:from-[#C06A51] hover:to-[#D4A545] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
          >
            <CubeIcon className="w-5 h-5" />
            <span>{product ? 'Update Product' : 'Add Product'}</span>
          </button>
          </div>
        </div>
      </div>
    </form>
  );
};