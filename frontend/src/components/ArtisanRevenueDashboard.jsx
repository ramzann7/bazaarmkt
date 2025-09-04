import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  EyeIcon,
  ShoppingCartIcon,
  StarIcon,
  CalendarIcon,
  InformationCircleIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { revenueService } from '../services/revenueService';
import { promotionalService } from '../services/promotionalService';
import toast from 'react-hot-toast';

export default function ArtisanRevenueDashboard() {
  const [revenueData, setRevenueData] = useState(null);
  const [promotionalFeatures, setPromotionalFeatures] = useState([]);
  const [userFeatures, setUserFeatures] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [showTransparency, setShowTransparency] = useState(false);

  useEffect(() => {
    loadRevenueData();
    loadPromotionalFeatures();
    loadUserFeatures();
  }, [selectedPeriod]);

  const loadRevenueData = async () => {
    try {
      setIsLoading(true);
      const data = await revenueService.getArtisanRevenueSummary(selectedPeriod);
      setRevenueData(data);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPromotionalFeatures = async () => {
    try {
      const features = await revenueService.getAvailablePromotionalFeatures();
      setPromotionalFeatures(features);
    } catch (error) {
      console.error('Error loading promotional features:', error);
      toast.error('Failed to load promotional features');
    }
  };

  const loadUserFeatures = async () => {
    try {
      const features = await promotionalService.getCurrentUserPromotionalFeatures();
      setUserFeatures(features);
    } catch (error) {
      console.error('Error loading user features:', error);
      toast.error('Failed to load your promotional features');
    }
  };

  const handlePurchaseFeature = async (feature) => {
    try {
      await revenueService.purchasePromotionalFeature(feature);
      toast.success('Promotional feature purchase request submitted!');
      loadUserFeatures();
    } catch (error) {
      console.error('Error purchasing feature:', error);
      toast.error('Failed to purchase promotional feature');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending_approval':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Revenue</h1>
        <p className="text-gray-600 mt-2">Track your earnings and promotional features</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {['week', 'month', 'quarter', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Summary Cards */}
      {revenueData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gross Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${revenueData.revenue.totalGrossAmount?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Your Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${revenueData.revenue.totalEarnings?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Platform Commission</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${revenueData.revenue.totalCommission?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingCartIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueData.revenue.orderCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transparency Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Revenue Transparency</h2>
          <button
            onClick={() => setShowTransparency(!showTransparency)}
            className="flex items-center text-orange-600 hover:text-orange-700"
          >
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            {showTransparency ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">90%</div>
            <p className="text-sm text-gray-600">You Keep</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">10%</div>
            <p className="text-sm text-gray-600">Platform Commission</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">100%</div>
            <p className="text-sm text-gray-600">Transparent</p>
          </div>
        </div>

        {showTransparency && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• For every $100 sale, you receive $90 directly</li>
              <li>• $10 goes to platform maintenance and development</li>
              <li>• No hidden fees or surprise charges</li>
              <li>• Weekly payouts with $25 minimum</li>
            </ul>
          </div>
        )}
      </div>

      {/* Artisan-Specific Promotional Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Artisan Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Artisan Profile Features</h2>
          <p className="text-gray-600 mb-4">Enhance your artisan profile and business visibility</p>
          
          <div className="space-y-4">
            {promotionalFeatures.filter(feature => 
              feature.type !== 'product_featured' && feature.type !== 'product_sponsored'
            ).map((feature) => (
              <div key={feature.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                  <span className="text-lg font-bold text-orange-600">${feature.price}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {feature.duration}
                </div>
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Benefits:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handlePurchaseFeature(feature)}
                  className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  Purchase Feature
                </button>
              </div>
            ))}
          </div>
          
          {promotionalFeatures.filter(feature => 
            feature.type === 'product_featured' || feature.type === 'product_sponsored'
          ).length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Product Promotions</h3>
              <p className="text-sm text-blue-700 mb-3">
                To promote individual products, visit your <strong>My Products</strong> page and click the "Boost" button on any product.
              </p>
              <button
                onClick={() => window.location.href = '/products'}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Go to My Products →
              </button>
            </div>
          )}
        </div>

        {/* User's Active Artisan Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Artisan Profile Features</h2>
          
          {userFeatures.length === 0 ? (
            <div className="text-center py-8">
              <StarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No artisan profile features purchased yet</p>
              <p className="text-sm text-gray-500 mt-1">Purchase features to enhance your artisan profile</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userFeatures.map((feature) => (
                <div key={feature._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{feature.featureType.replace(/_/g, ' ')}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                      {feature.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">${feature.price}</p>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span className="flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {new Date(feature.startDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {new Date(feature.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  {feature.status === 'rejected' && feature.rejectionReason && (
                    <p className="text-xs text-red-600 mt-2">
                      Reason: {feature.rejectionReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">Product Promotions</h3>
            <p className="text-sm text-amber-700 mb-3">
              View and manage your product-specific promotions on the My Products page.
            </p>
            <button
              onClick={() => window.location.href = '/products'}
              className="text-amber-600 hover:text-amber-800 font-medium text-sm"
            >
              Manage Product Promotions →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
