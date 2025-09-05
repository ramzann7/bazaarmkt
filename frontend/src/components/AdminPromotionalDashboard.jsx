import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  SparklesIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authservice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';

export default function AdminPromotionalDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Promotional data states
  const [promotionalStats, setPromotionalStats] = useState(null);
  const [activePromotions, setActivePromotions] = useState([]);
  const [pricingConfig, setPricingConfig] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Modal states
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (currentUser && authChecked) {
      loadPromotionalData();
    }
  }, [currentUser, selectedPeriod, authChecked]);

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

      setCurrentUser(profile);
      setAuthChecked(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Authentication error');
      navigate('/login');
    }
  };

  const loadPromotionalData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [stats, promotions, pricing] = await Promise.all([
        adminService.getPromotionalStats(selectedPeriod),
        adminService.getActivePromotions(),
        adminService.getPromotionalPricing()
      ]);
      
      setPromotionalStats(stats);
      setActivePromotions(promotions);
      
      // If no pricing config exists, show default values
      if (pricing.length === 0) {
        setPricingConfig([
          {
            featureType: 'featured_product',
            name: 'Featured Product',
            description: 'Highlight your product on the homepage and at the top of search results',
            basePrice: 5,
            pricePerDay: 5,
            benefits: ['Featured placement on homepage', 'Higher search ranking', 'Featured badge on product']
          },
          {
            featureType: 'sponsored_product',
            name: 'Sponsored Product',
            description: 'Promote your product with sponsored placement in search results and category pages',
            basePrice: 10,
            pricePerDay: 10,
            benefits: ['Sponsored placement in search results', 'Enhanced visibility in product category']
          },
          {
            featureType: 'artisan_spotlight',
            name: 'Artisan Spotlight',
            description: 'Feature your artisan profile prominently on the platform',
            basePrice: 25,
            pricePerDay: 25,
            benefits: ['Featured artisan profile', 'Priority placement in artisan listings']
          }
        ]);
      } else {
        setPricingConfig(pricing);
      }
    } catch (error) {
      console.error('Error loading promotional data:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in as an admin.');
        toast.error('Please log in as an admin to access promotional dashboard');
        navigate('/login');
        return;
      }
      
      setError('Failed to load promotional data');
      toast.error('Failed to load promotional data');
      
      // Set default data for offline/error state
      setPromotionalStats({
        totalRevenue: 0,
        totalPromotions: 0,
        activePromotions: 0,
        activeArtisans: 0,
        averageRevenuePerDay: 0
      });
      setActivePromotions([]);
      setPricingConfig([
        {
          featureType: 'featured_product',
          name: 'Featured Product',
          description: 'Highlight your product on the homepage and at the top of search results',
          basePrice: 5,
          pricePerDay: 5,
          benefits: ['Featured placement on homepage', 'Higher search ranking', 'Featured badge on product']
        },
        {
          featureType: 'sponsored_product',
          name: 'Sponsored Product',
          description: 'Promote your product with sponsored placement in search results and category pages',
          basePrice: 10,
          pricePerDay: 10,
          benefits: ['Sponsored placement in search results', 'Enhanced visibility in product category']
        },
        {
          featureType: 'artisan_spotlight',
          name: 'Artisan Spotlight',
          description: 'Feature your artisan profile prominently on the platform',
          basePrice: 25,
          pricePerDay: 25,
          benefits: ['Featured artisan profile', 'Priority placement in artisan listings']
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePricingUpdate = async (pricingData) => {
    try {
      setIsSaving(true);
      await adminService.updatePromotionalPricing(pricingData);
      toast.success('Pricing updated successfully');
      setShowPricingModal(false);
      setEditingPricing(null);
      loadPromotionalData(); // Reload data
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast.error('Failed to update pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const initializeDefaultPricing = async () => {
    try {
      setIsSaving(true);
      await adminService.initializeDefaultPricing();
      toast.success('Default pricing initialized successfully');
      loadPromotionalData(); // Reload data
    } catch (error) {
      console.error('Error initializing default pricing:', error);
      toast.error('Failed to initialize default pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFeatureTypeLabel = (type) => {
    const labels = {
      'featured_product': 'Featured Product',
      'sponsored_product': 'Sponsored Product',
      'artisan_spotlight': 'Artisan Spotlight',
      'category_promotion': 'Category Promotion',
      'search_boost': 'Search Boost',
      'homepage_featured': 'Homepage Featured'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'expired': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading promotional dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Promotional Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage promotional features, pricing, and track performance
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-6">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>

        {/* Stats Overview */}
        {promotionalStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(promotionalStats.totalRevenue || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SparklesIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Promotions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {promotionalStats.activePromotions || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Artisans</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {promotionalStats.activeArtisans || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg. Revenue/Day</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(promotionalStats.averageRevenuePerDay || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pricing Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Pricing Configuration</h2>
                <div className="flex space-x-2">
                  {pricingConfig.length === 0 && (
                    <button
                      onClick={initializeDefaultPricing}
                      disabled={isSaving}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Initializing...' : 'Initialize Default Pricing'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Feature
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {pricingConfig.map((pricing) => (
                  <div key={pricing.featureType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {pricing.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {pricing.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          Base: {formatCurrency(pricing.basePrice)}
                        </span>
                        <span className="text-sm text-gray-600">
                          Per Day: {formatCurrency(pricing.pricePerDay)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPricing(pricing);
                        setShowPricingModal(true);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Promotions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Active Promotions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activePromotions.slice(0, 5).map((promotion) => (
                  <div key={promotion._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {promotion.artisan?.name || 'Unknown Artisan'}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(promotion.status)}`}>
                          {promotion.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {getFeatureTypeLabel(promotion.featureType)}
                      </p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Price: {formatCurrency(promotion.price)}</span>
                        <span>Ends: {formatDate(promotion.endDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activePromotions.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No active promotions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal
          pricing={editingPricing}
          onSave={handlePricingUpdate}
          onClose={() => {
            setShowPricingModal(false);
            setEditingPricing(null);
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// Pricing Modal Component
function PricingModal({ pricing, onSave, onClose, isSaving }) {
  const [formData, setFormData] = useState({
    featureType: pricing?.featureType || '',
    name: pricing?.name || '',
    description: pricing?.description || '',
    basePrice: pricing?.basePrice || 0,
    pricePerDay: pricing?.pricePerDay || 0,
    benefits: pricing?.benefits || []
  });

  const [newBenefit, setNewBenefit] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {pricing ? 'Edit Pricing' : 'Add Promotional Feature'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Feature Type</label>
              <select
                value={formData.featureType}
                onChange={(e) => setFormData(prev => ({ ...prev, featureType: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select feature type</option>
                <option value="featured_product">Featured Product</option>
                <option value="sponsored_product">Sponsored Product</option>
                <option value="artisan_spotlight">Artisan Spotlight</option>
                <option value="category_promotion">Category Promotion</option>
                <option value="search_boost">Search Boost</option>
                <option value="homepage_featured">Homepage Featured</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Base Price ($)</label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price Per Day ($)</label>
                <input
                  type="number"
                  value={formData.pricePerDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricePerDay: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Benefits</label>
              <div className="mt-1 space-y-2">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 flex-1">{benefit}</span>
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Add benefit"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
