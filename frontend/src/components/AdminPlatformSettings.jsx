import React, { useState, useEffect } from 'react';
import { 
  CogIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  BanknotesIcon,
  CalendarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { authToken, getProfile } from '../services/authservice';
import * as adminService from '../services/adminService';
import toast from 'react-hot-toast';

export default function AdminPlatformSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Platform settings state
  const [settings, setSettings] = useState({
    platformFeePercentage: 10,
    currency: 'CAD',
    paymentProcessingFee: 2.9,
    minimumOrderAmount: 5.00,
    payoutSettings: {
      minimumPayoutAmount: 25.00,
      payoutFrequency: 'weekly',
      payoutDelay: 7
    },
    platformInfo: {
      name: 'bazaar',
      supportEmail: 'support@thebazaar.com'
    },
    features: {
      promotionalFeatures: true,
      spotlights: true,
      wallet: true,
      reviews: true
    }
  });

  // Form state
  const [formData, setFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (currentUser && authChecked) {
      loadPlatformSettings();
    }
  }, [currentUser, authChecked]);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

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

  const loadPlatformSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const settingsData = await adminService.getPlatformSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading platform settings:', error);
      setError('Failed to load platform settings');
      toast.error('Failed to load platform settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    const newFormData = { ...formData };
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newFormData[parent] = { ...newFormData[parent], [child]: value };
    } else {
      newFormData[field] = value;
    }
    
    setFormData(newFormData);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const result = await adminService.updatePlatformSettings(formData);
      
      setSettings(result.data);
      setHasChanges(false);
      toast.success('Platform settings updated successfully');
    } catch (error) {
      console.error('Error saving platform settings:', error);
      toast.error('Failed to update platform settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      try {
        setIsSaving(true);
        
        const result = await adminService.resetPlatformSettings();
        
        setSettings(result.data);
        setFormData(result.data);
        setHasChanges(false);
        toast.success('Platform settings reset to defaults');
      } catch (error) {
        console.error('Error resetting platform settings:', error);
        toast.error('Failed to reset platform settings');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: formData.currency || 'CAD'
    }).format(amount);
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
          <p className="text-gray-600">Loading platform settings...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure platform fees, payout settings, and general platform information
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2 inline" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Platform Fee Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600" />
                Platform Fee Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Set the platform fee percentage that will be deducted from artisan earnings
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Fee Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.platformFeePercentage || 0}
                    onChange={(e) => handleInputChange('platformFeePercentage', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="50"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Platform fee percentage (0-50%). This amount will be deducted from each order.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency || 'CAD'}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CAD">Canadian Dollar (CAD)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Processing Fee
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.paymentProcessingFee || 0}
                    onChange={(e) => handleInputChange('paymentProcessingFee', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Payment processing fee percentage charged by payment providers.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.minimumOrderAmount || 0}
                    onChange={(e) => handleInputChange('minimumOrderAmount', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">{formData.currency || 'CAD'}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum order amount required for checkout.
                </p>
              </div>
            </div>
          </div>

          {/* Payout Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BanknotesIcon className="w-5 h-5 mr-2 text-blue-600" />
                Payout Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure how and when artisans receive their earnings
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Payout Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.payoutSettings?.minimumPayoutAmount || 0}
                    onChange={(e) => handleInputChange('payoutSettings.minimumPayoutAmount', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">{formData.currency || 'CAD'}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum amount required before an artisan can request a payout.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Frequency
                </label>
                <select
                  value={formData.payoutSettings?.payoutFrequency || 'weekly'}
                  onChange={(e) => handleInputChange('payoutSettings.payoutFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Delay (Days)
                </label>
                <input
                  type="number"
                  value={formData.payoutSettings?.payoutDelay || 0}
                  onChange={(e) => handleInputChange('payoutSettings.payoutDelay', parseInt(e.target.value) || 0)}
                  min="0"
                  max="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of days to wait after order completion before payout is available.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <GlobeAltIcon className="w-5 h-5 mr-2 text-purple-600" />
                Platform Information
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                General platform information and support details
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={formData.platformInfo?.name || ''}
                  onChange={(e) => handleInputChange('platformInfo.name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={formData.platformInfo?.supportEmail || ''}
                  onChange={(e) => handleInputChange('platformInfo.supportEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <CogIcon className="w-5 h-5 mr-2 text-orange-600" />
                Feature Flags
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Enable or disable platform features
              </p>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'promotionalFeatures', label: 'Promotional Features', description: 'Allow artisans to purchase promotional features' },
                { key: 'spotlights', label: 'Artisan Spotlights', description: 'Enable artisan spotlight features' },
                { key: 'wallet', label: 'Wallet System', description: 'Enable wallet and payout features' },
                { key: 'reviews', label: 'Review System', description: 'Allow customers to leave reviews' }
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{feature.label}</h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.features?.[feature.key] || false}
                      onChange={(e) => handleInputChange(`features.${feature.key}`, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setFormData(settings);
                  setHasChanges(false);
                }}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

