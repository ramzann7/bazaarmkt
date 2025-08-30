import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  TrashIcon,
  CameraIcon,
  ArrowLeftIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { getMyProducts, createProduct, updateProduct, deleteProduct, uploadImage, updateInventory, getAllProducts } from '../services/productService';
import { getProfile } from '../services/authservice';
import { PRODUCT_CATEGORIES, getAllCategories, getAllSubcategories } from '../data/productReference';
import ProductPromotions from './ProductPromotions';
import { promotionalService } from '../services/promotionalService';
import DistanceBadge from './DistanceBadge';
import toast from 'react-hot-toast';

// Debug imports
console.log('Products component - PRODUCT_CATEGORIES:', PRODUCT_CATEGORIES);
console.log('Products component - getAllCategories:', getAllCategories);
console.log('Products component - getAllSubcategories:', getAllSubcategories);

export default function Products() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showPromotions, setShowPromotions] = useState(false);
  const [selectedProductForPromotions, setSelectedProductForPromotions] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    image: null,
    imagePreview: null,
    stock: '',
    tags: [],
    unit: 'piece',
    weight: '',
    expiryDate: '',
    isOrganic: false,
    isGlutenFree: false,
    isVegan: false,
    isHalal: false
  });
  const [newTag, setNewTag] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [productPromotions, setProductPromotions] = useState({});
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Comprehensive product categories from reference data
  const categories = (() => {
    try {
      const categoryData = {};
      const allCategories = getAllCategories();
      
      if (allCategories && Array.isArray(allCategories)) {
        allCategories.forEach(category => {
          const subcategories = getAllSubcategories().filter(sub => sub.categoryKey === category.key);
          categoryData[category.name] = subcategories.map(sub => sub.subcategoryName);
        });
      }
      
      return categoryData;
    } catch (error) {
      console.error('Error initializing categories:', error);
      // Return a fallback structure
      return {
        "Food & Beverages": ["Baked Goods", "Dairy Products", "Preserves & Jams", "Beverages"],
        "Handmade Crafts": ["Jewelry", "Pottery & Ceramics", "Textiles & Fiber Arts", "Woodworking"],
        "Clothing & Accessories": ["Clothing", "Accessories", "Shoes & Footwear", "Baby & Kids"]
      };
    }
  })();

  const units = ['piece', 'kg', 'lb', 'g', 'oz', 'dozen', 'bunch', 'pack', 'bottle', 'jar'];

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Handle HTTP URLs
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Handle relative paths (already have /uploads prefix)
    if (imagePath.startsWith('/uploads/')) {
      return imagePath;
    }
    
    // Handle paths that need /uploads prefix
    if (imagePath.startsWith('/')) {
      return imagePath;
    }
    
    // Handle paths without leading slash
    return `/${imagePath}`;
  };

  useEffect(() => {
    loadUserAndProducts();
    loadAllProducts();
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          nameInputRef.current && !nameInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load all products for autocomplete suggestions
  const loadAllProducts = async () => {
    try {
      const products = await getAllProducts();
      setAllProducts(products);
    } catch (error) {
      console.error('Error loading all products:', error);
    }
  };

  const loadUserAndProducts = async () => {
    try {
      setIsLoading(true);
      const [userData, productsData] = await Promise.all([
        getProfile(),
        getMyProducts()
      ]);
      setUser(userData.user);
      setProducts(productsData);
      
      // Load promotional data for all products
      const promotionalData = {};
      for (const product of productsData) {
        try {
          const promotions = await promotionalService.getProductPromotions(product._id);
          promotionalData[product._id] = promotions;
        } catch (error) {
          console.error(`Error loading promotions for product ${product._id}:`, error);
          promotionalData[product._id] = [];
        }
      }
      setProductPromotions(promotionalData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Selected image file:', file);
      setNewProduct({
        ...newProduct,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !newProduct.tags.includes(newTag.trim())) {
      setNewProduct({
        ...newProduct,
        tags: [...newProduct.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewProduct({
      ...newProduct,
      tags: newProduct.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Auto-formatting functions
  const formatProductName = (name) => {
    if (!name) return name;
    // Capitalize first letter of each word, strip all caps
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDescription = (description) => {
    if (!description) return description;
    // Limit to 250 characters
    return description.length > 250 ? description.substring(0, 250) + '...' : description;
  };

  // Autocomplete functionality
  const handleNameChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatProductName(value);
    
    setNewProduct({...newProduct, name: formattedValue});
    
    if (value.length >= 2) {
      const suggestions = allProducts
        .filter(product => 
          product.name.toLowerCase().includes(value.toLowerCase()) &&
          product.name.toLowerCase() !== value.toLowerCase()
        )
        .slice(0, 5);
      
      setProductSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
      setProductSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setNewProduct({...newProduct, name: suggestion.name});
    setShowSuggestions(false);
    setProductSuggestions([]);
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatDescription(value);
    setNewProduct({...newProduct, description: formattedValue});
  };

  // Photo checker
  const checkPhotoWarning = () => {
    return !newProduct.image && newProduct.name && newProduct.description;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      console.log('Adding product with data:', newProduct);
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        weight: parseFloat(newProduct.weight) || null,
        tags: newProduct.tags
        // Keep image as File object if it exists, let createProduct handle the upload
      };
      
      console.log('Sending product data:', productData);
      const savedProduct = await createProduct(productData);
      setProducts([savedProduct, ...products]);
      
      setNewProduct({
        name: '',
        description: '',
        price: '',
        category: '',
        subcategory: '',
        image: null,
        imagePreview: null,
        stock: '',
        tags: [],
        unit: 'piece',
        weight: '',
        expiryDate: '',
        isOrganic: false,
        isGlutenFree: false,
        isVegan: false,
        isHalal: false
      });
      setShowAddForm(false);
      toast.success('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(`Failed to add product: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p._id !== productId));
      toast.success('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handlePromotionalFeatures = (product) => {
    setSelectedProductForPromotions(product);
    setShowPromotions(true);
  };

  const handlePromotionUpdate = () => {
    // Refresh products and promotional data to show updated promotional status
    loadUserAndProducts();
  };

  const handleUpdateStock = async (productId, newStock) => {
    try {
      const updatedProduct = await updateInventory(productId, { stock: parseInt(newStock) });
      setProducts(products.map(p => 
        p._id === productId ? updatedProduct : p
      ));
      toast.success('Stock updated successfully!');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const handleToggleStatus = async (productId) => {
    try {
      const product = products.find(p => p._id === productId);
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      const updatedProduct = await updateProduct(productId, { status: newStatus });
      setProducts(products.map(p => 
        p._id === productId ? updatedProduct : p
      ));
      toast.success(`Product ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      image: null,
      imagePreview: product.image || null
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...editingProduct,
        price: parseFloat(editingProduct.price),
        stock: parseInt(editingProduct.stock),
        weight: parseFloat(editingProduct.weight) || null,
        tags: editingProduct.tags
      };
      
      const updatedProduct = await updateProduct(editingProduct._id, productData);
      setProducts(products.map(p => 
        p._id === editingProduct._id ? updatedProduct : p
      ));
      
      setEditingProduct(null);
      toast.success('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditingProduct({
        ...editingProduct,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-4 shadow-lg">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Product Management</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              Manage your product inventory, track sales, and keep your customers updated
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Profile</span>
              </button>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span>{showAddForm ? 'Cancel' : 'Add New Product'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Product Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Product</h4>
            <form onSubmit={handleAddProduct} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={handleNameChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Organic Honeycrisp Apples – 2 lb bag"
                  />
                  {/* Smart placeholder hint */}
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <LightBulbIcon className="w-3 h-3 mr-1" />
                    <span>Use descriptive names like "Organic Honeycrisp Apples – 2 lb bag"</span>
                  </div>
                  
                  {/* Autocomplete suggestions */}
                  {showSuggestions && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      {productSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{suggestion.name}</div>
                          <div className="text-xs text-gray-500">Existing product</div>
                        </div>
                      ))}
                      <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                        Click to use existing name or continue typing for a new product
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    required
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value, subcategory: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {Object.keys(categories).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                  <select
                    value={newProduct.subcategory}
                    onChange={(e) => setNewProduct({...newProduct, subcategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select subcategory</option>
                    {newProduct.category && categories[newProduct.category]?.map(subcategory => (
                      <option key={subcategory} value={subcategory}>{subcategory}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  required
                  value={newProduct.description}
                  onChange={handleDescriptionChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Freshly picked from local orchard. Perfect for snacking or baking."
                />
                {/* Character counter */}
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center text-xs text-gray-500">
                    <LightBulbIcon className="w-3 h-3 mr-1" />
                    <span>Keep descriptions under 250 characters for readability</span>
                  </div>
                  <span className={`text-xs ${newProduct.description.length > 250 ? 'text-red-500' : 'text-gray-500'}`}>
                    {newProduct.description.length}/250
                  </span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  
                  {/* Photo checker warning */}
                  {checkPhotoWarning() && (
                    <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mr-2" />
                      <div className="text-sm text-amber-800">
                        <strong>Photo Recommended:</strong> Adding a product photo builds trust with buyers and increases sales.
                      </div>
                    </div>
                  )}
                  {newProduct.imagePreview && (
                    <div className="relative">
                      <img 
                        src={newProduct.imagePreview} 
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setNewProduct({...newProduct, image: null, imagePreview: null})}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  {newProduct.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newProduct.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-orange-600 hover:text-orange-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProduct.weight}
                    onChange={(e) => setNewProduct({...newProduct, weight: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={newProduct.expiryDate}
                    onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Dietary Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.isOrganic}
                      onChange={(e) => setNewProduct({...newProduct, isOrganic: e.target.checked})}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Organic</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.isGlutenFree}
                      onChange={(e) => setNewProduct({...newProduct, isGlutenFree: e.target.checked})}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Gluten-Free</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.isVegan}
                      onChange={(e) => setNewProduct({...newProduct, isVegan: e.target.checked})}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Vegan</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.isHalal}
                      onChange={(e) => setNewProduct({...newProduct, isHalal: e.target.checked})}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Halal</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        {products.length > 0 ? (
          <div className="space-y-6">
            {/* Enhanced Inventory Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-6 text-center">Inventory Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl text-center transform hover:scale-105 transition-all duration-200">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-lg font-bold">{products.length}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">Total Products</div>
                  <div className="text-sm text-gray-600">In your catalog</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl text-center transform hover:scale-105 transition-all duration-200">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-lg font-bold">{products.filter(p => p.status === 'active').length}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">Active</div>
                  <div className="text-sm text-gray-600">Available for sale</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl text-center transform hover:scale-105 transition-all duration-200">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-lg font-bold">{products.reduce((sum, p) => sum + p.stock, 0)}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">Total Stock</div>
                  <div className="text-sm text-gray-600">Units available</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl text-center transform hover:scale-105 transition-all duration-200">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-lg font-bold">{products.reduce((sum, p) => sum + p.soldCount, 0)}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">Total Sold</div>
                  <div className="text-sm text-gray-600">Units sold</div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100">
                    {product.image ? (
                      <>
                        <img 
                          src={getImageUrl(product.image)} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image failed to load:', product.image);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="w-full h-full flex items-center justify-center text-gray-400 hidden">
                          <CameraIcon className="w-12 h-12" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <CameraIcon className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col space-y-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                      
                      {/* Promotional Badges */}
                      {productPromotions[product._id] && productPromotions[product._id].length > 0 && (
                        <div className="flex flex-col space-y-1">
                          {promotionalService.getPromotionBadges(productPromotions[product._id]).map((badge, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 text-xs font-bold rounded-full border ${badge.color} shadow-sm`}
                              title={badge.description}
                            >
                              {badge.icon} {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                        title="Edit Product"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                                          <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePromotionalFeatures(product)}
                        className="bg-gradient-to-r from-amber-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold hover:from-amber-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        title="Boost Product Visibility"
                      >
                        <SparklesIcon className="w-3 h-3 mr-1" />
                        Boost
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.description}</p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-600">${product.price}</span>
                        <span className="text-sm text-gray-500">
                          Stock: {product.stock} {product.unit}
                        </span>
                      </div>
                      {product.soldCount > 0 && (
                        <div className="text-sm text-gray-500">
                          Sold: {product.soldCount} {product.unit}
                        </div>
                      )}
                    </div>

                    {/* Categories and Tags */}
                    <div className="space-y-2 mb-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {product.category}
                        </span>
                        {product.subcategory && (
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                            {product.subcategory}
                          </span>
                        )}
                      </div>
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {product.tags.length > 3 && (
                            <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              +{product.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dietary Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.isOrganic && (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Organic
                        </span>
                      )}
                      {product.isGlutenFree && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Gluten-Free
                        </span>
                      )}
                      {product.isVegan && (
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">
                          Vegan
                        </span>
                      )}
                      {product.isHalal && (
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          Halal
                        </span>
                      )}
                    </div>

                    {/* Distance Information */}
                    {(product.distance || product.formattedDistance) && (
                      <div className="mb-3">
                        <DistanceBadge 
                          distance={product.distance} 
                          formattedDistance={product.formattedDistance}
                        />
                      </div>
                    )}

                    {/* Stock Management */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={product.stock}
                            onChange={(e) => handleUpdateStock(product._id, e.target.value)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-600">{product.unit}</span>
                        </div>
                        <button
                          onClick={() => handleToggleStatus(product._id)}
                          className={`px-3 py-1 text-xs font-medium rounded ${
                            product.status === 'active'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {product.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <PlusIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-sm text-gray-600 mb-4">Start selling by adding your first product</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Add Your First Product
            </button>
          </div>
        )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateProduct} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                      <input
                        required
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Category and Stock */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                      <select
                        required
                        value={editingProduct.category}
                        onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value, subcategory: ''})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Category</option>
                        {Object.keys(categories).map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                      <select
                        value={editingProduct.subcategory}
                        onChange={(e) => setEditingProduct({...editingProduct, subcategory: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Subcategory</option>
                        {editingProduct.category && categories[editingProduct.category]?.map((subcategory) => (
                          <option key={subcategory} value={subcategory}>{subcategory}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea
                      required
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Describe your product..."
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                    <div className="space-y-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      {(editingProduct.imagePreview || editingProduct.image) && (
                        <div className="relative">
                                                <img 
                        src={editingProduct.imagePreview || getImageUrl(editingProduct.image)} 
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                          <button
                            type="button"
                            onClick={() => setEditingProduct({...editingProduct, image: null, imagePreview: null})}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dietary Preferences */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingProduct.isOrganic}
                          onChange={(e) => setEditingProduct({...editingProduct, isOrganic: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Organic</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingProduct.isGlutenFree}
                          onChange={(e) => setEditingProduct({...editingProduct, isGlutenFree: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Gluten-Free</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingProduct.isVegan}
                          onChange={(e) => setEditingProduct({...editingProduct, isVegan: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Vegan</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingProduct.isHalal}
                          onChange={(e) => setEditingProduct({...editingProduct, isHalal: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Halal</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center"
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Update Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Promotional Features Modal */}
        {showPromotions && selectedProductForPromotions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Promotional Features - {selectedProductForPromotions.name}
                </h2>
                <button
                  onClick={() => setShowPromotions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <ProductPromotions 
                product={selectedProductForPromotions}
                onPromotionUpdate={handlePromotionUpdate}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

