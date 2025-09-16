import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  MapPinIcon,
  GlobeAltIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import geographicSettingsService from '../services/geographicSettingsService';

const GeographicSettingsTest = () => {
  const [currentSettings, setCurrentSettings] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Test scenarios
  const testScenarios = [
    {
      id: 'montreal',
      name: 'Montreal, Canada',
      latitude: 45.5017,
      longitude: -73.5673,
      country: 'Canada',
      region: 'Quebec',
      expected: 'Should be allowed if Canada/Quebec is configured'
    },
    {
      id: 'toronto',
      name: 'Toronto, Canada',
      latitude: 43.6532,
      longitude: -79.3832,
      country: 'Canada',
      region: 'Ontario',
      expected: 'Should be allowed if Canada is configured'
    },
    {
      id: 'newyork',
      name: 'New York, USA',
      latitude: 40.7128,
      longitude: -74.0060,
      country: 'United States',
      region: 'New York',
      expected: 'Should be blocked if only Canada is allowed'
    },
    {
      id: 'london',
      name: 'London, UK',
      latitude: 51.5074,
      longitude: -0.1278,
      country: 'United Kingdom',
      region: 'England',
      expected: 'Should be blocked if only North America is allowed'
    },
    {
      id: 'invalid-coords',
      name: 'Invalid Coordinates',
      latitude: 999,
      longitude: 999,
      country: 'Unknown',
      region: 'Unknown',
      expected: 'Should be blocked due to invalid coordinates'
    }
  ];

  useEffect(() => {
    loadCurrentSettings();
    getUserLocation();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const response = await geographicSettingsService.getCurrentSettings();
      if (response.success) {
        setCurrentSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      const position = await geographicSettingsService.getCurrentPosition();
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    } catch (error) {
      console.warn('Could not get user location:', error);
    }
  };

  const runSingleTest = async (scenario) => {
    try {
      const response = await geographicSettingsService.testSettings({
        latitude: scenario.latitude,
        longitude: scenario.longitude,
        country: scenario.country,
        region: scenario.region
      });

      return {
        scenario,
        result: response.success ? response.data : null,
        error: response.success ? null : response.error
      };
    } catch (error) {
      return {
        scenario,
        result: null,
        error: error.message
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results = [];
    
    for (const scenario of testScenarios) {
      const testResult = await runSingleTest(scenario);
      results.push(testResult);
      setTestResults([...results]); // Update UI progressively
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setLoading(false);
    toast.success('All tests completed!');
  };

  const testUserLocation = async () => {
    if (!userLocation) {
      toast.error('User location not available');
      return;
    }

    setLoading(true);
    try {
      const response = await geographicSettingsService.checkLocationAccess(
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (response.success) {
        const result = {
          scenario: {
            id: 'user-location',
            name: 'Your Current Location',
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            country: 'Detected',
            region: 'Detected',
            expected: 'Based on your actual location'
          },
          result: response.data,
          error: null
        };
        
        setTestResults([result]);
        toast.success('User location test completed!');
      } else {
        toast.error('Failed to test user location');
      }
    } catch (error) {
      toast.error('Error testing user location');
    } finally {
      setLoading(false);
    }
  };

  const testAddressValidation = async () => {
    const testAddresses = [
      {
        name: 'Valid Canadian Address',
        address: {
          street: '123 Main St',
          city: 'Montreal',
          state: 'Quebec',
          zipCode: 'H1A 1A1',
          country: 'Canada'
        }
      },
      {
        name: 'Valid US Address',
        address: {
          street: '456 Oak Ave',
          city: 'New York',
          state: 'New York',
          zipCode: '10001',
          country: 'United States'
        }
      },
      {
        name: 'Invalid Postal Code',
        address: {
          street: '789 Pine St',
          city: 'Montreal',
          state: 'Quebec',
          zipCode: '12345', // Invalid for Canada
          country: 'Canada'
        }
      }
    ];

    setLoading(true);
    const results = [];

    for (const test of testAddresses) {
      try {
        const validation = await geographicSettingsService.validateAddress(test.address);
        results.push({
          name: test.name,
          address: test.address,
          validation,
          error: null
        });
      } catch (error) {
        results.push({
          name: test.name,
          address: test.address,
          validation: null,
          error: error.message
        });
      }
    }

    setTestResults(results);
    setLoading(false);
    toast.success('Address validation tests completed!');
  };

  const getResultIcon = (result) => {
    if (!result) return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    
    if (result.isAllowed) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getResultColor = (result) => {
    if (!result) return 'bg-yellow-50 border-yellow-200';
    
    if (result.isAllowed) {
      return 'bg-green-50 border-green-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <PlayIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Geographic Settings Test Suite</h1>
          </div>
          <p className="text-gray-600">
            Comprehensive testing for geographic restrictions and address validation
          </p>
        </div>

        {/* Current Settings Display */}
        {currentSettings && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Status</h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                  currentSettings.isEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentSettings.isEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Restriction Type</h3>
                <p className="text-gray-600 capitalize">{currentSettings.restrictions.type}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Address Validation</h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                  currentSettings.addressValidation.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentSettings.addressValidation.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Location */}
        {userLocation && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Location</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPinIcon className="w-5 h-5 text-blue-500" />
                <span className="text-gray-600">
                  {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </span>
              </div>
              <button
                onClick={testUserLocation}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <PlayIcon className="w-4 h-4" />
                <span>Test My Location</span>
              </button>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runAllTests}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <PlayIcon className="w-4 h-4" />
              <span>Run All Location Tests</span>
            </button>
            
            <button
              onClick={testAddressValidation}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Test Address Validation</span>
            </button>
            
            <button
              onClick={() => setTestResults([])}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              <span>Clear Results</span>
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {testResults.map((test, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getResultColor(test.result)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getResultIcon(test.result)}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {test.scenario?.name || test.name}
                          </h3>
                          
                          {test.scenario && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Coordinates:</strong> {test.scenario.latitude}, {test.scenario.longitude}</p>
                              <p><strong>Country:</strong> {test.scenario.country}</p>
                              <p><strong>Region:</strong> {test.scenario.region}</p>
                              <p><strong>Expected:</strong> {test.scenario.expected}</p>
                            </div>
                          )}
                          
                          {test.address && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Address:</strong> {test.address.street}, {test.address.city}, {test.address.state} {test.address.zipCode}, {test.address.country}</p>
                            </div>
                          )}
                          
                          {test.result && (
                            <div className="mt-2">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                test.result.isAllowed 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {test.result.isAllowed ? 'Allowed' : 'Blocked'}
                              </div>
                              <p className="mt-1 text-sm text-gray-600">{test.result.message}</p>
                            </div>
                          )}
                          
                          {test.validation && (
                            <div className="mt-2">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                test.validation.isValid 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {test.validation.isValid ? 'Valid' : 'Invalid'}
                              </div>
                              {test.validation.errors && test.validation.errors.length > 0 && (
                                <ul className="mt-1 text-sm text-red-600">
                                  {test.validation.errors.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                          
                          {test.error && (
                            <div className="mt-2 text-sm text-red-600">
                              <strong>Error:</strong> {test.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Running tests...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeographicSettingsTest;
