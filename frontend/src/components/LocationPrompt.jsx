import React, { useState, useEffect } from 'react';
import { MapPinIcon, XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { geocodingService } from '../services/geocodingService';
import { locationService } from '../services/locationService';
import { ipGeolocationService } from '../services/ipGeolocationService';
import toast from 'react-hot-toast';

export default function LocationPrompt({ onLocationSet, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [hasShownBefore, setHasShownBefore] = useState(false);
  const [showIPOption, setShowIPOption] = useState(false);

  useEffect(() => {
    // Check if we've shown this before using the location service
    if (!locationService.hasLocationPromptBeenShown()) {
      // Show after a short delay to let the page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsLoading(true);
    try {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser. Please enter your location manually.');
        setIsLoading(false);
        return;
      }

      // Check if we're on HTTPS (required for geolocation)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        toast.error('Location access requires HTTPS. Please enter your location manually or use HTTPS.');
        setIsLoading(false);
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Changed to false for better compatibility
          timeout: 15000, // Increased timeout
          maximumAge: 600000 // 10 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Get address from coordinates using the existing reverse geocoding service
      const addressData = await geocodingService.reverseGeocode(latitude, longitude);
      
      if (addressData && addressData.display_name) {
        setLocation(addressData.display_name);
        handleLocationSubmit(addressData.display_name, latitude, longitude);
      } else {
        // Fallback: use coordinates directly
        const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setLocation(fallbackAddress);
        handleLocationSubmit(fallbackAddress, latitude, longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      
      // More specific error messages
      if (error.code === 1) {
        toast.error(
          'Location access denied. Please allow location access in your browser settings or enter your location manually.',
          { duration: 6000 }
        );
      } else if (error.code === 2) {
        toast.error(
          'Location unavailable. Please check your device location settings or enter your location manually.',
          { duration: 6000 }
        );
      } else if (error.code === 3) {
        toast.error(
          'Location request timed out. Please try again or enter your location manually.',
          { duration: 6000 }
        );
      } else {
        toast.error(
          'Error getting your location. Please enter your location manually.',
          { duration: 6000 }
        );
      }
      
      // Show IP-based location option as fallback
      setShowIPOption(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSubmit = async (address, lat = null, lng = null) => {
    setIsLoading(true);
    try {
      let coordinates = null;
      
      // If we have coordinates from GPS, use them directly
      if (lat && lng) {
        coordinates = { latitude: lat, longitude: lng };
      } else {
        // Use the existing geocoding service to convert address to coordinates
        coordinates = await geocodingService.geocodeAddress(address);
      }

      if (coordinates && coordinates.latitude && coordinates.longitude) {
        // Save location using the location service
        const locationData = {
          address: coordinates.display_name || address,
          lat: coordinates.latitude,
          lng: coordinates.longitude,
          confidence: coordinates.confidence || 0,
          formattedAddress: coordinates.display_name || address
        };
        
        // Save using location service
        const saved = locationService.saveUserLocation(locationData);
        locationService.markLocationPromptAsShown();
        
        if (saved) {
          toast.success('Location saved! You can now see products close to you.');
          
          // Call the callback with location data
          if (onLocationSet) {
            onLocationSet(locationData);
          }
          
          setIsVisible(false);
        } else {
          toast.error('Failed to save location. Please try again.');
        }
      } else {
        toast.error('Could not find coordinates for this address. Please try a different location.');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Error saving location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (location.trim()) {
      handleLocationSubmit(location.trim());
    } else {
      toast.error('Please enter a location');
    }
  };

  const handleDismiss = () => {
    locationService.markLocationPromptAsShown();
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleGetIPLocation = async () => {
    setIsLoading(true);
    try {
      const ipLocation = await ipGeolocationService.getLocationFromIP();
      
      if (ipLocation) {
        setLocation(ipLocation.display_name);
        handleLocationSubmit(ipLocation.display_name, ipLocation.latitude, ipLocation.longitude);
        toast.success('Location estimated from your IP address');
      } else {
        toast.error('Could not estimate location from IP. Please enter manually.');
      }
    } catch (error) {
      console.error('Error getting IP location:', error);
      toast.error('Could not estimate location from IP. Please enter manually.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPinIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Find Products Near You
          </h2>
          <p className="text-gray-600">
            Help us show you products from local artisans in your area
          </p>
        </div>

        {/* Location options */}
        <div className="space-y-4">
          {/* Auto-detect button */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <MapPinIcon className="w-5 h-5" />
            )}
            <span>
              {isLoading ? 'Getting your location...' : 'Use My Current Location'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* IP-based location option */}
          <button
            onClick={handleGetIPLocation}
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <GlobeAltIcon className="w-5 h-5" />
            )}
            <span>
              {isLoading ? 'Estimating location...' : 'Use My Approximate Location (IP-based)'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Manual input */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Enter your location
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Montreal, QC or 123 Main St, Toronto"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !location.trim()}
              className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Location'}
            </button>
          </form>

          {/* Skip option */}
          <button
            onClick={handleDismiss}
            className="w-full text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Skip for now
          </button>
        </div>

        {/* Location help section */}
        <details className="mt-4">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            Having trouble with location access?
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-2">
            <p><strong>Browser Settings:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click the lock/info icon in your address bar</li>
              <li>Set "Location" to "Allow"</li>
              <li>Refresh the page and try again</li>
            </ul>
            <p><strong>Device Settings:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Enable location services in your device settings</li>
              <li>Allow browser access to location</li>
            </ul>
            <p><strong>Alternative:</strong> Enter your address manually above</p>
          </div>
        </details>

        {/* Privacy note */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your location is stored locally and used only to show nearby products. 
          We don't share your location with third parties.
        </p>
      </div>
    </div>
  );
}
