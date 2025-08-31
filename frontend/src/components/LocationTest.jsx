import React, { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import { ipGeolocationService } from '../services/ipGeolocationService';
import LocationPrompt from './LocationPrompt';

export default function LocationTest() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = () => {
    const location = locationService.getUserLocation();
    setCurrentLocation(location);
  };

  const testGPSLocation = async () => {
    setTestResults(prev => ({ ...prev, gps: 'Testing...' }));
    
    try {
      if (!navigator.geolocation) {
        setTestResults(prev => ({ ...prev, gps: 'Not supported' }));
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 600000
        });
      });

      setTestResults(prev => ({ 
        ...prev, 
        gps: `Success: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        gps: `Error: ${error.message} (Code: ${error.code})` 
      }));
    }
  };

  const testIPLocation = async () => {
    setTestResults(prev => ({ ...prev, ip: 'Testing...' }));
    
    try {
      const ipLocation = await ipGeolocationService.getLocationFromIP();
      if (ipLocation) {
        setTestResults(prev => ({ 
          ...prev, 
          ip: `Success: ${ipLocation.display_name}` 
        }));
      } else {
        setTestResults(prev => ({ ...prev, ip: 'Failed: No location data' }));
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        ip: `Error: ${error.message}` 
      }));
    }
  };

  const clearLocation = () => {
    locationService.clearUserLocation();
    locationService.markLocationPromptAsShown();
    setCurrentLocation(null);
    setTestResults({});
  };

  const resetPrompt = () => {
    localStorage.removeItem('location_prompt_shown');
    setShowPrompt(true);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Location System Test</h1>
      
      <div className="space-y-6">
        {/* Current Location Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Current Location</h2>
          {currentLocation ? (
            <div className="space-y-2">
              <p><strong>Address:</strong> {currentLocation.address}</p>
              <p><strong>Coordinates:</strong> {currentLocation.lat}, {currentLocation.lng}</p>
              <p><strong>Confidence:</strong> {currentLocation.confidence || 'N/A'}</p>
              <p><strong>Age:</strong> {locationService.getLocationAgeInDays()} days ago</p>
            </div>
          ) : (
            <p className="text-gray-600">No location set</p>
          )}
        </div>

        {/* Test Results */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Results</h2>
          <div className="space-y-2">
            <div>
              <strong>GPS Location:</strong> 
              <span className="ml-2">{testResults.gps || 'Not tested'}</span>
            </div>
            <div>
              <strong>IP Location:</strong> 
              <span className="ml-2">{testResults.ip || 'Not tested'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={testGPSLocation}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test GPS Location
          </button>
          
          <button
            onClick={testIPLocation}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test IP Location
          </button>
          
          <button
            onClick={() => setShowPrompt(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Show Location Prompt
          </button>
          
          <button
            onClick={clearLocation}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Location
          </button>
          
          <button
            onClick={resetPrompt}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Reset Prompt (Show Again)
          </button>
        </div>

        {/* Environment Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Environment Info</h2>
          <div className="space-y-1 text-sm">
            <p><strong>Protocol:</strong> {window.location.protocol}</p>
            <p><strong>Hostname:</strong> {window.location.hostname}</p>
            <p><strong>Geolocation Supported:</strong> {navigator.geolocation ? 'Yes' : 'No'}</p>
            <p><strong>LocalStorage Available:</strong> {typeof localStorage !== 'undefined' ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Location Prompt Modal */}
      {showPrompt && (
        <LocationPrompt
          onLocationSet={(locationData) => {
            setCurrentLocation(locationData);
            setShowPrompt(false);
            loadCurrentLocation();
          }}
          onDismiss={() => setShowPrompt(false)}
        />
      )}
    </div>
  );
}
