import React, { useState, useEffect } from 'react';
import { 
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';

export default function AdminSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('platform');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Settings state
  const [platformSettings, setPlatformSettings] = useState({
    siteName: 'BazaarMKT',
    siteDescription: 'Connecting local artisans with customers',
    maintenanceMode: false,
    registrationEnabled: true,
    guestCheckoutEnabled: true,
    maxFileSize: 5, // MB
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
    defaultCurrency: 'CAD',
    timezone: 'America/Toronto',
    language: 'en'
  });

  const [businessSettings, setBusinessSettings] = useState({
    platformFeePercentage: 8.5,
    minimumOrderAmount: 25,
    freeShippingThreshold: 100,
    maxDeliveryRadius: 50, // km
    autoApproveArtisans: false,
    requireArtisanVerification: true,
    enableReviews: true,
    enableRatings: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    adminEmailAlerts: true,
    newUserNotifications: true,
    newOrderNotifications: true,
    systemAlerts: true,
    maintenanceAlerts: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 24, // hours
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireTwoFactor: false,
    enableAuditLog: true,
    ipWhitelist: '',
    allowedDomains: '',
    enableRateLimiting: true
  });

  useEffect(() => {
    checkAdminAccess();
    loadSettings();
  }, []);

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
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Authentication error');
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // In a real application, you would load these from the backend
      // For now, we'll use the default values
      console.log('Loading admin settings...');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const saveSettings = async (settingsType, settings) => {
    setIsSaving(true);
    try {
      // In a real application, you would save these to the backend
      console.log(`Saving ${settingsType} settings:`, settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`${settingsType} settings saved successfully!`);
    } catch (error) {
      console.error(`Error saving ${settingsType} settings:`, error);
      toast.error(`Failed to save ${settingsType} settings`);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'platform', name: 'Platform Settings', icon: GlobeAltIcon },
    { id: 'business', name: 'Business Rules', icon: CurrencyDollarIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin settings...</p>
        </div>
      </div>
    );
  }

  const renderPlatformSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <GlobeAltIcon className="w-5 h-5 mr-2 text-blue-600" />
          Site Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={platformSettings.siteName}
              onChange={(e) => setPlatformSettings({...platformSettings, siteName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Currency
            </label>
            <select
              value={platformSettings.defaultCurrency}
              onChange={(e) => setPlatformSettings({...platformSettings, defaultCurrency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site Description
          </label>
          <textarea
            value={platformSettings.siteDescription}
            onChange={(e) => setPlatformSettings({...platformSettings, siteDescription: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CogIcon className="w-5 h-5 mr-2 text-gray-600" />
          System Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
              <p className="text-xs text-gray-500">Temporarily disable the site for maintenance</p>
            </div>
            <button
              onClick={() => setPlatformSettings({...platformSettings, maintenanceMode: !platformSettings.maintenanceMode})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                platformSettings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  platformSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">User Registration</label>
              <p className="text-xs text-gray-500">Allow new users to register</p>
            </div>
            <button
              onClick={() => setPlatformSettings({...platformSettings, registrationEnabled: !platformSettings.registrationEnabled})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                platformSettings.registrationEnabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  platformSettings.registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Guest Checkout</label>
              <p className="text-xs text-gray-500">Allow customers to checkout without registration</p>
            </div>
            <button
              onClick={() => setPlatformSettings({...platformSettings, guestCheckoutEnabled: !platformSettings.guestCheckoutEnabled})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                platformSettings.guestCheckoutEnabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  platformSettings.guestCheckoutEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('Platform', platformSettings)}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Save Platform Settings
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600" />
          Revenue & Fees
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform Fee Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={businessSettings.platformFeePercentage}
                onChange={(e) => setBusinessSettings({...businessSettings, platformFeePercentage: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Order Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                value={businessSettings.minimumOrderAmount}
                onChange={(e) => setBusinessSettings({...businessSettings, minimumOrderAmount: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserGroupIcon className="w-5 h-5 mr-2 text-purple-600" />
          Artisan Management
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto-approve Artisans</label>
              <p className="text-xs text-gray-500">Automatically approve new artisan registrations</p>
            </div>
            <button
              onClick={() => setBusinessSettings({...businessSettings, autoApproveArtisans: !businessSettings.autoApproveArtisans})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                businessSettings.autoApproveArtisans ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  businessSettings.autoApproveArtisans ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Require Artisan Verification</label>
              <p className="text-xs text-gray-500">Require identity verification for artisans</p>
            </div>
            <button
              onClick={() => setBusinessSettings({...businessSettings, requireArtisanVerification: !businessSettings.requireArtisanVerification})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                businessSettings.requireArtisanVerification ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  businessSettings.requireArtisanVerification ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('Business', businessSettings)}
          disabled={isSaving}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Save Business Settings
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BellIcon className="w-5 h-5 mr-2 text-yellow-600" />
          Notification Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-xs text-gray-500">Send notifications via email</p>
            </div>
            <button
              onClick={() => setNotificationSettings({...notificationSettings, emailNotifications: !notificationSettings.emailNotifications})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.emailNotifications ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Admin Email Alerts</label>
              <p className="text-xs text-gray-500">Send important alerts to admin email</p>
            </div>
            <button
              onClick={() => setNotificationSettings({...notificationSettings, adminEmailAlerts: !notificationSettings.adminEmailAlerts})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.adminEmailAlerts ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.adminEmailAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New User Notifications</label>
              <p className="text-xs text-gray-500">Notify when new users register</p>
            </div>
            <button
              onClick={() => setNotificationSettings({...notificationSettings, newUserNotifications: !notificationSettings.newUserNotifications})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.newUserNotifications ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.newUserNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">System Alerts</label>
              <p className="text-xs text-gray-500">Receive system and maintenance alerts</p>
            </div>
            <button
              onClick={() => setNotificationSettings({...notificationSettings, systemAlerts: !notificationSettings.systemAlerts})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.systemAlerts ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.systemAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('Notifications', notificationSettings)}
          disabled={isSaving}
          className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Save Notification Settings
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShieldCheckIcon className="w-5 h-5 mr-2 text-red-600" />
          Security Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Login Attempts
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={securitySettings.maxLoginAttempts}
              onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
                <p className="text-xs text-gray-500">Require 2FA for admin accounts</p>
              </div>
              <button
                onClick={() => setSecuritySettings({...securitySettings, requireTwoFactor: !securitySettings.requireTwoFactor})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.requireTwoFactor ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.requireTwoFactor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Audit Logging</label>
                <p className="text-xs text-gray-500">Log all admin actions for security</p>
              </div>
              <button
                onClick={() => setSecuritySettings({...securitySettings, enableAuditLog: !securitySettings.enableAuditLog})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.enableAuditLog ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.enableAuditLog ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Rate Limiting</label>
                <p className="text-xs text-gray-500">Enable API rate limiting</p>
              </div>
              <button
                onClick={() => setSecuritySettings({...securitySettings, enableRateLimiting: !securitySettings.enableRateLimiting})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.enableRateLimiting ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.enableRateLimiting ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('Security', securitySettings)}
          disabled={isSaving}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Save Security Settings
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure platform settings and preferences
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Admin</span>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {activeTab === 'platform' && renderPlatformSettings()}
            {activeTab === 'business' && renderBusinessSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'security' && renderSecuritySettings()}
          </div>
        </div>
      </div>
    </div>
  );
}
