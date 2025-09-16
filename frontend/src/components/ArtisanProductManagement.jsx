import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon, 
  StarIcon,
  XMarkIcon,
  SparklesIcon,
  PlusIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { getProfile } from '../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { promotionalService } from '../services/promotionalService';
import walletService from '../services/walletService';
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
    durationDays: 7
  });
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [quickUpdateValues, setQuickUpdateValues] = useState({});
  const navigate = useNavigate();

  // Helper function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a local path, prefix with backend URL
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
  };

  // Load user profile and products
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await getProfile();
        setUser(profile);
        await loadProducts();
        await loadWalletBalance();
      } catch (error) {
        console.error('Error loading profile:', error);
        navigate('/login');
      }
    };

    loadUserProfile();
  }, [navigate]);

  // Load products
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productService.getMyProducts();
      setProducts(response);
      setFilteredProducts(response);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  // Load wallet balance
  const loadWalletBalance = async () => {
    try {
      const balance = await walletService.getWalletBalance();
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
    }
  };

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Handle product operations
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
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
      toast.error(`Failed to save product: ${(error.response?.data?.message || error.message)}`);
    }
  };

  // Handle inventory updates
  const handleInventoryUpdate = async (productId, newValue, productType, additionalData = {}) => {
    try {
      let updateData = { ...additionalData };
      
      // Update the appropriate field based on product type
      if (productType === 'ready_to_ship') {
        updateData.stock = newValue;
        updateData.status = newValue === 0 ? 'out_of_stock' : 'active';
      } else if (productType === 'made_to_order') {
        updateData.remainingCapacity = newValue;
        updateData.status = newValue === 0 ? 'out_of_stock' : 'active';
      } else if (productType === 'scheduled_order') {
        updateData.availableQuantity = newValue;
        updateData.status = newValue === 0 ? 'out_of_stock' : 'active';
      }
      
      const updatedProduct = await productService.updateInventory(productId, updateData);
      setProducts(products.map(p => p._id === productId ? updatedProduct : p));
      
      // Clear the quick update value for this product
      setQuickUpdateValues(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      
      const fieldName = productType === 'ready_to_ship' ? 'stock' :
                       productType === 'made_to_order' ? 'remaining capacity' :
                       'available quantity';
      toast.success(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully!`);
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  // Handle promotion
  const handlePromoteProduct = (product) => {
    setSelectedProduct(product);
    setShowPromotionModal(true);
  };

  const handlePromotionSubmit = async () => {
    try {
      await promotionalService.activatePromotion(selectedProduct._id, promotionData);
      toast.success('Promotional feature activated successfully! Your product is now being promoted.');
      loadProducts();
      loadWalletBalance();
      setShowPromotionModal(false);
      setSelectedProduct(null);
      setPromotionData({
        featureType: '',
        durationDays: 7
      });
    } catch (error) {
      console.error('Error activating promotion:', error);
      toast.error('Failed to activate promotion');
    }
  };

  // Calculate promotion cost
  const calculatePromotionCost = (featureType, durationDays) => {
    const baseCost = featureType === 'featured_product' ? 5 : 10;
    return baseCost * durationDays;
  };

  // Get promotion status
  const getPromotionStatus = (product) => {
    if (product.isFeatured) {
      return { text: 'Featured', color: 'text-amber-600' };
    } else if (product.isSponsored) {
      return { text: 'Sponsored', color: 'text-purple-600' };
    } else {
      return { text: 'Regular', color: 'text-gray-600' };
    }
  };

  // Get unit label
  const getUnitLabel = (unit) => {
    return unit || 'piece';
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
              <div className="inline-flex items-center justify-center w-24 h-24 bg-[#D77A61] rounded-full mb-6 shadow-lg">
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
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              <button
                onClick={handleAddProduct}
                className="bg-[#D77A61] text-white px-4 py-2 rounded-xl hover:bg-[#C06A51] transition-colors duration-200 flex items-center space-x-2"
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
              <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-amber-200">
                <StarIcon className="w-6 h-6 text-amber-500" />
                <div>
                  <span className="font-semibold text-amber-700">Featured Product</span>
                  <p className="text-sm text-gray-600">$5/day - Homepage visibility with distance-based ranking</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-purple-200">
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
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
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
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
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
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
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200 min-w-[140px]"
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
                  className="bg-[#D77A61] text-white px-6 py-3 rounded-xl hover:bg-[#C06A51] transition-colors duration-200 flex items-center space-x-2 mx-auto"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add Your First Product</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div key={product._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center border border-gray-200 shadow-sm image-wrapper">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-xl"
                            onError={(e) => {
                              console.error('Image failed to load:', getImageUrl(product.image));
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const placeholder = img.closest('.image-wrapper')?.querySelector('.image-placeholder');
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center image-placeholder ${product.image ? 'hidden' : 'flex'}`}>
                          <div className="text-center">
                            <CubeIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                            <span className="text-xs text-gray-400">No Image</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="font-medium text-gray-700">Price:</span>
                            <div className="flex items-baseline space-x-1">
                              <span className="text-2xl font-bold text-[#D77A61]">${product.price}</span>
                              <span className="text-sm text-gray-500">/ {product.unit || 'piece'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Category:</span>
                            <p className="text-gray-600 capitalize">{product.category.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Type:</span>
                            <p className="text-gray-600 capitalize">{product.productType.replace('_', ' ')}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="font-medium text-gray-700">Inventory:</span>
                            <p className={`text-sm font-medium text-lg font-bold ${
                              (product.productType === 'ready_to_ship' && product.stock <= 5) ||
                              (product.productType === 'made_to_order' && (product.remainingCapacity || 0) <= 1) ||
                              (product.productType === 'scheduled_order' && product.availableQuantity <= 5)
                                ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {product.productType === 'ready_to_ship' ? product.stock :
                               product.productType === 'made_to_order' ? `${(product.remainingCapacity || 0)}/${(product.totalCapacity || 0)}` :
                               product.availableQuantity}
                            </p>
                            {((product.productType === 'ready_to_ship' && product.stock <= 5) ||
                              (product.productType === 'made_to_order' && (product.remainingCapacity || 0) <= 1) ||
                              (product.productType === 'scheduled_order' && product.availableQuantity <= 5)) && (
                              <span className="text-xs text-red-500 font-medium">
                                {product.productType === 'ready_to_ship' ? 'Low Stock!' :
                                 product.productType === 'made_to_order' ? 'Low Capacity!' :
                                 'Low Available!'}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Created:</span>
                            <p className="text-gray-600">{new Date(product.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {product.description && (
                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Description:</span>
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                          </div>
                        )}                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Inventory</span>
                            {((product.productType === 'ready_to_ship' && product.stock <= 5) ||
                              (product.productType === 'made_to_order' && (product.remainingCapacity || 0) <= 1) ||
                              (product.productType === 'scheduled_order' && product.availableQuantity <= 5)) && (
                              <span className="text-xs text-red-500 font-medium">
                                {product.productType === 'ready_to_ship' ? 'Low Stock!' :
                                 product.productType === 'made_to_order' ? 'Low Capacity!' :
                                 'Low Available!'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-xs text-gray-500">Available:</span>
                                <p className={`text-lg font-bold ${
                                  (product.productType === 'ready_to_ship' && product.stock <= 5) ||
                                  (product.productType === 'made_to_order' && (product.remainingCapacity || 0) <= 1) ||
                                  (product.productType === 'scheduled_order' && product.availableQuantity <= 5)
                                    ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {product.productType === 'ready_to_ship' ? product.stock :
                                   product.productType === 'made_to_order' ? `${(product.remainingCapacity || 0)}/${(product.totalCapacity || 0)}` :
                                   product.availableQuantity}
                                </p>
                              </div>
                              {product.productType === 'made_to_order' && (
                                <div className="text-xs text-gray-500">
                                  <div>Total: {product.totalCapacity || 0}</div>
                                  <div>Used: {(product.totalCapacity || 0) - (product.remainingCapacity || 0)}</div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min={product.productType === 'ready_to_ship' ? "0" : "0"}
                                value={quickUpdateValues[product._id] !== undefined ? quickUpdateValues[product._id] : 
                                  (product.productType === 'ready_to_ship' ? product.stock :
                                   product.productType === 'made_to_order' ? product.remainingCapacity :
                                   product.availableQuantity)}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61]"
                                onChange={(e) => {
                                  setQuickUpdateValues(prev => ({
                                    ...prev,
                                    [product._id]: parseInt(e.target.value) || 0
                                  }));
                                }}
                                onBlur={(e) => {
                                  const newValue = parseInt(e.target.value);
                                  const currentValue = product.productType === 'ready_to_ship' ? product.stock :
                                                       product.productType === 'made_to_order' ? product.remainingCapacity :
                                                       product.availableQuantity;
                                  if (newValue !== currentValue && !isNaN(newValue)) {
                                    handleInventoryUpdate(product._id, newValue, product.productType);
                                  }
                                  setQuickUpdateValues(prev => {
                                    const updated = { ...prev };
                                    delete updated[product._id];
                                    return updated;
                                  });
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const newValue = parseInt(e.target.value);
                                    const currentValue = product.productType === 'ready_to_ship' ? product.stock :
                                                         product.productType === 'made_to_order' ? product.remainingCapacity :
                                                         product.availableQuantity;
                                    if (newValue !== currentValue && !isNaN(newValue)) {
                                      handleInventoryUpdate(product._id, newValue, product.productType);
                                    }
                                    setQuickUpdateValues(prev => {
                                      const updated = { ...prev };
                                      delete updated[product._id];
                                      return updated;
                                    });
                                  }
                                }}
                              />
                              <span className="text-xs text-gray-500">{getUnitLabel(product.unit)}</span>
                              {product.productType === 'made_to_order' && (
                                <button
                                  onClick={() => {
                                    const currentRemaining = product.remainingCapacity || 0;
                                    const currentTotal = product.totalCapacity || 0;
                                    const capacityToAdd = prompt(
                                      `Add capacity for "${product.name}":\nCurrent: ${currentRemaining}/${currentTotal}\nEnter amount to add:`, 
                                      '1'
                                    );
                                    if (capacityToAdd && !isNaN(parseInt(capacityToAdd)) && parseInt(capacityToAdd) > 0) {
                                      const newRemaining = currentRemaining + parseInt(capacityToAdd);
                                      const newTotal = currentTotal + parseInt(capacityToAdd);
                                      handleInventoryUpdate(product._id, newRemaining, product.productType, { totalCapacity: newTotal });
                                    }
                                  }}
                                  className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                                  title="Add Capacity"
                                >
                                  +Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Description:</span>
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
                        title="Edit Product"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handlePromoteProduct(product)}
                        className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                        title="Promote Product"
                      >
                        <SparklesIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
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
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Wallet Balance */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Wallet Balance:</span>
                    <span className="text-lg font-bold text-[#D77A61]">
                      {walletService.formatCurrency ? walletService.formatCurrency(walletBalance) : `$${walletBalance}`}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex items-center space-x-4 mb-6">
                  {selectedProduct.image && (
                    <img
                      src={getImageUrl(selectedProduct.image)}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-xl"
                      onError={(e) => {
                        console.error('Image failed to load in promotion modal:', getImageUrl(selectedProduct.image));
                        const img = e.currentTarget;
                        img.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">{selectedProduct.category}</p>
                    <p className="text-sm text-gray-600">{selectedProduct.price}</p>
                  </div>
                </div>

                {/* Promotion Options */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Choose Promotion Type</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Featured Product */}
                    <div
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        promotionData.featureType === 'featured_product'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-200'
                      }`}
                      onClick={() => setPromotionData({...promotionData, featureType: 'featured_product'})}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <StarIcon className="w-6 h-6 text-amber-500" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Featured Product</h4>
                          <p className="text-sm text-gray-600">$5 per day</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Get featured on the homepage with distance-based ranking
                      </p>
                      {promotionData.featureType === 'featured_product' && promotionData.durationDays > 7 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Additional days: {(promotionData.durationDays - 7) * 5}
                        </p>
                      )}
                    </div>

                    {/* Sponsored Product */}
                    <div
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        promotionData.featureType === 'sponsored_product'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-200'
                      }`}
                      onClick={() => setPromotionData({...promotionData, featureType: 'sponsored_product'})}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <SparklesIcon className="w-6 h-6 text-purple-500" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Sponsored Product</h4>
                          <p className="text-sm text-gray-600">$10 per day</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Enhanced visibility in search results
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promotion Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={promotionData.durationDays}
                    onChange={(e) => setPromotionData({...promotionData, durationDays: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] transition-colors duration-200"
                  />
                </div>

                {/* Cost Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${calculatePromotionCost(promotionData.featureType, promotionData.durationDays)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowPromotionModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromotionSubmit}
                    disabled={!promotionData.featureType || walletBalance < calculatePromotionCost(promotionData.featureType, promotionData.durationDays)}
                    className="px-6 py-3 bg-[#D77A61] text-white rounded-xl hover:bg-[#C06A51] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Activate Promotion
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
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Product Form</h3>
                  <p className="text-gray-500 mb-6">
                    Product form functionality will be implemented here
                  </p>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
