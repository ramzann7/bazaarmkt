import React, { useState, useEffect } from 'react';
import { MapPinIcon, PencilIcon } from '@heroicons/react/24/outline';
import { locationService } from '../services/locationService';
import LocationPrompt from './LocationPrompt';

export default function LocationIndicator({ onLocationUpdate }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = () => {
    const location = locationService.getUserLocation();
    setCurrentLocation(location);
  };

  const handleLocationSet = (locationData) => {
    setCurrentLocation(locationData);
    setShowLocationPrompt(false);
    if (onLocationUpdate) {
      onLocationUpdate(locationData);
    }
  };

  const handleLocationDismiss = () => {
    setShowLocationPrompt(false);
  };

  const handleUpdateLocation = () => {
    setShowLocationPrompt(true);
  };

  const getLocationDisplayText = () => {
    if (!currentLocation) {
      return 'Set your location';
    }

    const address = currentLocation.formattedAddress || currentLocation.address;
    if (address && address.length > 30) {
      return address.substring(0, 30) + '...';
    }
    return address || 'Location set';
  };

  const getLocationAgeText = () => {
    if (!currentLocation) return null;
    
    const ageInDays = locationService.getLocationAgeInDays();
    if (ageInDays === null) return null;
    
    if (ageInDays === 0) return 'Today';
    if (ageInDays === 1) return 'Yesterday';
    if (ageInDays < 7) return `${ageInDays} days ago`;
    if (ageInDays < 30) return `${Math.floor(ageInDays / 7)} weeks ago`;
    return `${Math.floor(ageInDays / 30)} months ago`;
  };

  if (!currentLocation) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={handleUpdateLocation}
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-orange-600 transition-colors"
        >
          <MapPinIcon className="w-4 h-4" />
          <span>Set your location</span>
        </button>
        
        {showLocationPrompt && (
          <LocationPrompt
            onLocationSet={handleLocationSet}
            onDismiss={handleLocationDismiss}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 text-sm text-gray-700">
        <MapPinIcon className="w-4 h-4 text-orange-500" />
        <span className="font-medium">{getLocationDisplayText()}</span>
        {getLocationAgeText() && (
          <span className="text-xs text-gray-500">({getLocationAgeText()})</span>
        )}
      </div>
      
      <button
        onClick={handleUpdateLocation}
        className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
        title="Update location"
      >
        <PencilIcon className="w-3 h-3" />
      </button>
      
      {showLocationPrompt && (
        <LocationPrompt
          onLocationSet={handleLocationSet}
          onDismiss={handleLocationDismiss}
        />
      )}
    </div>
  );
}
