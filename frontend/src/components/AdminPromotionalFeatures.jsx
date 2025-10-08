import React, { useState, useEffect } from 'react';
import { 
  StarIcon, 
  SparklesIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { promotionalService } from '../services/promotionalService';
import toast from 'react-hot-toast';

export default function AdminPromotionalFeatures() {
  const [pendingFeatures, setPendingFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPendingFeatures();
  }, []);

  const loadPendingFeatures = async () => {
    try {
      setIsLoading(true);
      const features = await promotionalService.getPendingPromotionalFeatures();
      setPendingFeatures(features);
    } catch (error) {
      toast.error('Failed to load pending features');
      console.error('Error loading pending features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (featureId) => {
    try {
      setIsProcessing(true);
      await promotionalService.approvePromotionalFeature(featureId, 'approve');
      toast.success('Promotional feature approved successfully');
      loadPendingFeatures(); // Refresh the list
    } catch (error) {
      toast.error('Failed to approve feature');
      console.error('Error approving feature:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (featureId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setIsProcessing(true);
      await promotionalService.approvePromotionalFeature(featureId, 'reject', rejectionReason);
      toast.success('Promotional feature rejected successfully');
      setRejectionReason('');
      setShowDetails(false);
      setSelectedFeature(null);
      loadPendingFeatures(); // Refresh the list
    } catch (error) {
      toast.error('Failed to reject feature');
      console.error('Error rejecting feature:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFeatureIcon = (featureType) => {
    switch (featureType) {
      case 'featured_product':
        return <StarIcon className="w-6 h-6 text-primary-500" />;
      case 'sponsored_product':
        return <SparklesIcon className="w-6 h-6 text-purple-500" />;
      default:
        return <SparklesIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getFeatureColor = (featureType) => {
    switch (featureType) {
      case 'featured_product':
        return 'border-primary-200 bg-primary-50';
      case 'sponsored_product':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
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

  const calculateCost = (feature) => {
    if (feature.featureType === 'featured_product') {
      return 25;
    } else if (feature.featureType === 'sponsored_product') {
      const baseCost = 40;
      const additionalDays = Math.max(0, feature.durationDays - 7);
      const additionalCost = additionalDays * 5;
      return baseCost + additionalCost;
    }
    return 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Promotional Features Management</h2>
        <p className="text-gray-600">
          Review and approve promotional feature requests from artisans
        </p>
        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <StarIcon className="w-4 h-4 text-primary-500" />
            <span>Featured Product: $25</span>
          </div>
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-4 h-4 text-purple-500" />
            <span>Sponsored Product: $40/7 days</span>
          </div>
        </div>
      </div>

      {/* Pending Features List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Approvals ({pendingFeatures.length})
          </h3>
        </div>

        {pendingFeatures.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No pending promotional features to review</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingFeatures.map((feature) => (
              <div key={feature._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${getFeatureColor(feature.featureType)}`}>
                      {getFeatureIcon(feature.featureType)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {feature.featureType.replace('_', ' ')}
                        </h4>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Pending Approval
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Artisan:</span>
                          <p>{feature.artisanId?.artisanName || `${feature.artisanId?.firstName} ${feature.artisanId?.lastName}`}</p>
                          <p className="text-xs text-gray-500">{feature.artisanId?.businessType}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium">Product:</span>
                          <p>{feature.productId?.name}</p>
                          <p className="text-xs text-gray-500">{feature.productId?.category}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium">Details:</span>
                          <p>Duration: {feature.durationDays} days</p>
                          <p className="text-xs text-gray-500">Created: {formatDate(feature.createdAt)}</p>
                        </div>
                      </div>
                      
                      {feature.specifications?.customText && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-sm">Custom Text:</span>
                          <p className="text-sm text-gray-600 mt-1">{feature.specifications.customText}</p>
                        </div>
                      )}
                      
                      {feature.featureType === 'sponsored_product' && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Search Keywords:</span>
                              <p className="text-gray-600">
                                {feature.specifications?.searchKeywords?.length > 0 
                                  ? feature.specifications.searchKeywords.join(', ')
                                  : 'None specified'
                                }
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Category Boost:</span>
                              <p className="text-gray-600">
                                {feature.specifications?.categoryBoost?.length > 0
                                  ? feature.specifications.categoryBoost.join(', ')
                                  : 'None specified'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${calculateCost(feature)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {feature.durationDays} days
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          setSelectedFeature(feature);
                          setShowDetails(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleApprove(feature._id)}
                        disabled={isProcessing}
                        className="p-2 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedFeature(feature);
                          setShowDetails(true);
                        }}
                        disabled={isProcessing}
                        className="p-2 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Details Modal */}
      {showDetails && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Feature Details</h3>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedFeature(null);
                    setRejectionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Artisan Information</h4>
                  <p className="text-sm text-gray-600">
                    {selectedFeature.artisanId?.artisanName || `${selectedFeature.artisanId?.firstName} ${selectedFeature.artisanId?.lastName}`}
                  </p>
                  <p className="text-xs text-gray-500">{selectedFeature.artisanId?.businessType}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Product Information</h4>
                  <p className="text-sm text-gray-600">{selectedFeature.productId?.name}</p>
                  <p className="text-xs text-gray-500">{selectedFeature.productId?.category} - ${selectedFeature.productId?.price}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Promotional Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span>
                      <p className="text-gray-600 capitalize">{selectedFeature.featureType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-gray-600">{selectedFeature.durationDays} days</p>
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span>
                      <p className="text-gray-600">${calculateCost(selectedFeature)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p className="text-gray-600">{formatDate(selectedFeature.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                {selectedFeature.specifications?.customText && (
                  <div>
                    <h4 className="font-medium text-gray-900">Custom Text</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedFeature.specifications.customText}
                    </p>
                  </div>
                )}
                
                {selectedFeature.featureType === 'sponsored_product' && (
                  <div>
                    <h4 className="font-medium text-gray-900">Sponsored Product Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Search Keywords:</span>
                        <p className="text-gray-600">
                          {selectedFeature.specifications?.searchKeywords?.length > 0 
                            ? selectedFeature.specifications.searchKeywords.join(', ')
                            : 'None specified'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Category Boost:</span>
                        <p className="text-gray-600">
                          {selectedFeature.specifications?.categoryBoost?.length > 0
                            ? selectedFeature.specifications.categoryBoost.join(', ')
                            : 'None specified'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Rejection Reason Input */}
                <div>
                  <h4 className="font-medium text-gray-900">Rejection Reason (if rejecting)</h4>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedFeature(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleApprove(selectedFeature._id)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Approve'}
                  </button>
                  
                  <button
                    onClick={() => handleReject(selectedFeature._id)}
                    disabled={isProcessing || !rejectionReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
