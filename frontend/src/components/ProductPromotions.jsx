import React, { useState, useEffect } from 'react';
import { 
  StarIcon, 
  SparklesIcon, 
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { revenueService } from '../services/revenueService';
import toast from 'react-hot-toast';

export default function ProductPromotions({ product, onPromotionUpdate }) {
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [activePromotions, setActivePromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(7); // Default duration for sponsored products

  useEffect(() => {
    loadPromotionalData();
  }, [product]);

  const loadPromotionalData = async () => {
    try {
      setIsLoading(true);
      const [features, userFeatures] = await Promise.all([
        revenueService.getAvailablePromotionalFeatures(),
        revenueService.getArtisanPromotionalFeatures()
      ]);
      
      setAvailableFeatures(features);
      
      // Filter promotions for this specific product
      const productPromotions = userFeatures.filter(
        feature => feature.productId === product._id
      );
      setActivePromotions(productPromotions);
    } catch (error) {
      console.error('Error loading promotional data:', error);
      toast.error('Failed to load promotional features');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseFeature = async (feature) => {
    try {
      setSelectedFeature(feature);
      setShowPurchaseModal(true);
    } catch (error) {
      console.error('Error preparing feature purchase:', error);
      toast.error('Failed to prepare feature purchase');
    }
  };

  const confirmPurchase = async () => {
    try {
      const purchaseData = {
        ...selectedFeature,
        productId: product._id
      };

      // Add duration for all promotional features
      purchaseData.durationDays = selectedDuration;

      await revenueService.purchasePromotionalFeature(purchaseData);
      
      toast.success(`${selectedFeature.name} purchased successfully!`);
      setShowPurchaseModal(false);
      setSelectedFeature(null);
      setSelectedDuration(7); // Reset to default
      loadPromotionalData();
      if (onPromotionUpdate) {
        onPromotionUpdate();
      }
    } catch (error) {
      console.error('Error purchasing feature:', error);
      toast.error('Failed to purchase promotional feature');
    }
  };

  const getFeatureIcon = (featureType) => {
    switch (featureType) {
      case 'product_featured':
        return <StarIcon className="h-6 w-6 text-amber-500" />;
      case 'product_sponsored':
        return <SparklesIcon className="h-6 w-6 text-purple-500" />;
      default:
        return <StarIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getFeatureDisplayName = (featureType) => {
    switch (featureType) {
      case 'product_featured':
        return 'Premium Showcase';
      case 'product_sponsored':
        return 'Artisan Spotlight';
      default:
        return featureType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getFeatureDescription = (featureType) => {
    switch (featureType) {
      case 'product_featured':
        return 'Your product will be prominently featured on the homepage and search results, giving it maximum visibility to potential customers.';
      case 'product_sponsored':
        return 'Your product will be highlighted in search results with special placement to increase discoverability.';
      default:
        return 'Boost your product visibility and increase sales.';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'approved':
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

  const isFeatureActive = (featureType) => {
    return activePromotions.some(
      promo => promo.featureType === featureType && 
      promo.status === 'active' && 
      new Date(promo.endDate) > new Date()
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Prominent Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-100 to-purple-100 rounded-full mb-4">
          <FireIcon className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Boost Your Product Visibility</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Make your product stand out and reach more customers with our premium promotional features
        </p>
      </div>

      {/* Active Promotions - More Prominent */}
      {activePromotions.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
            Active Promotions
          </h3>
          <div className="space-y-4">
            {activePromotions.map((promotion) => (
              <div key={promotion._id} className="bg-white border-2 border-green-300 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getFeatureIcon(promotion.featureType)}
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">
                        {getFeatureDisplayName(promotion.featureType)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ${promotion.price} • {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(promotion.status)}`}>
                      {promotion.status.replace(/_/g, ' ')}
                    </span>
                    {promotion.status === 'active' && (
                      <div className="flex items-center text-sm text-green-600 font-medium">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {Math.ceil((new Date(promotion.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days left
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Features - Enhanced Visibility */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Choose Your Promotion</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {availableFeatures.map((feature) => {
            const isActive = isFeatureActive(feature.type);
            
            return (
              <div key={feature.type} className={`border-2 rounded-xl p-6 transition-all transform hover:scale-105 ${
                isActive 
                  ? 'border-green-300 bg-green-50 shadow-lg' 
                  : 'border-gray-200 hover:border-amber-300 hover:shadow-xl bg-white'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getFeatureIcon(feature.type)}
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{getFeatureDisplayName(feature.type)}</h4>
                      <p className="text-sm text-gray-500">{feature.duration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-600">${feature.pricePerDay}/day</div>
                    <div className="text-xs text-gray-500">
                      {feature.type === 'product_featured' ? '$25 for 7 days' : `$${feature.pricePerDay * 7} for 7 days`}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4 leading-relaxed">{getFeatureDescription(feature.type)}</p>
                
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">What you'll get:</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isActive ? (
                  <div className="flex items-center justify-center text-green-600 text-sm font-medium bg-green-100 py-3 px-4 rounded-lg">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Active Promotion
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchaseFeature(feature)}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 px-6 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center">
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Boost Visibility Now
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              {getFeatureIcon(selectedFeature.type)}
              <h3 className="text-xl font-bold text-gray-900 mt-3">
                Purchase {getFeatureDisplayName(selectedFeature.type)}
              </h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Product:</span>
                <span className="font-bold">{product.name}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Feature:</span>
                <span className="font-bold">{getFeatureDisplayName(selectedFeature.type)}</span>
              </div>
              
              {/* Duration Selection for Sponsored Products */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Duration:
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {selectedFeature.type === 'product_featured' ? (
                    <>
                      <option value={1}>1 day - $5</option>
                      <option value={3}>3 days - $15</option>
                      <option value={7}>7 days - $25</option>
                      <option value={14}>14 days - $70</option>
                      <option value={30}>30 days - $150</option>
                    </>
                  ) : (
                    <>
                      <option value={1}>1 day - $10</option>
                      <option value={3}>3 days - $30</option>
                      <option value={7}>7 days - $70</option>
                      <option value={14}>14 days - $140</option>
                      <option value={30}>30 days - $300</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedFeature.type === 'product_featured' 
                    ? '$5 per day for featured products' 
                    : '$10 per day for sponsored products'}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Duration:</span>
                <span className="font-bold">
                  {selectedFeature.type === 'product_sponsored' 
                    ? `${selectedDuration} days` 
                    : selectedFeature.duration}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <span className="text-gray-700 font-bold">Total Price:</span>
                <span className="text-2xl font-bold text-amber-600">
                  ${selectedFeature.type === 'product_sponsored' 
                    ? selectedDuration * selectedFeature.pricePerDay 
                    : selectedDuration * selectedFeature.pricePerDay}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-colors font-bold"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
