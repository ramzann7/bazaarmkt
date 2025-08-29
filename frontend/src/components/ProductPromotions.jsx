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
  ClockIcon
} from '@heroicons/react/24/outline';
import { revenueService } from '../services/revenueService';
import toast from 'react-hot-toast';

export default function ProductPromotions({ product, onPromotionUpdate }) {
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [activePromotions, setActivePromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

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
      await revenueService.purchasePromotionalFeature({
        ...selectedFeature,
        productId: product._id
      });
      
      toast.success(`${selectedFeature.name} purchased successfully!`);
      setShowPurchaseModal(false);
      setSelectedFeature(null);
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
        return <StarIcon className="h-5 w-5 text-yellow-500" />;
      case 'product_sponsored':
        return <SparklesIcon className="h-5 w-5 text-purple-500" />;
      case 'search_boost':
        return <MagnifyingGlassIcon className="h-5 w-5 text-blue-500" />;
      case 'artisan_spotlight':
        return <UserGroupIcon className="h-5 w-5 text-green-500" />;
      default:
        return <StarIcon className="h-5 w-5 text-gray-500" />;
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
    <div className="space-y-6">
      {/* Active Promotions */}
      {activePromotions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
            Active Promotions
          </h3>
          <div className="space-y-3">
            {activePromotions.map((promotion) => (
              <div key={promotion._id} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFeatureIcon(promotion.featureType)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {promotion.featureType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ${promotion.price} • {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promotion.status)}`}>
                      {promotion.status.replace(/_/g, ' ')}
                    </span>
                    {promotion.status === 'active' && (
                      <div className="flex items-center text-xs text-green-600">
                        <ClockIcon className="h-3 w-3 mr-1" />
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

      {/* Available Features */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Promote This Product</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableFeatures.map((feature) => {
            const isActive = isFeatureActive(feature.type);
            
            return (
              <div key={feature.type} className={`border rounded-lg p-4 transition-all ${
                isActive 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getFeatureIcon(feature.type)}
                    <h4 className="font-medium text-gray-900">{feature.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">${feature.price}</div>
                    <div className="text-xs text-gray-500">{feature.duration}</div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                
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

                {isActive ? (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Active Promotion
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchaseFeature(feature)}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Purchase Feature
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Purchase {selectedFeature.name}
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Product:</span>
                <span className="font-medium">{product.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Feature:</span>
                <span className="font-medium">{selectedFeature.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{selectedFeature.duration}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="text-lg font-bold text-purple-600">${selectedFeature.price}</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
