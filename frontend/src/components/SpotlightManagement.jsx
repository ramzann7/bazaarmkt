import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { spotlightService } from '../services/spotlightService';
import toast from 'react-hot-toast';

export default function SpotlightManagement() {
  const [spotlightStatus, setSpotlightStatus] = useState(null);
  const [spotlightHistory, setSpotlightHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  useEffect(() => {
    loadSpotlightData();
  }, []);

  const loadSpotlightData = async () => {
    try {
      setIsLoading(true);
      const [statusResponse, historyResponse] = await Promise.all([
        spotlightService.getSpotlightStatus(),
        spotlightService.getSpotlightHistory()
      ]);
      
      setSpotlightStatus(statusResponse);
      setSpotlightHistory(historyResponse.spotlights || []);
    } catch (error) {
      console.error('Error loading spotlight data:', error);
      toast.error('Failed to load spotlight information');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseSpotlight = async () => {
    try {
      setIsPurchasing(true);
      const response = await spotlightService.purchaseSpotlight(selectedDays);
      toast.success('Spotlight subscription activated successfully!');
      setShowPurchaseModal(false);
      loadSpotlightData();
    } catch (error) {
      console.error('Error purchasing spotlight:', error);
      
      // Handle insufficient funds error
      if (error.response?.data?.error === 'INSUFFICIENT_FUNDS') {
        const errorData = error.response.data;
        const shortfall = errorData.shortfall;
        const currentBalance = errorData.currentBalance;
        const requiredAmount = errorData.requiredAmount;
        
        toast.error(
          `Insufficient wallet balance! You need ${formatCurrency(requiredAmount)} but only have ${formatCurrency(currentBalance)}. Please top up your wallet.`,
          { duration: 6000 }
        );
        
        // Show wallet top-up prompt
        if (window.confirm(
          `You need ${formatCurrency(shortfall)} more to purchase this spotlight subscription.\n\nWould you like to top up your wallet now?`
        )) {
          // Navigate to wallet top-up or show top-up modal
          // For now, we'll just show a message
          toast.info('Wallet top-up feature coming soon! Please add funds to your wallet first.');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to purchase spotlight');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleExtendSpotlight = async () => {
    try {
      setIsExtending(true);
      const response = await spotlightService.extendSpotlight(selectedDays);
      toast.success('Spotlight subscription extended successfully!');
      setShowExtendModal(false);
      loadSpotlightData();
    } catch (error) {
      console.error('Error extending spotlight:', error);
      
      // Handle insufficient funds error
      if (error.response?.data?.error === 'INSUFFICIENT_FUNDS') {
        const errorData = error.response.data;
        const shortfall = errorData.shortfall;
        const currentBalance = errorData.currentBalance;
        const requiredAmount = errorData.requiredAmount;
        
        toast.error(
          `Insufficient wallet balance! You need ${formatCurrency(requiredAmount)} but only have ${formatCurrency(currentBalance)}. Please top up your wallet.`,
          { duration: 6000 }
        );
        
        // Show wallet top-up prompt
        if (window.confirm(
          `You need ${formatCurrency(shortfall)} more to extend this spotlight subscription.\n\nWould you like to top up your wallet now?`
        )) {
          // Navigate to wallet top-up or show top-up modal
          // For now, we'll just show a message
          toast.info('Wallet top-up feature coming soon! Please add funds to your wallet first.');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to extend spotlight');
      }
    } finally {
      setIsExtending(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'expired':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-amber-500" />
            Spotlight Status
          </h3>
          {spotlightStatus?.hasSpotlight && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border border-amber-200">
              <SparklesIcon className="w-4 h-4 mr-1" />
              Active
            </span>
          )}
        </div>

        {spotlightStatus?.hasSpotlight ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Start Date</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(spotlightStatus.spotlight.startDate)}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <ClockIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">End Date</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(spotlightStatus.spotlight.endDate)}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Remaining Days</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {spotlightStatus.spotlight.remainingDays} days
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(true)}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center"
              >
                <CalendarDaysIcon className="w-4 h-4 mr-2" />
                Extend Spotlight
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <SparklesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Active Spotlight</h4>
            <p className="text-gray-600 mb-6">
              Get featured at the top of search results and increase your visibility to potential customers.
            </p>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors flex items-center mx-auto"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Purchase Spotlight
            </button>
          </div>
        )}
      </div>

      {/* Pricing Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spotlight Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">1 Day</h4>
            <p className="text-2xl font-bold text-amber-600 mb-2">$10</p>
            <p className="text-sm text-gray-600">Perfect for special events</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">7 Days</h4>
            <p className="text-2xl font-bold text-amber-600 mb-2">$70</p>
            <p className="text-sm text-gray-600">Great for weekly promotions</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">30 Days</h4>
            <p className="text-2xl font-bold text-amber-600 mb-2">$300</p>
            <p className="text-sm text-gray-600">Best value for long-term visibility</p>
          </div>
        </div>
      </div>

      {/* History */}
      {spotlightHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spotlight History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spotlightHistory.map((spotlight) => (
                  <tr key={spotlight.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(spotlight.startDate)} - {formatDate(spotlight.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(spotlight.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(spotlight.status)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {spotlight.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(spotlight.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Spotlight</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Days
              </label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value={1}>1 Day - $10</option>
                <option value={7}>7 Days - $70</option>
                <option value={14}>14 Days - $140</option>
                <option value={30}>30 Days - $300</option>
              </select>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Total: <span className="font-semibold">{formatCurrency(selectedDays * 10)}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchaseSpotlight}
                disabled={isPurchasing}
                className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isPurchasing ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Extend Spotlight</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Days
              </label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value={1}>1 Day - $10</option>
                <option value={7}>7 Days - $70</option>
                <option value={14}>14 Days - $140</option>
                <option value={30}>30 Days - $300</option>
              </select>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Additional Cost: <span className="font-semibold">{formatCurrency(selectedDays * 10)}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendSpotlight}
                disabled={isExtending}
                className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isExtending ? 'Processing...' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
