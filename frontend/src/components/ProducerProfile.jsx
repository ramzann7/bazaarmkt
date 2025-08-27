import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  MapPinIcon, 
  BellIcon, 
  CreditCardIcon, 
  CogIcon, 
  ShieldCheckIcon,
  CameraIcon,
  PlusIcon,
  TrashIcon,
  CubeIcon,
  ShoppingBagIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  ScaleIcon,
  Cog6ToothIcon,
  StarIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { profileService } from '../services/profileService';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

export default function BusinessProfile() {
  const [profile, setProfile] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'operations', name: 'Operations', icon: CogIcon },
    { id: 'hours', name: 'Business Hours', icon: ClockIcon },
    { id: 'delivery', name: 'Delivery', icon: MapPinIcon },
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      
      // Load user profile first
      const profileData = await profileService.getProfile();
      setProfile(profileData);
      
      // Try to load business profile, but don't fail if it doesn't exist
      try {
        const businessData = await profileService.getBusinessProfile();
        setBusinessProfile(businessData);
      } catch (businessError) {
        console.log('Business profile not found yet, user needs to set it up');
        setBusinessProfile(null);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // If business profile doesn't exist, show setup tab
      if (!businessProfile && profile.role === 'artisan') {
    const setupTabs = [
      { id: 'setup', name: 'Setup Profile', icon: UserIcon },
      { id: 'personal', name: 'Personal Info', icon: UserIcon },
      { id: 'notifications', name: 'Notifications', icon: BellIcon },
      { id: 'payment', name: 'Payment', icon: CreditCardIcon },
      { id: 'security', name: 'Security', icon: ShieldCheckIcon }
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {setupTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-5 h-5 inline mr-2" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'setup' && (
                <SetupProfileTab onProfileCreated={loadProfiles} />
              )}
              {activeTab === 'personal' && <PersonalInfoTab profile={profile} />}
              {activeTab === 'notifications' && <NotificationsTab profile={profile} />}
              {activeTab === 'payment' && <PaymentTab profile={profile} />}
              {activeTab === 'security' && <SecurityTab profile={profile} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5 inline mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab profile={profile} producerProfile={producerProfile} />
            )}
            {activeTab === 'operations' && <OperationsTab producerProfile={producerProfile} onUpdate={loadProfiles} />}
            {activeTab === 'hours' && <BusinessHoursTab producerProfile={producerProfile} onUpdate={loadProfiles} />}
            {activeTab === 'delivery' && <DeliveryTab producerProfile={producerProfile} onUpdate={loadProfiles} />}
            {activeTab === 'personal' && <PersonalInfoTab profile={profile} onUpdate={loadProfiles} />}
            {activeTab === 'notifications' && <NotificationsTab profile={profile} onUpdate={loadProfiles} />}
            {activeTab === 'payment' && <PaymentTab profile={profile} onUpdate={loadProfiles} />}
            {activeTab === 'security' && <SecurityTab profile={profile} onUpdate={loadProfiles} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function OverviewTab({ profile, producerProfile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <CubeIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-orange-100">Business Status</p>
              <p className="text-2xl font-bold">{producerProfile?.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <ShoppingBagIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-blue-100">Total Orders</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-green-100">Revenue</p>
              <p className="text-2xl font-bold">$0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Business Name</p>
            <p className="font-medium">{producerProfile?.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Business Type</p>
            <p className="font-medium capitalize">{producerProfile?.type || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="font-medium">{producerProfile?.category || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium">
              <span className={`px-2 py-1 rounded-full text-xs ${
                producerProfile?.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {producerProfile?.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTab({ producerProfile, products, onProductsChange }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { value: 'produce', label: 'Fresh Produce', icon: '🍎' },
    { value: 'eggs', label: 'Fresh Eggs', icon: '🥚' },
    { value: 'bread', label: 'Fresh Bread', icon: '🍞' },
    { value: 'dairy', label: 'Dairy', icon: '🥛' },
    { value: 'meat', label: 'Meat & Poultry', icon: '🍗' },
    { value: 'honey', label: 'Honey & Jams', icon: '🍯' },
    { value: 'herbs', label: 'Herbs & Spices', icon: '🌿' },
    { value: 'cakes', label: 'Artisan Cakes', icon: '🎂' },
    { value: 'coffee', label: 'Small-Batch Coffee', icon: '☕' },
    { value: 'tea', label: 'Artisan Tea', icon: '🫖' },
    { value: 'jams', label: 'Homemade Jams', icon: '🍓' },
    { value: 'pickles', label: 'Pickles & Preserves', icon: '🥒' },
    { value: 'sauces', label: 'Artisan Sauces', icon: '🍅' },
    { value: 'spices', label: 'Fresh Spices', icon: '🧂' },
    { value: 'nuts', label: 'Nuts & Seeds', icon: '🥜' },
    { value: 'grains', label: 'Grains & Flour', icon: '🌾' },
    { value: 'pasta', label: 'Fresh Pasta', icon: '🍝' },
    { value: 'oils', label: 'Artisan Oils', icon: '🫒' },
    { value: 'vinegars', label: 'Specialty Vinegars', icon: '🍷' },
    { value: 'cheese', label: 'Artisan Cheese', icon: '🧀' },
    { value: 'yogurt', label: 'Fresh Yogurt', icon: '🥛' },
    { value: 'butter', label: 'Handmade Butter', icon: '🧈' },
    { value: 'ice_cream', label: 'Artisan Ice Cream', icon: '🍦' },
    { value: 'chocolate', label: 'Handcrafted Chocolate', icon: '🍫' },
    { value: 'candies', label: 'Homemade Candies', icon: '🍬' },
    { value: 'snacks', label: 'Artisan Snacks', icon: '🥨' },
    { value: 'beverages', label: 'Craft Beverages', icon: '🥤' },
    { value: 'alcohol', label: 'Small-Batch Alcohol', icon: '🍺' },
    { value: 'flowers', label: 'Fresh Flowers', icon: '🌸' },
    { value: 'plants', label: 'Plants & Herbs', icon: '🌱' },
    { value: 'seeds', label: 'Garden Seeds', icon: '🌱' },
    { value: 'fertilizers', label: 'Organic Fertilizers', icon: '🌿' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];

  const units = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'lb', label: 'Pound (lb)' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'piece', label: 'Piece' },
    { value: 'bunch', label: 'Bunch' },
    { value: 'jar', label: 'Jar' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'bag', label: 'Bag' },
    { value: 'box', label: 'Box' },
    { value: 'slice', label: 'Slice' },
    { value: 'loaf', label: 'Loaf' },
    { value: 'cake', label: 'Cake' },
    { value: 'muffin', label: 'Muffin' },
    { value: 'cookie', label: 'Cookie' },
    { value: 'cup', label: 'Cup' },
    { value: 'tbsp', label: 'Tablespoon (tbsp)' },
    { value: 'tsp', label: 'Teaspoon (tsp)' },
    { value: 'oz', label: 'Ounce (oz)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'l', label: 'Liter (l)' }
  ];

  const handleProductCreated = (newProduct) => {
    onProductsChange([...products, newProduct]);
    setShowAddForm(false);
  };

  const handleProductUpdated = (updatedProduct) => {
    onProductsChange(products.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    setEditingProduct(null);
  };

  const handleProductDeleted = (productId) => {
    onProductsChange(products.filter(p => p._id !== productId));
  };

  const handleInventoryUpdated = (updatedProduct) => {
    onProductsChange(products.map(p => p._id === updatedProduct._id ? updatedProduct : p));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">My Products</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {showAddForm && (
        <AddProductForm 
          onClose={() => setShowAddForm(false)}
          onSuccess={handleProductCreated}
          categories={categories}
          units={units}
        />
      )}

      {editingProduct && (
        <EditProductForm 
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleProductUpdated}
          categories={categories}
          units={units}
        />
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading products...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No products listed yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                Add Your First Product
              </button>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard 
                key={product._id} 
                product={product} 
                onEdit={() => setEditingProduct(product)}
                onDelete={handleProductDeleted}
                onInventoryUpdate={handleInventoryUpdated}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete, onInventoryUpdate }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryData, setInventoryData] = useState({
    quantityAvailable: product.quantityAvailable,
    dailyCap: product.dailyCap
  });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setIsDeleting(true);
      try {
        await productService.deleteProduct(product._id);
        onDelete(product._id);
        toast.success('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleInventoryUpdate = async () => {
    setIsUpdatingInventory(true);
    try {
      const updatedProduct = await productService.updateInventory(product._id, inventoryData);
      onInventoryUpdate(updatedProduct);
      setShowInventoryModal(false);
      toast.success('Inventory updated successfully');
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error(error.response?.data?.message || 'Failed to update inventory');
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const primaryPhoto = product.photos?.find(photo => photo.isPrimary) || product.photos?.[0];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-100">
        {primaryPhoto ? (
          <img
            src={primaryPhoto.url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex space-x-1">
          <button
            onClick={() => setShowInventoryModal(true)}
            className="p-1 bg-blue-500 text-white rounded shadow-sm hover:bg-blue-600"
            title="Manage inventory"
          >
            <ScaleIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 bg-white rounded shadow-sm hover:bg-gray-50"
            title="Edit product"
          >
            <Cog6ToothIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 bg-red-500 text-white rounded shadow-sm hover:bg-red-600 disabled:opacity-50"
            title="Delete product"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-orange-600">${product.price}</span>
          <span className="text-sm text-gray-500">{product.unit}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Available: {product.quantityAvailable}</span>
          <span>Daily Cap: {product.dailyCap || 'No limit'}</span>
        </div>

        {product.tags && product.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {product.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{product.tags.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Inventory</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity Available
                </label>
                <input
                  type="number"
                  value={inventoryData.quantityAvailable}
                  onChange={(e) => setInventoryData({
                    ...inventoryData,
                    quantityAvailable: parseInt(e.target.value)
                  })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Cap (0 = no limit)
                </label>
                <input
                  type="number"
                  value={inventoryData.dailyCap}
                  onChange={(e) => setInventoryData({
                    ...inventoryData,
                    dailyCap: parseInt(e.target.value)
                  })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInventoryModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInventoryUpdate}
                disabled={isUpdatingInventory}
                className="btn-primary disabled:opacity-50"
              >
                {isUpdatingInventory ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder components for other tabs
function OrdersTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders</h2>
      <p className="text-gray-600">Order management coming soon...</p>
    </div>
  );
}

function OperationsTab({ producerProfile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    farmingMethods: producerProfile?.operationDetails?.farmingMethods || '',
    sustainabilityPractices: producerProfile?.operationDetails?.sustainabilityPractices || '',
    certifications: producerProfile?.operationDetails?.certifications || [],
    yearsInBusiness: producerProfile?.operationDetails?.yearsInBusiness || '',
    productionCapacity: producerProfile?.operationDetails?.productionCapacity || '',
    qualityStandards: producerProfile?.operationDetails?.qualityStandards || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateProducerOperations(formData);
      toast.success('Operations updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating operations:', error);
      toast.error(error.response?.data?.message || 'Failed to update operations');
    } finally {
      setIsSaving(false);
    }
  };

  const addCertification = () => {
    setFormData({
      ...formData,
      certifications: [...formData.certifications, '']
    });
  };

  const removeCertification = (index) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index)
    });
  };

  const updateCertification = (index, value) => {
    const newCertifications = [...formData.certifications];
    newCertifications[index] = value;
    setFormData({
      ...formData,
      certifications: newCertifications
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Operations Management</h2>
      <p className="text-gray-600 mb-6">Manage your business operations and production details.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farming Methods
            </label>
            <textarea
              value={formData.farmingMethods}
              onChange={(e) => setFormData({ ...formData, farmingMethods: e.target.value })}
              className="input-field"
              rows="3"
              placeholder="Describe your farming methods..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sustainability Practices
            </label>
            <textarea
              value={formData.sustainabilityPractices}
              onChange={(e) => setFormData({ ...formData, sustainabilityPractices: e.target.value })}
              className="input-field"
              rows="3"
              placeholder="Describe your sustainability practices..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years in Business
            </label>
            <input
              type="number"
              value={formData.yearsInBusiness}
              onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
              className="input-field"
              placeholder="Number of years"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Production Capacity
            </label>
            <input
              type="text"
              value={formData.productionCapacity}
              onChange={(e) => setFormData({ ...formData, productionCapacity: e.target.value })}
              className="input-field"
              placeholder="e.g., 1000 kg per month"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quality Standards
          </label>
          <textarea
            value={formData.qualityStandards}
            onChange={(e) => setFormData({ ...formData, qualityStandards: e.target.value })}
            className="input-field"
            rows="3"
            placeholder="Describe your quality standards and processes..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certifications
          </label>
          <div className="space-y-2">
            {formData.certifications.map((cert, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={cert}
                  onChange={(e) => updateCertification(index, e.target.value)}
                  className="input-field flex-1"
                  placeholder="Certification name"
                />
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCertification}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
            >
              <PlusIcon className="w-4 h-4" />
              Add Certification
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Operations'}
          </button>
        </div>
      </form>
    </div>
  );
}

function BusinessHoursTab({ producerProfile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '15:00', closed: false },
    sunday: { open: '10:00', close: '14:00', closed: true },
    ...producerProfile?.businessHours
  });

  const days = [
    { key: 'monday', name: 'Monday' },
    { key: 'tuesday', name: 'Tuesday' },
    { key: 'wednesday', name: 'Wednesday' },
    { key: 'thursday', name: 'Thursday' },
    { key: 'friday', name: 'Friday' },
    { key: 'saturday', name: 'Saturday' },
    { key: 'sunday', name: 'Sunday' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateProducerBusinessHours(businessHours);
      toast.success('Business hours updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error(error.response?.data?.message || 'Failed to update business hours');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDay = (day, field, value) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [field]: value
      }
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Hours</h2>
      <p className="text-gray-600 mb-6">Set your business operating hours for each day of the week.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {days.map(({ key, name }) => (
            <div key={key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-24">
                <span className="font-medium text-gray-700">{name}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`${key}-closed`}
                  checked={businessHours[key].closed}
                  onChange={(e) => updateDay(key, 'closed', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor={`${key}-closed`} className="text-sm text-gray-600">
                  Closed
                </label>
              </div>

              {!businessHours[key].closed && (
                <>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Open:</label>
                    <input
                      type="time"
                      value={businessHours[key].open}
                      onChange={(e) => updateDay(key, 'open', e.target.value)}
                      className="input-field w-32"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Close:</label>
                    <input
                      type="time"
                      value={businessHours[key].close}
                      onChange={(e) => updateDay(key, 'close', e.target.value)}
                      className="input-field w-32"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Business Hours'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeliveryTab({ producerProfile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState({
    pickup: producerProfile?.deliveryOptions?.pickup ?? true,
    delivery: producerProfile?.deliveryOptions?.delivery ?? false,
    deliveryRadius: producerProfile?.deliveryOptions?.deliveryRadius || 10,
    deliveryFee: producerProfile?.deliveryOptions?.deliveryFee || 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateProducerDeliveryOptions(deliveryOptions);
      toast.success('Delivery options updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating delivery options:', error);
      toast.error(error.response?.data?.message || 'Failed to update delivery options');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Options</h2>
      <p className="text-gray-600 mb-6">Configure your delivery and pickup options for customers.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="pickup"
              checked={deliveryOptions.pickup}
              onChange={(e) => setDeliveryOptions({ ...deliveryOptions, pickup: e.target.checked })}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="pickup" className="text-lg font-medium text-gray-700">
              Offer Pickup
            </label>
            <p className="text-sm text-gray-500">Customers can pick up orders from your location</p>
          </div>

          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="delivery"
              checked={deliveryOptions.delivery}
              onChange={(e) => setDeliveryOptions({ ...deliveryOptions, delivery: e.target.checked })}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="delivery" className="text-lg font-medium text-gray-700">
              Offer Delivery
            </label>
            <p className="text-sm text-gray-500">Deliver orders to customer locations</p>
          </div>
        </div>

        {deliveryOptions.delivery && (
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Delivery Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Radius (km)
                </label>
                <input
                  type="number"
                  value={deliveryOptions.deliveryRadius}
                  onChange={(e) => setDeliveryOptions({ ...deliveryOptions, deliveryRadius: Number(e.target.value) })}
                  className="input-field"
                  min="1"
                  max="100"
                  placeholder="10"
                />
                <p className="text-sm text-gray-500 mt-1">Maximum distance for delivery</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Fee ($)
                </label>
                <input
                  type="number"
                  value={deliveryOptions.deliveryFee}
                  onChange={(e) => setDeliveryOptions({ ...deliveryOptions, deliveryFee: Number(e.target.value) })}
                  className="input-field"
                  min="0"
                  step="0.01"
                  placeholder="5.00"
                />
                <p className="text-sm text-gray-500 mt-1">Fixed delivery fee per order</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Delivery Options'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PersonalInfoTab({ profile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    addresses: profile?.addresses || []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateBasicProfile(formData);
      toast.success('Personal information updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast.error(error.response?.data?.message || 'Failed to update personal information');
    } finally {
      setIsSaving(false);
    }
  };

  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, {
        type: 'home',
        label: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Canada',
        isDefault: false
      }]
    });
  };

  const removeAddress = (index) => {
    setFormData({
      ...formData,
      addresses: formData.addresses.filter((_, i) => i !== index)
    });
  };

  const updateAddress = (index, field, value) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
  };

  const setDefaultAddress = (index) => {
    const newAddresses = formData.addresses.map((addr, i) => ({
      ...addr,
      isDefault: i === index
    }));
    setFormData({ ...formData, addresses: newAddresses });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
      <p className="text-gray-600 mb-6">Update your personal information and contact details.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Addresses</h3>
            <button
              type="button"
              onClick={addAddress}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
            >
              <PlusIcon className="w-4 h-4" />
              Add Address
            </button>
          </div>

          <div className="space-y-4">
            {formData.addresses.map((address, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <select
                      value={address.type}
                      onChange={(e) => updateAddress(index, 'type', e.target.value)}
                      className="input-field w-32"
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={address.label}
                      onChange={(e) => updateAddress(index, 'label', e.target.value)}
                      className="input-field w-48"
                      placeholder="Address label"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setDefaultAddress(index)}
                      className={`px-3 py-1 rounded text-sm ${
                        address.isDefault
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {address.isDefault ? 'Default' : 'Set Default'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => updateAddress(index, 'street', e.target.value)}
                    className="input-field"
                    placeholder="Street Address"
                  />
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => updateAddress(index, 'city', e.target.value)}
                    className="input-field"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => updateAddress(index, 'state', e.target.value)}
                    className="input-field"
                    placeholder="State/Province"
                  />
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => updateAddress(index, 'zipCode', e.target.value)}
                    className="input-field"
                    placeholder="ZIP/Postal Code"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Personal Information'}
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationsTab({ profile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email: {
      marketing: profile?.notificationPreferences?.email?.marketing ?? true,
      orderUpdates: profile?.notificationPreferences?.email?.orderUpdates ?? true,
      promotions: profile?.notificationPreferences?.email?.promotions ?? true,
      security: profile?.notificationPreferences?.email?.security ?? true
    },
    push: {
      orderUpdates: profile?.notificationPreferences?.push?.orderUpdates ?? true,
      promotions: profile?.notificationPreferences?.push?.promotions ?? true,
              newArtisans: profile?.notificationPreferences?.push?.newArtisans ?? true,
      nearbyOffers: profile?.notificationPreferences?.push?.nearbyOffers ?? true
    },
    sms: {
      orderUpdates: profile?.notificationPreferences?.sms?.orderUpdates ?? false,
      promotions: profile?.notificationPreferences?.sms?.promotions ?? false
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateNotifications(notifications);
      toast.success('Notification preferences updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error(error.response?.data?.message || 'Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotification = (channel, type, value) => {
    setNotifications({
      ...notifications,
      [channel]: {
        ...notifications[channel],
        [type]: value
      }
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
      <p className="text-gray-600 mb-6">Manage how you receive notifications about orders, promotions, and updates.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Notifications */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BellIcon className="w-5 h-5 mr-2" />
            Email Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Marketing & Newsletters</p>
                <p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email.marketing}
                onChange={(e) => updateNotification('email', 'marketing', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Order Updates</p>
                <p className="text-sm text-gray-500">Get notified about order status changes</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email.orderUpdates}
                onChange={(e) => updateNotification('email', 'orderUpdates', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Promotions & Deals</p>
                <p className="text-sm text-gray-500">Receive special offers and discounts</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email.promotions}
                onChange={(e) => updateNotification('email', 'promotions', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Security Alerts</p>
                <p className="text-sm text-gray-500">Important security notifications</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email.security}
                onChange={(e) => updateNotification('email', 'security', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BellIcon className="w-5 h-5 mr-2" />
            Push Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Order Updates</p>
                <p className="text-sm text-gray-500">Real-time order status notifications</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.push.orderUpdates}
                onChange={(e) => updateNotification('push', 'orderUpdates', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Promotions</p>
                <p className="text-sm text-gray-500">Special offers and deals</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.push.promotions}
                onChange={(e) => updateNotification('push', 'promotions', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">New Artisans</p>
                <p className="text-sm text-gray-500">When new artisans join your area</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.push.newArtisans}
                onChange={(e) => updateNotification('push', 'newArtisans', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Nearby Offers</p>
                <p className="text-sm text-gray-500">Local deals and offers</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.push.nearbyOffers}
                onChange={(e) => updateNotification('push', 'nearbyOffers', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BellIcon className="w-5 h-5 mr-2" />
            SMS Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Order Updates</p>
                <p className="text-sm text-gray-500">Important order status changes via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.sms.orderUpdates}
                onChange={(e) => updateNotification('sms', 'orderUpdates', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Promotions</p>
                <p className="text-sm text-gray-500">Special offers via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.sms.promotions}
                onChange={(e) => updateNotification('sms', 'promotions', e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PaymentTab({ profile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(profile?.paymentMethods || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'credit_card',
    last4: '',
    brand: '',
    expiryMonth: '',
    expiryYear: '',
    cardholderName: '',
    isDefault: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updatePaymentMethods(paymentMethods);
      toast.success('Payment methods updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating payment methods:', error);
      toast.error(error.response?.data?.message || 'Failed to update payment methods');
    } finally {
      setIsSaving(false);
    }
  };

  const addPaymentMethod = async (e) => {
    e.preventDefault();
    if (!newPaymentMethod.last4 || !newPaymentMethod.cardholderName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedMethods = [...paymentMethods, { ...newPaymentMethod, id: Date.now() }];
    setPaymentMethods(updatedMethods);
    setNewPaymentMethod({
      type: 'credit_card',
      last4: '',
      brand: '',
      expiryMonth: '',
      expiryYear: '',
      cardholderName: '',
      isDefault: false
    });
    setShowAddForm(false);
  };

  const removePaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
  };

  const setDefaultPaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    })));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Methods</h2>
      <p className="text-gray-600 mb-6">Manage your payment methods for receiving payments from customers.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Existing Payment Methods */}
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {method.brand} •••• {method.last4}
                  </p>
                  <p className="text-sm text-gray-500">
                    {method.cardholderName} • Expires {method.expiryMonth}/{method.expiryYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {method.isDefault ? (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">Default</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDefaultPaymentMethod(method.id)}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                  >
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePaymentMethod(method.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Payment Method */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add Payment Method
          </button>
        ) : (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Payment Method</h3>
            <form onSubmit={addPaymentMethod} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Type
                  </label>
                  <select
                    value={newPaymentMethod.type}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Brand
                  </label>
                  <select
                    value={newPaymentMethod.brand}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, brand: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select Brand</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last 4 Digits *
                  </label>
                  <input
                    type="text"
                    value={newPaymentMethod.last4}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, last4: e.target.value })}
                    className="input-field"
                    placeholder="1234"
                    maxLength="4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name *
                  </label>
                  <input
                    type="text"
                    value={newPaymentMethod.cardholderName}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardholderName: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Month
                  </label>
                  <input
                    type="text"
                    value={newPaymentMethod.expiryMonth}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
                    className="input-field"
                    placeholder="12"
                    maxLength="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Year
                  </label>
                  <input
                    type="text"
                    value={newPaymentMethod.expiryYear}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
                    className="input-field"
                    placeholder="2025"
                    maxLength="4"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newPaymentMethod.isDefault}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-600">
                  Set as default payment method
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Payment Method
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Payment Methods'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecurityTab({ profile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: profile?.accountSettings?.twoFactorEnabled ?? false,
    loginNotifications: profile?.accountSettings?.loginNotifications ?? true,
    sessionTimeout: profile?.accountSettings?.sessionTimeout ?? 30
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsSaving(true);
    try {
      await profileService.changePassword(passwordData);
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySettingsUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.updateSecuritySettings(securitySettings);
      toast.success('Security settings updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update security settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
      <p className="text-gray-600 mb-6">Manage your account security and privacy settings.</p>

      <div className="space-y-8">
        {/* Password Change */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="btn-primary"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="input-field"
                  required
                  minLength="8"
                />
                <p className="text-sm text-gray-500 mt-1">Password must be at least 8 characters long</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Settings */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Preferences</h3>
          
          <form onSubmit={handleSecuritySettingsUpdate} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
              <input
                type="checkbox"
                checked={securitySettings.twoFactorEnabled}
                onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: e.target.checked })}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Login Notifications</p>
                <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
              </div>
              <input
                type="checkbox"
                checked={securitySettings.loginNotifications}
                onChange={(e) => setSecuritySettings({ ...securitySettings, loginNotifications: e.target.checked })}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: Number(e.target.value) })}
                className="input-field w-48"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Automatically log out after inactivity</p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? 'Saving...' : 'Save Security Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Activity */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-gray-700">Last Login</p>
                <p className="text-sm text-gray-500">Today at 2:30 PM</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Current Session</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-gray-700">Previous Login</p>
                <p className="text-sm text-gray-500">Yesterday at 10:15 AM</p>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">Montreal, QC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupProfileTab({ onProfileCreated }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'farm',
    category: 'produce',
    description: '',
    specialties: [''],
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Canada'
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await profileService.createProducerProfile(formData);
      toast.success('Producer profile created successfully!');
      onProfileCreated();
    } catch (error) {
      console.error('Error creating producer profile:', error);
      toast.error(error.response?.data?.message || 'Failed to create producer profile');
    } finally {
      setIsSaving(false);
    }
  };

  const addSpecialty = () => {
    setFormData({
      ...formData,
      specialties: [...formData.specialties, '']
    });
  };

  const removeSpecialty = (index) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index)
    });
  };

  const updateSpecialty = (index, value) => {
    const newSpecialties = [...formData.specialties];
    newSpecialties[index] = value;
    setFormData({
      ...formData,
      specialties: newSpecialties
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup Your Producer Profile</h2>
      <p className="text-gray-600 mb-6">Tell customers about your business and what you offer.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input-field"
              required
            >
              <option value="farm">Farm</option>
              <option value="bakery">Bakery</option>
              <option value="dairy">Dairy</option>
              <option value="individual">Individual Producer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="input-field"
            required
          >
            <option value="produce">Fresh Produce</option>
            <option value="dairy">Dairy</option>
            <option value="bread">Bread & Pastries</option>
            <option value="meat">Meat & Poultry</option>
            <option value="honey">Honey & Jams</option>
            <option value="herbs">Herbs & Spices</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="input-field"
            placeholder="Tell customers about your business, your methods, and what makes your products special..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specialties
          </label>
          {formData.specialties.map((specialty, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={specialty}
                onChange={(e) => updateSpecialty(index, e.target.value)}
                className="input-field flex-1"
                placeholder="e.g., Organic Apples"
              />
              <button
                type="button"
                onClick={() => removeSpecialty(index)}
                className="px-3 py-2 text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSpecialty}
            className="btn-secondary text-sm"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Specialty
          </button>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-4">Business Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value }
                })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                value={formData.address.zipCode}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, zipCode: e.target.value }
                })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            {isSaving ? 'Creating Profile...' : 'Create Producer Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Placeholder for AddProductForm and EditProductForm
function AddProductForm({ onClose, onSuccess, categories, units }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Add New Product</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <TrashIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-600">Product creation form coming soon...</p>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

function EditProductForm({ product, onClose, onSuccess, categories, units }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Edit Product</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <TrashIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-600">Product editing form coming soon...</p>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
