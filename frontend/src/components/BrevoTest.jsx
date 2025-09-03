import React, { useState } from 'react';
import { notificationService } from '../services/notificationService';
import { isBrevoInitialized, getBrevoStatus } from '../services/brevoService';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  EnvelopeIcon,
  PlayIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const BrevoTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testName, setTestName] = useState('Test User');

  // Test Brevo service status
  const testBrevoStatus = () => {
    const results = [];
    
    try {
      // Check if Brevo is initialized
      const isInitialized = isBrevoInitialized();
      results.push({
        test: 'Brevo Service Status',
        status: isInitialized ? '✅ PASS' : '❌ FAIL',
        message: isInitialized ? 'Brevo service is initialized' : 'Brevo service is not initialized'
      });

      // Get detailed status
      const status = getBrevoStatus();
      results.push({
        test: 'Brevo API Key',
        status: status.initialized ? '✅ PASS' : '❌ FAIL',
        message: status.initialized ? `API key configured: ${status.apiKey}` : 'No API key found'
      });

      // Check notification service status
      const serviceStatus = notificationService.getServiceStatus();
      results.push({
        test: 'Notification Service Status',
        status: serviceStatus.brevo ? '✅ PASS' : '❌ FAIL',
        message: `Brevo: ${serviceStatus.brevo ? 'Available' : 'Not Available'}, Backend: ${serviceStatus.backend ? 'Available' : 'Not Available'}`
      });

    } catch (error) {
      results.push({
        test: 'Brevo Status Check',
        status: '❌ ERROR',
        message: `Error: ${error.message}`
      });
    }

    setTestResults(results);
  };

  // Test sending a notification email
  const testNotificationEmail = async () => {
    setIsLoading(true);
    const results = [...testResults];

    try {
      // Create test order data
      const testOrderData = {
        _id: 'test-order-123',
        orderNumber: 'TEST-001',
        totalAmount: 25.99,
        items: [
          {
            name: 'Test Product',
            quantity: 2,
            unitPrice: 12.99
          }
        ],
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        },
        createdAt: new Date().toISOString(),
        deliveryMethod: 'delivery'
      };

      // Test order completion notification
      const notificationResult = await notificationService.sendOrderCompletionNotification(
        testOrderData,
        {
          id: 'test-user-123',
          email: testEmail,
          userName: testName,
          isGuest: true
        }
      );

      results.push({
        test: 'Order Completion Notification',
        status: notificationResult.success !== false ? '✅ PASS' : '❌ FAIL',
        message: notificationResult.success !== false 
          ? 'Notification sent successfully' 
          : `Failed: ${notificationResult.error || 'Unknown error'}`
      });

      // Test order update notification
      const updateResult = await notificationService.sendOrderUpdateNotification(
        testOrderData,
        {
          id: 'test-user-123',
          email: testEmail,
          userName: testName,
          isGuest: true
        },
        'status_change',
        { newStatus: 'shipped' }
      );

      results.push({
        test: 'Order Update Notification',
        status: updateResult.success !== false ? '✅ PASS' : '❌ FAIL',
        message: updateResult.success !== false 
          ? 'Update notification sent successfully' 
          : `Failed: ${updateResult.error || 'Unknown error'}`
      });

    } catch (error) {
      results.push({
        test: 'Notification Test',
        status: '❌ ERROR',
        message: `Error: ${error.message}`
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  // Test Brevo email directly
  const testBrevoEmail = async () => {
    setIsLoading(true);
    const results = [...testResults];

    try {
      // Import Brevo service functions
      const { sendOrderCompletionEmail } = await import('../services/brevoService');
      
      // Create test order data
      const testOrderData = {
        _id: 'brevo-test-123',
        orderNumber: 'BREVO-001',
        totalAmount: 19.99,
        items: [
          {
            name: 'Brevo Test Product',
            quantity: 1,
            unitPrice: 19.99
          }
        ],
        deliveryAddress: {
          street: '456 Brevo Test Ave',
          city: 'Brevo City',
          state: 'Test State',
          zipCode: '67890'
        },
        createdAt: new Date().toISOString(),
        deliveryMethod: 'pickup'
      };

      // Test direct Brevo email
      const emailResult = await sendOrderCompletionEmail(
        testOrderData,
        testEmail,
        testName
      );

      results.push({
        test: 'Direct Brevo Email',
        status: emailResult ? '✅ PASS' : '❌ FAIL',
        message: emailResult ? 'Brevo email sent successfully' : 'Brevo email failed'
      });

    } catch (error) {
      results.push({
        test: 'Direct Brevo Email',
        status: '❌ ERROR',
        message: `Error: ${error.message}`
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CogIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Brevo Integration Test</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Test the Brevo email integration and notification system
          </p>
        </div>

        {/* Test Configuration */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Test Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test User Name
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Test User"
              />
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Run Tests</h3>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={testBrevoStatus}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <CogIcon className="w-4 h-4" />
              Test Brevo Status
            </button>
            
            <button
              onClick={testNotificationEmail}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              <EnvelopeIcon className="w-4 h-4" />
              Test Notification Service
            </button>
            
            <button
              onClick={testBrevoEmail}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <PlayIcon className="w-4 h-4" />
              Test Direct Brevo Email
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Test Results</h3>
          
          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-800">Running tests...</span>
            </div>
          )}
          
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tests run yet. Click a test button above to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {result.status.includes('PASS') && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                    {result.status.includes('FAIL') && <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />}
                    {result.status.includes('ERROR') && <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />}
                    <span className="font-medium">{result.test}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      result.status.includes('PASS') ? 'bg-green-100 text-green-800' :
                      result.status.includes('FAIL') ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrevoTest;
