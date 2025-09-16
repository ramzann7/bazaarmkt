import React, { useState, useEffect } from 'react';
import { 
  MapPinIcon, 
  GlobeAltIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import geographicSettingsService from '../services/geographicSettingsService';

const AdminGeographicSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('restrictions');
  const [testResults, setTestResults] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    isEnabled: false,
    restrictions: {
      type: 'none',
      allowedCountries: [],
      allowedRegions: [],
      allowedCoordinates: []
    },
    addressValidation: {
      enabled: true,
      countryRules: []
    },
    userExperience: {
      showWelcomeMessage: true,
      welcomeMessage: 'Welcome to our platform!',
      restrictionMessage: 'This application is not available in your region.',
      allowLocationPrompt: true,
      fallbackToIP: true
    },
    testing: {
      enabled: false,
      testCoordinates: null,
      testCountry: '',
      testRegion: '',
      bypassRestrictions: false
    }
  });

  // Test form state
  const [testForm, setTestForm] = useState({
    latitude: '',
    longitude: '',
    country: '',
    region: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await geographicSettingsService.getSettings();
      
      if (response.success) {
        setSettings(response.data);
        setFormData(response.data);
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load geographic settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await geographicSettingsService.updateSettings(formData);
      
      if (response.success) {
        toast.success('Geographic settings updated successfully');
        setSettings(response.data);
      } else {
        toast.error(response.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const testData = {
        latitude: parseFloat(testForm.latitude),
        longitude: parseFloat(testForm.longitude),
        country: testForm.country || null,
        region: testForm.region || null
      };

      const response = await geographicSettingsService.testSettings(testData);
      
      if (response.success) {
        setTestResults(response.data);
        toast.success('Test completed successfully');
      } else {
        toast.error(response.error || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing settings:', error);
      toast.error('Failed to run test');
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addCountry = () => {
    const country = prompt('Enter country name:');
    if (country && !formData.restrictions.allowedCountries.includes(country)) {
      handleInputChange('restrictions.allowedCountries', [...formData.restrictions.allowedCountries, country]);
    }
  };

  const removeCountry = (index) => {
    const newCountries = formData.restrictions.allowedCountries.filter((_, i) => i !== index);
    handleInputChange('restrictions.allowedCountries', newCountries);
  };

  const addRegion = () => {
    const country = prompt('Enter country name:');
    const region = prompt('Enter region/state name:');
    
    if (country && region) {
      const existingRegion = formData.restrictions.allowedRegions.find(r => r.country === country);
      
      if (existingRegion) {
        if (!existingRegion.regions.includes(region)) {
          existingRegion.regions.push(region);
          handleInputChange('restrictions.allowedRegions', [...formData.restrictions.allowedRegions]);
        }
      } else {
        handleInputChange('restrictions.allowedRegions', [
          ...formData.restrictions.allowedRegions,
          { country, regions: [region] }
        ]);
      }
    }
  };

  const addCoordinate = () => {
    const name = prompt('Enter region name:');
    const north = parseFloat(prompt('Enter north latitude:'));
    const south = parseFloat(prompt('Enter south latitude:'));
    const east = parseFloat(prompt('Enter east longitude:'));
    const west = parseFloat(prompt('Enter west longitude:'));
    
    if (name && !isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
      handleInputChange('restrictions.allowedCoordinates', [
        ...formData.restrictions.allowedCoordinates,
        { name, bounds: { north, south, east, west } }
      ]);
    }
  };

  const addCountryRule = () => {
    const country = prompt('Enter country name:');
    if (country) {
      handleInputChange('addressValidation.countryRules', [
        ...formData.addressValidation.countryRules,
        {
          country,
          states: [],
          postalCodePattern: '',
          postalCodePlaceholder: '',
          requiredFields: ['street', 'city', 'state', 'zipCode', 'country']
        }
      ]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading geographic settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <GlobeAltIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Geographic Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure geographic restrictions and address validation for your platform
          </p>
        </div>

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border ${
          formData.isEnabled 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            {formData.isEnabled ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-gray-400" />
            )}
            <span className={`font-medium ${
              formData.isEnabled ? 'text-green-800' : 'text-gray-600'
            }`}>
              Geographic restrictions are {formData.isEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'restrictions', name: 'Restrictions', icon: ShieldCheckIcon },
              { id: 'validation', name: 'Address Validation', icon: DocumentTextIcon },
              { id: 'experience', name: 'User Experience', icon: MapPinIcon },
              { id: 'testing', name: 'Testing', icon: PlayIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'restrictions' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Geographic Restrictions</h2>
              
              {/* Enable/Disable */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable geographic restrictions
                  </span>
                </label>
              </div>

              {/* Restriction Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restriction Type
                </label>
                <select
                  value={formData.restrictions.type}
                  onChange={(e) => handleInputChange('restrictions.type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Restrictions</option>
                  <option value="country">Country-based</option>
                  <option value="region">Region/State-based</option>
                  <option value="coordinates">Coordinate-based</option>
                </select>
              </div>

              {/* Country Restrictions */}
              {formData.restrictions.type === 'country' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Allowed Countries</h3>
                    <button
                      onClick={addCountry}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Country</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.restrictions.allowedCountries.map((country, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-gray-900">{country}</span>
                        <button
                          onClick={() => removeCountry(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Region Restrictions */}
              {formData.restrictions.type === 'region' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Allowed Regions</h3>
                    <button
                      onClick={addRegion}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Region</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.restrictions.allowedRegions.map((region, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{region.country}</span>
                          <button
                            onClick={() => {
                              const newRegions = formData.restrictions.allowedRegions.filter((_, i) => i !== index);
                              handleInputChange('restrictions.allowedRegions', newRegions);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-600">
                          {region.regions.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinate Restrictions */}
              {formData.restrictions.type === 'coordinates' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Allowed Coordinates</h3>
                    <button
                      onClick={addCoordinate}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Region</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.restrictions.allowedCoordinates.map((coord, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{coord.name}</span>
                          <button
                            onClick={() => {
                              const newCoords = formData.restrictions.allowedCoordinates.filter((_, i) => i !== index);
                              handleInputChange('restrictions.allowedCoordinates', newCoords);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-600">
                          North: {coord.bounds.north}, South: {coord.bounds.south}, 
                          East: {coord.bounds.east}, West: {coord.bounds.west}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Address Validation</h2>
              
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.addressValidation.enabled}
                    onChange={(e) => handleInputChange('addressValidation.enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable address validation
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Country Rules</h3>
                <button
                  onClick={addCountryRule}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Country Rule</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.addressValidation.countryRules.map((rule, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{rule.country}</h4>
                      <button
                        onClick={() => {
                          const newRules = formData.addressValidation.countryRules.filter((_, i) => i !== index);
                          handleInputChange('addressValidation.countryRules', newRules);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code Pattern
                        </label>
                        <input
                          type="text"
                          value={rule.postalCodePattern}
                          onChange={(e) => {
                            const newRules = [...formData.addressValidation.countryRules];
                            newRules[index].postalCodePattern = e.target.value;
                            handleInputChange('addressValidation.countryRules', newRules);
                          }}
                          placeholder="^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code Placeholder
                        </label>
                        <input
                          type="text"
                          value={rule.postalCodePlaceholder}
                          onChange={(e) => {
                            const newRules = [...formData.addressValidation.countryRules];
                            newRules[index].postalCodePlaceholder = e.target.value;
                            handleInputChange('addressValidation.countryRules', newRules);
                          }}
                          placeholder="A1A 1A1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Experience</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.userExperience.showWelcomeMessage}
                      onChange={(e) => handleInputChange('userExperience.showWelcomeMessage', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show welcome message
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    value={formData.userExperience.welcomeMessage}
                    onChange={(e) => handleInputChange('userExperience.welcomeMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restriction Message
                  </label>
                  <textarea
                    value={formData.userExperience.restrictionMessage}
                    onChange={(e) => handleInputChange('userExperience.restrictionMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.userExperience.allowLocationPrompt}
                      onChange={(e) => handleInputChange('userExperience.allowLocationPrompt', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Allow location prompt
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.userExperience.fallbackToIP}
                      onChange={(e) => handleInputChange('userExperience.fallbackToIP', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Fallback to IP geolocation
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Testing</h2>
              
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.testing.enabled}
                    onChange={(e) => handleInputChange('testing.enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable testing mode
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Location</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={testForm.latitude}
                        onChange={(e) => setTestForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="45.5017"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={testForm.longitude}
                        onChange={(e) => setTestForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="-73.5673"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country (optional)
                      </label>
                      <input
                        type="text"
                        value={testForm.country}
                        onChange={(e) => setTestForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="Canada"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region (optional)
                      </label>
                      <input
                        type="text"
                        value={testForm.region}
                        onChange={(e) => setTestForm(prev => ({ ...prev, region: e.target.value }))}
                        placeholder="Quebec"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <button
                      onClick={handleTest}
                      disabled={testing || !testForm.latitude || !testForm.longitude}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlayIcon className="w-4 h-4" />
                      <span>{testing ? 'Testing...' : 'Test Location'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
                  
                  {testResults ? (
                    <div className={`p-4 rounded-lg border ${
                      testResults.isAllowed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {testResults.isAllowed ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        )}
                        <span className={`font-medium ${
                          testResults.isAllowed ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {testResults.message}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Location:</strong> {testResults.testData.latitude}, {testResults.testData.longitude}</p>
                        {testResults.testData.country && <p><strong>Country:</strong> {testResults.testData.country}</p>}
                        {testResults.testData.region && <p><strong>Region:</strong> {testResults.testData.region}</p>}
                        <p><strong>Restriction Type:</strong> {testResults.restrictionType}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500 text-center">No test results yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminGeographicSettings;
