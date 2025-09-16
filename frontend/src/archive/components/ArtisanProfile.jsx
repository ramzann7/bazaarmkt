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
import { getProfile } from '../services/authservice';
import { onboardingService } from '../services/onboardingService';
import toast from 'react-hot-toast';

// Helper function to format artisan type for display
const formatArtisanType = (type) => {
  const typeMap = {
    'farm': 'Farm',
    'bakery': 'Bakery',
    'restaurant': 'Restaurant',
    'cafe': 'Café',
    'market': 'Market',
    'butcher': 'Butcher Shop',
    'dairy': 'Dairy',
    'winery': 'Winery',
    'brewery': 'Brewery',
    'distillery': 'Distillery',
    'food_truck': 'Food Truck',
    'catering': 'Catering',
    'grocery': 'Grocery Store',
    'specialty_shop': 'Specialty Food Shop',
    'fish_market': 'Fish Market',
    'organic_store': 'Organic Store',
    'coffee_roaster': 'Coffee Roaster',
    'tea_house': 'Tea House',
    'chocolate_maker': 'Chocolate Maker',
    'cheese_maker': 'Cheese Maker',
    'honey_producer': 'Honey Producer',
    'maple_syrup': 'Maple Syrup Producer',
    'mushroom_farm': 'Mushroom Farm',
    'herb_garden': 'Herb Garden',
    'greenhouse': 'Greenhouse',
    'orchard': 'Orchard',
    'vineyard': 'Vineyard',
    'microgreens': 'Microgreens Farm',
    'aquaponics': 'Aquaponics Farm',
    'hydroponics': 'Hydroponics Farm',
    'other': 'Other'
  };
  return typeMap[type] || type;
};

// Helper function to suggest categories based on artisan type
const getSuggestedCategories = (artisanType) => {
  const suggestions = {
    'farm': ['Fresh Produce & Vegetables', 'Fruits & Berries', 'Grains & Cereals'],
    'bakery': ['Bread & Pastries'],
    'restaurant': ['Prepared Foods', 'Fresh Produce & Vegetables', 'Meat & Poultry'],
    'cafe': ['Beverages & Drinks', 'Bread & Pastries'],
    'market': ['Fresh Produce & Vegetables', 'Dairy & Eggs', 'Meat & Poultry', 'Bread & Pastries'],
    'butcher': ['Meat & Poultry'],
    'dairy': ['Dairy & Eggs'],
    'winery': ['Beverages & Drinks'],
    'brewery': ['Beverages & Drinks'],
    'distillery': ['Beverages & Drinks'],
    'food_truck': ['Prepared Foods', 'Beverages & Drinks'],
    'catering': ['Prepared Foods'],
    'grocery': ['Fresh Produce & Vegetables', 'Dairy & Eggs', 'Meat & Poultry', 'Bread & Pastries', 'Beverages & Drinks'],
    'specialty_shop': ['Specialty Items', 'Artisan Products'],
    'fish_market': ['Seafood & Fish'],
    'organic_store': ['Organic Products', 'Fresh Produce & Vegetables', 'Dairy & Eggs'],
    'coffee_roaster': ['Beverages & Drinks'],
    'tea_house': ['Beverages & Drinks'],
    'chocolate_maker': ['Artisan Products'],
    'cheese_maker': ['Artisan Products', 'Dairy & Eggs'],
    'honey_producer': ['Honey & Sweeteners'],
    'maple_syrup': ['Honey & Sweeteners'],
    'mushroom_farm': ['Mushrooms'],
    'herb_garden': ['Herbs & Spices'],
    'greenhouse': ['Fresh Produce & Vegetables', 'Herbs & Spices', 'Microgreens & Sprouts'],
    'orchard': ['Fruits & Berries'],
    'vineyard': ['Beverages & Drinks'],
    'microgreens': ['Microgreens & Sprouts'],
    'aquaponics': ['Fresh Produce & Vegetables', 'Seafood & Fish'],
    'hydroponics': ['Fresh Produce & Vegetables', 'Microgreens & Sprouts'],
    'other': []
  };
  return suggestions[artisanType] || [];
};

export default function ArtisanProfile() {
  const [profile, setProfile] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'operations', name: 'Operations & Contact', icon: CogIcon },
    { id: 'hours', name: 'Artisan Hours', icon: ClockIcon },
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
            const artisanData = await profileService.getArtisanProfile();
    setArtisanProfile(artisanData);
      } catch (artisanError) {
        console.log('Artisan profile not found yet, user needs to set it up');
        setArtisanProfile(null);
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

  // If artisan profile doesn't exist, show setup tab
      if (!artisanProfile && profile.role === 'artisan') {
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
              <OverviewTab profile={profile} artisanProfile={artisanProfile} />
            )}
            {activeTab === 'operations' && <OperationsContactTab artisanProfile={artisanProfile} onUpdate={loadProfiles} />}
            {activeTab === 'hours' && <ArtisanHoursTab artisanProfile={artisanProfile} onUpdate={loadProfiles} />}
            {activeTab === 'delivery' && <DeliveryTab artisanProfile={artisanProfile} onUpdate={loadProfiles} />}
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
function OverviewTab({ profile, artisanProfile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Artisan Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <CubeIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-orange-100">Artisan Status</p>
              <p className="text-2xl font-bold">{artisanProfile?.isActive ? 'Active' : 'Inactive'}</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Artisan Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Artisan Name</p>
            <p className="font-medium">{artisanProfile?.artisanName || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Artisan Type</p>
            <p className="font-medium">{formatArtisanType(artisanProfile?.type) || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="font-medium">{artisanProfile?.category || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium">
              <span className={`px-2 py-1 rounded-full text-xs ${
                artisanProfile?.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {artisanProfile?.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTab({ artisanProfile, products, onProductsChange }) {
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

// Orders management component
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, shipped, delivered, cancelled

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders/artisan', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success(`Order status updated to ${status}`);
        loadOrders(); // Reload orders
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You haven't received any orders yet." 
              : `No ${filter} orders found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order._id.slice(-8)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Customer: {order.customer?.firstName} {order.customer?.lastName}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    ${order.totalAmount?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Items:</h4>
                <div className="space-y-2">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Actions */}
              <div className="border-t pt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p>Total Items: {order.items?.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  {order.deliveryAddress && (
                    <p>Delivery: {order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order._id, 'confirmed')}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order._id, 'cancelled')}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'shipped')}
                      className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
                    >
                      Mark Shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'delivered')}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OperationsContactTab({ artisanProfile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Operations data
    productionMethods: artisanProfile?.operationDetails?.productionMethods || '',
      sustainabilityPractices: artisanProfile?.operationDetails?.sustainabilityPractices || '',
      certifications: artisanProfile?.operationDetails?.certifications || [],
      yearsInBusiness: artisanProfile?.operationDetails?.yearsInBusiness || '',
      productionCapacity: artisanProfile?.operationDetails?.productionCapacity || '',
    qualityStandards: artisanProfile?.operationDetails?.qualityStandards || '',
    equipment: artisanProfile?.operationDetails?.equipment || '',
    processes: artisanProfile?.operationDetails?.processes || '',
    ingredients: artisanProfile?.operationDetails?.ingredients || '',
    facilities: artisanProfile?.operationDetails?.facilities || '',
    // Contact and photos data
    photos: artisanProfile?.photos || [],
    contactInfo: {
      phone: artisanProfile?.contactInfo?.phone || '',
      email: artisanProfile?.contactInfo?.email || '',
      website: artisanProfile?.contactInfo?.website || '',
      socialMedia: {
        facebook: artisanProfile?.contactInfo?.socialMedia?.facebook || '',
        instagram: artisanProfile?.contactInfo?.socialMedia?.instagram || '',
        twitter: artisanProfile?.contactInfo?.socialMedia?.twitter || ''
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Save both operations and contact/photos data
      await Promise.all([
        profileService.updateArtisanOperations({
          productionMethods: formData.productionMethods,
          sustainabilityPractices: formData.sustainabilityPractices,
          certifications: formData.certifications,
          yearsInBusiness: formData.yearsInBusiness,
          productionCapacity: formData.productionCapacity,
          qualityStandards: formData.qualityStandards,
          equipment: formData.equipment,
          processes: formData.processes,
          ingredients: formData.ingredients,
          facilities: formData.facilities
        }),
        profileService.updateArtisanPhotosContact({
          photos: formData.photos,
          contactInfo: formData.contactInfo
        })
      ]);
      // Mark onboarding as completed when profile is saved
      try {
        const userProfile = await getProfile();
        const userId = userProfile._id;
        onboardingService.markOnboardingCompleted(userId);
      } catch (error) {
        console.error('Error marking onboarding completed:', error);
      }
      
      toast.success('Operations and contact information updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating operations and contact:', error);
      toast.error(error.response?.data?.message || 'Failed to update operations and contact information');
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

  const handlePhotoUpload = (index, file) => {
    if (file) {
      // Check file size first
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxFileSize) {
        alert('File is too large. Please select a smaller image (under 10MB).');
        return;
      }

      // Compress image before converting to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Set canvas size (max 600px width/height to reduce file size further)
        const maxSize = 600;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image with lower quality for better compression
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality for better compression
        
        // Check the size of the compressed data
        const dataSize = Math.ceil((compressedDataUrl.length * 3) / 4);
        const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);
        
        if (dataSize > 5 * 1024 * 1024) { // 5MB
          alert(`Image is still too large (${dataSizeMB}MB). Please select a smaller image.`);
          return;
        }
        
        console.log(`Compressed image size: ${dataSizeMB}MB`);
        
        const newPhotos = [...formData.photos];
        newPhotos[index] = compressedDataUrl;
        setFormData({ ...formData, photos: newPhotos });
      };
      
      img.src = URL.createObjectURL(file);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);
    setFormData({ ...formData, photos: newPhotos });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Operations & Contact Management</h2>
              <p className="text-gray-600 mb-6">Manage your artisan operations, production details, photos, and contact information.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Artisan Photos Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Artisan Photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors">
                  {formData.photos[index] ? (
                    <div className="relative">
                      <img
                        src={formData.photos[index]}
                        alt={`Business photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CameraIcon className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-500">
                        {index === 0 ? 'Primary Photo' : `Photo ${index + 1}`}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(index, e.target.files[0])}
                        className="hidden"
                        id={`photo-${index}`}
                      />
                      <label
                        htmlFor={`photo-${index}`}
                        className="cursor-pointer text-orange-600 hover:text-orange-700 text-sm font-medium"
                      >
                        Upload Photo
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Upload photos of your business, products, or facilities. The first photo will be your primary image.
          </p>
        </div>

        {/* Contact Information Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.contactInfo.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: e.target.value }
                })}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, email: e.target.value }
                })}
                className="input-field"
                placeholder="business@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                value={formData.contactInfo.website}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, website: e.target.value }
                })}
                className="input-field"
                placeholder="https://yourbusiness.com"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Social Media (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook
                </label>
                <input
                  type="url"
                  value={formData.contactInfo.socialMedia.facebook}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactInfo: {
                      ...formData.contactInfo,
                      socialMedia: { ...formData.contactInfo.socialMedia, facebook: e.target.value }
                    }
                  })}
                  className="input-field"
                  placeholder="https://facebook.com/yourbusiness"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.contactInfo.socialMedia.instagram}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactInfo: {
                      ...formData.contactInfo,
                      socialMedia: { ...formData.contactInfo.socialMedia, instagram: e.target.value }
                    }
                  })}
                  className="input-field"
                  placeholder="https://instagram.com/yourbusiness"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter/X
                </label>
                <input
                  type="url"
                  value={formData.contactInfo.socialMedia.twitter}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactInfo: {
                      ...formData.contactInfo,
                      socialMedia: { ...formData.contactInfo.socialMedia, twitter: e.target.value }
                    }
                  })}
                  className="input-field"
                  placeholder="https://twitter.com/yourbusiness"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operations Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operations & Production</h3>
          
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Methods
            </label>
            <textarea
                value={formData.productionMethods}
                onChange={(e) => setFormData({ ...formData, productionMethods: e.target.value })}
              className="input-field"
              rows="3"
                placeholder="Describe your production methods, techniques, or processes..."
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment & Tools
              </label>
              <textarea
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Describe your equipment, tools, or machinery..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Processes
              </label>
              <textarea
                value={formData.processes}
                onChange={(e) => setFormData({ ...formData, processes: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Describe your step-by-step production processes..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingredients & Materials
              </label>
              <textarea
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Describe your ingredients, materials, or sourcing..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facilities & Location
              </label>
              <textarea
                value={formData.facilities}
                onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Describe your facilities, workspace, or location..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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

          <div className="mt-6">
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

          <div className="mt-6">
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
                    placeholder="e.g., Organic Certified, Food Safety Certified"
                />
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-700"
                >
                    <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCertification}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
            >
                <PlusIcon className="h-4 w-4" />
              Add Certification
            </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Operations & Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}



function ArtisanHoursTab({ artisanProfile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [artisanHours, setArtisanHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '15:00', closed: false },
    sunday: { open: '10:00', close: '14:00', closed: true },
    ...artisanProfile?.artisanHours
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
                    await profileService.updateArtisanHours(artisanHours);
      toast.success('Artisan hours updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating artisan hours:', error);
      toast.error(error.response?.data?.message || 'Failed to update artisan hours');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDay = (day, field, value) => {
    setArtisanHours({
      ...artisanHours,
      [day]: {
        ...artisanHours[day],
        [field]: value
      }
    });
  };

  return (
    <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Artisan Hours</h2>
      <p className="text-gray-600 mb-6">Set your artisan operating hours for each day of the week.</p>

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
                  checked={artisanHours[key].closed}
                  onChange={(e) => updateDay(key, 'closed', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor={`${key}-closed`} className="text-sm text-gray-600">
                  Closed
                </label>
              </div>

              {!artisanHours[key].closed && (
                <>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Open:</label>
                    <input
                      type="time"
                      value={artisanHours[key].open}
                      onChange={(e) => updateDay(key, 'open', e.target.value)}
                      className="input-field w-32"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Close:</label>
                    <input
                      type="time"
                      value={artisanHours[key].close}
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
            {isSaving ? 'Saving...' : 'Save Artisan Hours'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeliveryTab({ artisanProfile, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState({
    pickup: artisanProfile?.deliveryOptions?.pickup ?? true,
    delivery: artisanProfile?.deliveryOptions?.delivery ?? false,
    deliveryRadius: artisanProfile?.deliveryOptions?.deliveryRadius || 10,
    deliveryFee: artisanProfile?.deliveryOptions?.deliveryFee || 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
              await profileService.updateBusinessDelivery(deliveryOptions);
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
      
      // Mark onboarding as completed when profile is saved
      try {
        const userProfile = await getProfile();
        const userId = userProfile._id;
        onboardingService.markOnboardingCompleted(userId);
      } catch (error) {
        console.error('Error marking onboarding completed:', error);
      }
      
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
    businessName: '',
    type: 'farm',
    category: 'fresh_produce',
    subcategory: '',
    description: '',
    specialties: [''],
    contactInfo: {
      phone: '',
      email: '',
      website: '',
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: ''
      }
    },
    photos: [],
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
              await profileService.createArtisanProfile(formData);
              toast.success('Artisan profile created successfully!');
      onProfileCreated();
    } catch (error) {
      console.error('Error creating business profile:', error);
      toast.error(error.response?.data?.message || 'Failed to create business profile');
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup Your Business Profile</h2>
              <p className="text-gray-600 mb-6">Tell customers about your business and what you offer.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
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
              <option value="">Select Business Type</option>
              <option value="farm">Farm</option>
              <option value="bakery">Bakery</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
              <option value="market">Market</option>
              <option value="butcher">Butcher Shop</option>
              <option value="dairy">Dairy</option>
              <option value="winery">Winery</option>
              <option value="brewery">Brewery</option>
              <option value="distillery">Distillery</option>
              <option value="food_truck">Food Truck</option>
              <option value="catering">Catering</option>
              <option value="grocery">Grocery Store</option>
              <option value="specialty_shop">Specialty Food Shop</option>
              <option value="fish_market">Fish Market</option>
              <option value="organic_store">Organic Store</option>
              <option value="coffee_roaster">Coffee Roaster</option>
              <option value="tea_house">Tea House</option>
              <option value="chocolate_maker">Chocolate Maker</option>
              <option value="cheese_maker">Cheese Maker</option>
              <option value="honey_producer">Honey Producer</option>
              <option value="maple_syrup">Maple Syrup Producer</option>
              <option value="mushroom_farm">Mushroom Farm</option>
              <option value="herb_garden">Herb Garden</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="orchard">Orchard</option>
              <option value="vineyard">Vineyard</option>
              <option value="microgreens">Microgreens Farm</option>
              <option value="aquaponics">Aquaponics Farm</option>
              <option value="hydroponics">Hydroponics Farm</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Category *
          </label>
          {formData.type && getSuggestedCategories(formData.type).length > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Suggested for {formatBusinessType(formData.type)}: {getSuggestedCategories(formData.type).join(', ')}
            </p>
          )}
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="input-field"
            required
          >
            <option value="">Select Primary Category</option>
            <option value="fresh_produce">Fresh Produce & Vegetables</option>
            <option value="fruits">Fruits & Berries</option>
            <option value="dairy">Dairy & Eggs</option>
            <option value="meat">Meat & Poultry</option>
            <option value="seafood">Seafood & Fish</option>
            <option value="bakery">Bread & Pastries</option>
            <option value="beverages">Beverages & Drinks</option>
            <option value="preserves">Preserves & Jams</option>
            <option value="herbs">Herbs & Spices</option>
            <option value="grains">Grains & Cereals</option>
            <option value="nuts">Nuts & Seeds</option>
            <option value="honey">Honey & Sweeteners</option>
            <option value="mushrooms">Mushrooms</option>
            <option value="microgreens">Microgreens & Sprouts</option>
            <option value="prepared_foods">Prepared Foods</option>
            <option value="specialty_items">Specialty Items</option>
            <option value="organic">Organic Products</option>
            <option value="artisan_products">Artisan Products</option>
            <option value="seasonal">Seasonal Products</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory
          </label>
          <select
            value={formData.subcategory || ''}
            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
            className="input-field"
          >
            <option value="">Select Subcategory (Optional)</option>
            {formData.category === 'fresh_produce' && (
              <>
                <option value="leafy_greens">Leafy Greens</option>
                <option value="root_vegetables">Root Vegetables</option>
                <option value="tomatoes">Tomatoes</option>
                <option value="peppers">Peppers</option>
                <option value="cucumbers">Cucumbers</option>
                <option value="squash">Squash</option>
                <option value="onions">Onions & Garlic</option>
                <option value="carrots">Carrots</option>
                <option value="potatoes">Potatoes</option>
              </>
            )}
            {formData.category === 'fruits' && (
              <>
                <option value="apples">Apples</option>
                <option value="berries">Berries</option>
                <option value="stone_fruits">Stone Fruits</option>
                <option value="citrus">Citrus</option>
                <option value="melons">Melons</option>
                <option value="grapes">Grapes</option>
                <option value="tropical">Tropical Fruits</option>
              </>
            )}
            {formData.category === 'dairy' && (
              <>
                <option value="milk">Milk</option>
                <option value="cheese">Cheese</option>
                <option value="yogurt">Yogurt</option>
                <option value="butter">Butter</option>
                <option value="eggs">Eggs</option>
                <option value="cream">Cream</option>
                <option value="ice_cream">Ice Cream</option>
              </>
            )}
            {formData.category === 'meat' && (
              <>
                <option value="beef">Beef</option>
                <option value="pork">Pork</option>
                <option value="chicken">Chicken</option>
                <option value="turkey">Turkey</option>
                <option value="lamb">Lamb</option>
                <option value="game_meat">Game Meat</option>
                <option value="processed_meat">Processed Meat</option>
              </>
            )}
            {formData.category === 'seafood' && (
              <>
                <option value="fresh_fish">Fresh Fish</option>
                <option value="shellfish">Shellfish</option>
                <option value="smoked_fish">Smoked Fish</option>
                <option value="canned_fish">Canned Fish</option>
              </>
            )}
            {formData.category === 'bakery' && (
              <>
                <option value="bread">Bread</option>
                <option value="pastries">Pastries</option>
                <option value="cakes">Cakes</option>
                <option value="cookies">Cookies</option>
                <option value="pies">Pies</option>
                <option value="sourdough">Sourdough</option>
                <option value="gluten_free">Gluten-Free</option>
              </>
            )}
            {formData.category === 'beverages' && (
              <>
                <option value="coffee">Coffee</option>
                <option value="tea">Tea</option>
                <option value="juice">Juice</option>
                <option value="wine">Wine</option>
                <option value="beer">Beer</option>
                <option value="spirits">Spirits</option>
                <option value="kombucha">Kombucha</option>
              </>
            )}
            {formData.category === 'preserves' && (
              <>
                <option value="jams">Jams</option>
                <option value="jellies">Jellies</option>
                <option value="pickles">Pickles</option>
                <option value="sauces">Sauces</option>
                <option value="syrups">Syrups</option>
                <option value="chutneys">Chutneys</option>
              </>
            )}
            {formData.category === 'herbs' && (
              <>
                <option value="fresh_herbs">Fresh Herbs</option>
                <option value="dried_herbs">Dried Herbs</option>
                <option value="spices">Spices</option>
                <option value="herb_plants">Herb Plants</option>
                <option value="medicinal_herbs">Medicinal Herbs</option>
              </>
            )}
            {formData.category === 'artisan_products' && (
              <>
                <option value="chocolate">Chocolate</option>
                <option value="cheese">Artisan Cheese</option>
                <option value="olive_oil">Olive Oil</option>
                <option value="vinegar">Vinegar</option>
                <option value="mustard">Mustard</option>
                <option value="hot_sauce">Hot Sauce</option>
                <option value="fermented">Fermented Products</option>
              </>
            )}
            {formData.category === 'seasonal' && (
              <>
                <option value="spring">Spring Products</option>
                <option value="summer">Summer Products</option>
                <option value="fall">Fall Products</option>
                <option value="winter">Winter Products</option>
                <option value="holiday">Holiday Specialties</option>
              </>
            )}
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

        {/* Business Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Photos
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors">
                  {formData.photos[index] ? (
                    <div className="relative">
                      <img
                        src={formData.photos[index]}
                        alt={`Business photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPhotos = [...formData.photos];
                          newPhotos.splice(index, 1);
                          setFormData({ ...formData, photos: newPhotos });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CameraIcon className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-500">
                        {index === 0 ? 'Primary Photo' : `Photo ${index + 1}`}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            // Compress image before converting to base64
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            
                            img.onload = () => {
                              // Set canvas size (max 800px width/height to reduce file size)
                              const maxSize = 800;
                              let { width, height } = img;
                              
                              if (width > height) {
                                if (width > maxSize) {
                                  height = (height * maxSize) / width;
                                  width = maxSize;
                                }
                              } else {
                                if (height > maxSize) {
                                  width = (width * maxSize) / height;
                                  height = maxSize;
                                }
                              }
                              
                              canvas.width = width;
                              canvas.height = height;
                              
                              // Draw and compress image
                              ctx.drawImage(img, 0, 0, width, height);
                              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
                              
                              const newPhotos = [...formData.photos];
                              newPhotos[index] = compressedDataUrl;
                              setFormData({ ...formData, photos: newPhotos });
                            };
                            
                            img.src = URL.createObjectURL(file);
                          }
                        }}
                        className="hidden"
                        id={`photo-${index}`}
                      />
                      <label
                        htmlFor={`photo-${index}`}
                        className="cursor-pointer text-orange-600 hover:text-orange-700 text-sm font-medium"
                      >
                        Upload Photo
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Upload photos of your business, products, or facilities. The first photo will be your primary image.
          </p>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.contactInfo.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: e.target.value }
                })}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, email: e.target.value }
                })}
                className="input-field"
                placeholder="business@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                value={formData.contactInfo.website}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, website: e.target.value }
                })}
                className="input-field"
                placeholder="https://yourbusiness.com"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Social Media (Optional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook
              </label>
              <input
                type="url"
                value={formData.contactInfo.socialMedia.facebook}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: {
                    ...formData.contactInfo,
                    socialMedia: { ...formData.contactInfo.socialMedia, facebook: e.target.value }
                  }
                })}
                className="input-field"
                placeholder="https://facebook.com/yourbusiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram
              </label>
              <input
                type="url"
                value={formData.contactInfo.socialMedia.instagram}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: {
                    ...formData.contactInfo,
                    socialMedia: { ...formData.contactInfo.socialMedia, instagram: e.target.value }
                  }
                })}
                className="input-field"
                placeholder="https://instagram.com/yourbusiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter/X
              </label>
              <input
                type="url"
                value={formData.contactInfo.socialMedia.twitter}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: {
                    ...formData.contactInfo,
                    socialMedia: { ...formData.contactInfo.socialMedia, twitter: e.target.value }
                  }
                })}
                className="input-field"
                placeholder="https://twitter.com/yourbusiness"
              />
            </div>
          </div>
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
                            {isSaving ? 'Creating Profile...' : 'Create Business Profile'}
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
