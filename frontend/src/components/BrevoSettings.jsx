import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBrevoIntegration } from '../hooks/useBrevoIntegration';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  CogIcon,
  KeyIcon,
  TrashIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const BrevoSettings = () => {
  const { t } = useTranslation();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const {
    brevoApiKey,
    isInitialized,
    isLoading,
    error,
    initializeBrevo,
    removeBrevo,
    testBrevoConnection,
    getBrevoConfigStatus
  } = useBrevoIntegration();

  const configStatus = getBrevoConfigStatus();

  const handleInitialize = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    
    const success = await initializeBrevo(apiKeyInput.trim());
    if (success) {
      setApiKeyInput('');
    }
  };

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove Brevo integration? This will disable all Brevo email functionality.')) {
      await removeBrevo();
    }
  };

  const handleTestConnection = async () => {
    await testBrevoConnection();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CogIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Brevo Email Integration</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure Brevo API for sending transactional emails and managing contacts
          </p>
        </div>

        {/* Status Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Integration Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${configStatus.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {configStatus.isAvailable ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <KeyIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                API Key: {configStatus.apiKey || 'Not set'}
              </span>
            </div>
          </div>

          {configStatus.isAvailable && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  Brevo integration is active and ready to send emails
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Configuration</h3>
          
          {!isInitialized ? (
            <form onSubmit={handleInitialize} className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Brevo API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    id="apiKey"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Brevo API key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from the <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Brevo dashboard</a>
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !apiKeyInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Initializing...' : 'Initialize Integration'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Integration Active
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  Brevo is configured and ready to send emails. API key: {configStatus.apiKey}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <PlayIcon className="w-4 h-4" />
                  {isLoading ? 'Testing...' : 'Test Connection'}
                </button>
                
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remove Integration
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800 font-medium">
                Error: {error}
              </span>
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">About Brevo Integration</h3>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Transactional Emails:</strong> Order confirmations, updates, and status changes
            </p>
            <p>
              <strong>Contact Management:</strong> Automatically create and update customer contacts
            </p>
            <p>
              <strong>Email Templates:</strong> Professional, branded email templates for all communications
            </p>
            <p>
              <strong>Analytics:</strong> Track email delivery, opens, and engagement rates
            </p>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> The API key is stored locally in your browser. For production use, 
              consider storing it securely in environment variables or a secure configuration service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrevoSettings;
