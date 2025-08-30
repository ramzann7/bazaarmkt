import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

const DistanceBadge = ({ distance, formattedDistance, showIcon = true }) => {
  if (!distance && !formattedDistance) {
    return null;
  }

  const getDistanceColor = (distance) => {
    if (!distance) return 'bg-gray-100 text-gray-600';
    
    if (distance <= 5) return 'bg-green-100 text-green-800 border-green-200';
    if (distance <= 15) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (distance <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getDistanceIcon = (distance) => {
    if (!distance) return '📍';
    
    if (distance <= 5) return '🏠';
    if (distance <= 15) return '🚶';
    if (distance <= 30) return '🚗';
    return '🚚';
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDistanceColor(distance)}`}>
      {showIcon && (
        <MapPinIcon className="w-3 h-3 mr-1" />
      )}
      <span className="mr-1">{getDistanceIcon(distance)}</span>
      <span>{formattedDistance || `${distance?.toFixed(1)}km`}</span>
    </div>
  );
};

export default DistanceBadge;
