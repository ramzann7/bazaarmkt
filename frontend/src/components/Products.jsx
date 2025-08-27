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
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { getMyProducts, createProduct, updateProduct, deleteProduct, uploadImage, updateInventory, getAllProducts } from '../services/productService';
import { getProfile } from '../services/authService';
import toast from 'react-hot-toast';

export default function Products() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
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
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Comprehensive product categories aligned with artisan types
  const categories = {
    'Fresh Produce & Vegetables': ['Leafy Greens', 'Root Vegetables', 'Tomatoes', 'Peppers', 'Cucumbers', 'Squash', 'Onions & Garlic', 'Carrots', 'Potatoes', 'Other Vegetables'],
    'Fruits & Berries': ['Apples', 'Berries', 'Stone Fruits', 'Citrus', 'Melons', 'Grapes', 'Tropical Fruits', 'Other Fruits'],
    'Dairy & Eggs': ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Eggs', 'Cream', 'Ice Cream', 'Other Dairy'],
    'Meat & Poultry': ['Beef', 'Pork', 'Chicken', 'Turkey', 'Lamb', 'Game Meat', 'Processed Meat', 'Other Meat'],
    'Seafood & Fish': ['Fresh Fish', 'Shellfish', 'Smoked Fish', 'Canned Fish', 'Other Seafood'],
    'Bread & Pastries': ['Bread', 'Pastries', 'Cakes', 'Cookies', 'Pies', 'Sourdough', 'Gluten-Free', 'Other Bakery'],
    'Beverages & Drinks': ['Coffee', 'Tea', 'Juice', 'Wine', 'Beer', 'Spirits', 'Kombucha', 'Other Beverages'],
    'Preserves & Jams': ['Jams', 'Jellies', 'Pickles', 'Sauces', 'Syrups', 'Chutneys', 'Other Preserves'],
    'Herbs & Spices': ['Fresh Herbs', 'Dried Herbs', 'Spices', 'Herb Plants', 'Medicinal Herbs', 'Other Herbs'],
    'Grains & Cereals': ['Wheat', 'Rice', 'Oats', 'Corn', 'Quinoa', 'Barley', 'Other Grains'],
    'Nuts & Seeds': ['Almonds', 'Walnuts', 'Pecans', 'Sunflower Seeds', 'Pumpkin Seeds', 'Other Nuts'],
    'Honey & Sweeteners': ['Honey', 'Maple Syrup', 'Agave', 'Molasses', 'Other Sweeteners'],
    'Mushrooms': ['Button Mushrooms', 'Portobello', 'Shiitake', 'Oyster', 'Wild Mushrooms', 'Other Mushrooms'],
    'Microgreens & Sprouts': ['Alfalfa', 'Broccoli', 'Radish', 'Pea Shoots', 'Other Microgreens'],
    'Prepared Foods': ['Ready-to-Eat Meals', 'Soups', 'Salads', 'Dips', 'Other Prepared'],
    'Specialty Items': ['Organic Products', 'Gluten-Free', 'Vegan', 'Keto', 'Paleo', 'Other Specialty'],
    'Artisan Products': ['Chocolate', 'Artisan Cheese', 'Olive Oil', 'Vinegar', 'Mustard', 'Hot Sauce', 'Fermented Products'],
    'Seasonal Products': ['Spring Products', 'Summer Products', 'Fall Products', 'Winter Products', 'Holiday Specialties']
  };

  const units = ['piece', 'kg', 'lb', 'g', 'oz', 'dozen', 'bunch', 'pack', 'bottle', 'jar'];

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Artisan Profile</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
                <p className="text-gray-600">Manage your product inventory and listings</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel' : 'Add Product'}</span>
            </button>
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
            {/* Inventory Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Inventory Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{products.length}</div>
                  <div className="text-sm text-gray-600">Total Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {products.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {products.reduce((sum, p) => sum + p.stock, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Stock</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {products.reduce((sum, p) => sum + p.soldCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Sold</div>
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
                          src={product.image.startsWith('http') ? product.image : `http://localhost:4000${product.image}`} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
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
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
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
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
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
                            src={editingProduct.imagePreview || (editingProduct.image.startsWith('http') ? editingProduct.image : `http://localhost:4000${editingProduct.image}`)} 
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
      </div>
    </div>
  );
}

