import React, { useState, useEffect } from 'react';
import { 
  StarIcon, 
  SparklesIcon, 
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { promotionalService } from '../services/promotionalService';
import toast from 'react-hot-toast';

export default function BoostProduct({ product, onClose, onSuccess }) {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [durationDays, setDurationDays] = useState(7);
  const [customText, setCustomText] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [categoryBoost, setCategoryBoost] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    if (selectedFeature) {
      setPricing(promotionalService.getPromotionalPricing()[selectedFeature]);
    }
  }, [selectedFeature]);

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

  const handleFeatureSelect = (featureType) => {
    setSelectedFeature(featureType);
    // Reset duration for sponsored products to 7 days
    if (featureType === 'sponsored_product') {
      setDurationDays(7);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFeature) {
      toast.error('Please select a promotional feature');
      return;
    }

    if (!durationDays || durationDays < 1) {
      toast.error('Please enter a valid duration');
      return;
    }

    setIsSubmitting(true);

    try {
      const featureData = {
        productId: product._id,
        featureType: selectedFeature,
        durationDays: parseInt(durationDays),
        customText: customText.trim() || undefined,
        searchKeywords: selectedFeature === 'sponsored_product' ? searchKeywords.split(',').map(k => k.trim()).filter(k => k) : [],
        categoryBoost: selectedFeature === 'sponsored_product' ? categoryBoost : []
      };

      const result = await promotionalService.createPromotionalFeature(featureData);
      
      toast.success('Promotional feature request submitted successfully! Awaiting admin approval.');
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to submit promotional feature request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCost = () => {
    if (!selectedFeature) return 0;
    return promotionalService.calculatePromotionCost(selectedFeature, durationDays);
  };

  const getFeatureIcon = (featureType) => {
    switch (featureType) {
      case 'featured_product':
        return <StarIcon className="w-8 h-8 text-amber-500" />;
      case 'sponsored_product':
        return <SparklesIcon className="w-8 h-8 text-purple-500" />;
      default:
        return <SparklesIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const getFeatureColor = (featureType) => {
    switch (featureType) {
      case 'featured_product':
        return 'border-amber-200 bg-amber-50';
      case 'sponsored_product':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Boost Your Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Choose a promotional feature to increase your product's visibility
          </p>
        </div>

        {/* Product Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {product.image && (
              <img
                src={getImageUrl(product.image)}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            )}
            <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-lg" style={{ display: product.image ? 'none' : 'flex' }}>
              <span className="text-lg">📦</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-600">{product.category}</p>
              <p className="text-sm text-gray-600">${product.price}</p>
            </div>
          </div>
        </div>

        {/* Feature Selection */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Promotional Feature</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Featured Product Option */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedFeature === 'featured_product'
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200 hover:border-amber-200'
              }`}
              onClick={() => handleFeatureSelect('featured_product')}
            >
              <div className="flex items-center space-x-3 mb-3">
                <StarIcon className="w-6 h-6 text-amber-500" />
                <h4 className="font-semibold text-gray-900">Featured Product</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Showcase your product on the homepage with distance-based ranking
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-amber-600">$25</span>
                <span className="text-sm text-gray-500">One-time</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center text-xs text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Homepage visibility
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Distance-based ranking
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Priority placement
                </div>
              </div>
            </div>

            {/* Sponsored Product Option */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedFeature === 'sponsored_product'
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-200'
              }`}
              onClick={() => handleFeatureSelect('sponsored_product')}
            >
              <div className="flex items-center space-x-3 mb-3">
                <SparklesIcon className="w-6 h-6 text-purple-500" />
                <h4 className="font-semibold text-gray-900">Sponsored Product</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Boost search visibility with enhanced ranking and targeting
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-purple-600">$40</span>
                <span className="text-sm text-gray-500">7 days</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center text-xs text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Search result boost
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Keyword targeting
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Proximity boost
                </div>
              </div>
            </div>
          </div>

          {/* Feature Details */}
          {selectedFeature && (
            <div className={`border rounded-lg p-4 ${getFeatureColor(selectedFeature)}`}>
              <div className="flex items-center space-x-3 mb-4">
                {getFeatureIcon(selectedFeature)}
                <div>
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {selectedFeature.replace('_', ' ')}
                  </h4>
                  <p className="text-sm text-gray-600">{pricing?.description}</p>
                </div>
              </div>

              {/* Duration Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (days)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
                {selectedFeature === 'sponsored_product' && durationDays > 7 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Additional days: ${(durationDays - 7) * 5}
                  </p>
                )}
              </div>

              {/* Custom Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Text (optional)
                </label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Add custom text for your promotion..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                />
              </div>

              {/* Sponsored Product Specific Fields */}
              {selectedFeature === 'sponsored_product' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={searchKeywords}
                      onChange={(e) => setSearchKeywords(e.target.value)}
                      placeholder="bread, fresh, organic, local..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Keywords that will boost your product in search results
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Boost
                    </label>
                    <select
                      value={categoryBoost}
                      onChange={(e) => setCategoryBoost([e.target.value])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="bakery">Bakery</option>
                      <option value="dairy">Dairy</option>
                      <option value="produce">Produce</option>
                      <option value="meat">Meat</option>
                      <option value="beverages">Beverages</option>
                      <option value="snacks">Snacks</option>
                    </select>
                  </div>
                </>
              )}

              {/* Cost Summary */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${calculateCost()}
                  </span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Duration: {durationDays} days
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  * Admin approval required before activation
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedFeature || isSubmitting}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedFeature && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
