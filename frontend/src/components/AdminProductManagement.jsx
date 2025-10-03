import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  StarIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';

export default function AdminProductManagement() {
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
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      applyFiltersAndSort();
    }
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const checkAdminAccess = async () => {
    try {
      const token = authToken.getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const profile = await getProfile();
      if (profile.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      loadProducts();
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Authentication error');
      navigate('/login');
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const productsData = await adminService.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.artisan?.artisanName?.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Handle HTTP URLs (including Vercel Blob URLs)
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Handle Vercel Blob URLs that might be stored as filenames
    if (imagePath.includes('.public.blob.vercel-storage.com')) {
      return imagePath;
    }
    
    // Handle relative paths (legacy support)
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths with leading slash (legacy support)
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths without leading slash (legacy support)
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
  };

  const handleStatusChange = async (productId, newStatus) => {
    try {
      // Call the API to update the database
      await adminService.updateProductStatus(productId, newStatus === 'active');
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product._id === productId 
          ? { ...product, status: newStatus }
          : product
      ));
      toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
    }
  };

  const handleFeaturedToggle = async (productId, currentFeatured) => {
    try {
      const newFeaturedStatus = !currentFeatured;
      
      // Call the API to update the database
      await adminService.setFeaturedProduct(productId, newFeaturedStatus);
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product._id === productId 
          ? { ...product, isFeatured: newFeaturedStatus }
          : product
      ));
      
      toast.success(`Product ${newFeaturedStatus ? 'added to' : 'removed from'} featured list`);
    } catch (error) {
      console.error('Error updating featured status:', error);
      toast.error('Failed to update featured status');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      // Call the API to delete the product
      await adminService.deleteProduct(productId);
      
      // Update local state
      setProducts(prev => prev.filter(product => product._id !== productId));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      out_of_stock: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getFeaturedBadge = (isFeatured) => {
    return isFeatured 
      ? 'bg-yellow-100 text-yellow-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const categories = [
    'Bakery', 'Dairy & Eggs', 'Fresh Produce', 'Meat & Poultry', 
    'Honey & Jams', 'Herbs & Spices', 'Artisan Cakes', 'Small-Batch Coffee'
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
              <p className="text-gray-600 mt-1">
                Manage products, set featured items, and control listings
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock">Stock</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? (
                <ArrowUpIcon className="w-5 h-5" />
              ) : (
                <ArrowDownIcon className="w-5 h-5" />
              )}
              <span className="ml-2">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artisan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image, { width: 48, height: 48, quality: 80 })}
                              alt={product.name}
                              className="h-12 w-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center" style={{ display: product.image ? 'none' : 'flex' }}>
                            <span className="text-lg">📦</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {product._id.slice(-8)}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-xs">
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.artisan?.artisanName || 'Unknown Artisan'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.artisan?.email || product.artisan?.user?.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={product.status}
                        onChange={(e) => handleStatusChange(product._id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(product.status)} border-0 focus:ring-2 focus:ring-green-500`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleFeaturedToggle(product._id, product.isFeatured)}
                        className={`text-xs font-medium px-2 py-1 rounded-full ${getFeaturedBadge(product.isFeatured)} hover:opacity-80`}
                      >
                        {product.isFeatured ? 'Featured' : 'Not Featured'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewProduct(product)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View product details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete product"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-6 text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedProduct.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedProduct.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <p className="text-sm text-gray-900">{formatPrice(selectedProduct.price)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900">{selectedProduct.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {selectedProduct.productType === 'ready_to_ship' ? 'Stock' :
                     selectedProduct.productType === 'made_to_order' ? 'Total Capacity' :
                     'Available Quantity'}
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedProduct.productType === 'ready_to_ship' ? selectedProduct.stock :
                     selectedProduct.productType === 'made_to_order' ? selectedProduct.totalCapacity :
                     selectedProduct.availableQuantity} units
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Artisan</label>
                  <p className="text-sm text-gray-900">
                    {selectedProduct.artisan?.artisanName || 'Unknown Artisan'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedProduct.artisan?.email || selectedProduct.artisan?.user?.email || 'No email'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(selectedProduct.status)}`}>
                    {selectedProduct.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Featured</label>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getFeaturedBadge(selectedProduct.isFeatured)}`}>
                    {selectedProduct.isFeatured ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedProduct.createdAt)}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
