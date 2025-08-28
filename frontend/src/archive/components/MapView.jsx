import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const MapView = ({ foodMakers = [], onMarkerClick, center = { lat: 45.5017, lng: -73.5673 } }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
        version: 'weekly',
        libraries: ['places']
      });

      try {
        const google = await loader.load();
        
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: center,
          zoom: 12,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(mapInstance);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    if (!map) {
      initMap();
    }
  }, [map, center]);

  useEffect(() => {
    if (!map || !foodMakers.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = foodMakers.map(maker => {
      const position = {
        lat: maker.latitude || center.lat + (Math.random() - 0.5) * 0.01,
        lng: maker.longitude || center.lng + (Math.random() - 0.5) * 0.01
      };

      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: maker.name,
        icon: {
          url: maker.type === 'individual' 
            ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="#f97316" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">👨‍🍳</text>
              </svg>
            `)
            : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="#059669" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🏪</text>
              </svg>
            `),
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 max-w-xs">
            <h3 class="font-semibold text-lg mb-1">${maker.name}</h3>
            <p class="text-sm text-gray-600 mb-2">${maker.cuisine} • ${maker.type === 'individual' ? 'Home Chef' : 'Restaurant'}</p>
            <div class="flex items-center mb-2">
              <span class="text-yellow-400">⭐</span>
              <span class="text-sm ml-1">${maker.rating}</span>
              <span class="text-sm text-gray-500 ml-2">${maker.deliveryTime}</span>
            </div>
            <div class="flex flex-wrap gap-1">
              ${maker.specialties?.slice(0, 2).map(specialty => 
                `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${specialty}</span>`
              ).join('') || ''}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (onMarkerClick) {
          onMarkerClick(maker);
        }
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [map, foodMakers, onMarkerClick]);

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default MapView;
