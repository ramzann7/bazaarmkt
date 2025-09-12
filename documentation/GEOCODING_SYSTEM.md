# Geocoding System Documentation

## Overview

The geocoding system uses Nominatim (OpenStreetMap) to convert addresses to coordinates and calculate distances between artisans and patrons. This enables proximity-based search ranking and location-aware features.

## Features

### 🌍 Core Functionality
- **Address to Coordinates**: Convert street addresses to latitude/longitude
- **Reverse Geocoding**: Convert coordinates back to addresses
- **Distance Calculations**: Calculate distances using Haversine formula
- **Proximity Scoring**: Rank results based on distance
- **Rate Limiting**: Respect Nominatim's usage policy (1 request/second)
- **Caching**: 24-hour cache for geocoding results
- **Confidence Scoring**: Evaluate geocoding result quality

### 🎯 Search Integration
- **Distance-Based Ranking**: Products closer to user rank higher
- **Proximity Filters**: Filter artisans within specified radius
- **Distance Badges**: Visual indicators in product cards
- **Automatic Updates**: Coordinates updated when addresses change

## Architecture

### Backend Services

#### `backend/src/services/geocodingService.js`
```javascript
// Core geocoding functionality
class GeocodingService {
  async geocodeAddress(address) // Convert address to coordinates
  async reverseGeocode(lat, lng) // Convert coordinates to address
  calculateDistance(lat1, lon1, lat2, lon2) // Calculate distance
  formatAddress(addressComponents) // Format address for geocoding
  calculateConfidence(result) // Calculate confidence score
  rateLimit() // Respect rate limits
}
```

#### `backend/src/routes/geocoding.js`
```javascript
// API endpoints
POST /api/geocoding/geocode // Geocode an address
POST /api/geocoding/reverse-geocode // Reverse geocode
POST /api/geocoding/update-user-coordinates // Update user coordinates
GET /api/geocoding/user-coordinates // Get user coordinates
POST /api/geocoding/calculate-distance // Calculate distance
GET /api/geocoding/nearby-artisans // Get nearby artisans
POST /api/geocoding/batch-geocode // Batch geocode addresses
```

### Frontend Services

#### `frontend/src/services/geocodingService.js`
```javascript
// Frontend geocoding service
class GeocodingService {
  async geocodeAddress(address) // Convert address to coordinates
  async getUserCoordinates() // Get user's saved coordinates
  async saveUserCoordinates(coordinates) // Save coordinates to profile
  calculateDistanceBetween(coords1, coords2) // Calculate distance
  formatDistance(distance) // Format distance for display
}
```

### Database Schema

#### User Model Updates
```javascript
// Added to User schema
coordinates: {
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  lastUpdated: { type: Date, default: Date.now },
  confidence: { type: Number, min: 0, max: 100 }
}
```

## Usage Examples

### 1. Geocoding an Address
```javascript
import { geocodingService } from './services/geocodingService';

const address = '123 Queen Street, Toronto, ON, Canada';
const coordinates = await geocodingService.geocodeAddress(address);

console.log(coordinates);
// {
//   latitude: 43.6511085,
//   longitude: -79.3834744,
//   display_name: 'Sheraton Centre Toronto Hotel, 123, Queen Street West...',
//   confidence: 100
// }
```

### 2. Calculating Distance
```javascript
const distance = geocodingService.calculateDistance(
  43.6532, -79.3832, // Toronto
  45.5017, -73.5673  // Montreal
);
console.log(`${distance.toFixed(1)}km`); // 504.3km
```

### 3. Enhanced Search with Distance
```javascript
import { enhancedSearchService } from './services/enhancedSearchService';

const results = await enhancedSearchService.searchProducts('bread', {
  latitude: 43.6532,
  longitude: -79.3832
}, {
  maxDistance: 50 // 50km radius
});

// Results include distance information
results.products.forEach(product => {
  console.log(`${product.name}: ${product.formattedDistance}`);
});
```

### 4. Updating User Coordinates
```javascript
// Automatically happens when user updates address
await profileService.updateAddresses([
  {
    street: '123 Queen Street',
    city: 'Toronto',
    state: 'ON',
    zipCode: 'M5H 3M9',
    country: 'Canada',
    isDefault: true
  }
]);
```

## API Endpoints

### Geocoding Endpoints

#### `POST /api/geocoding/geocode`
Geocode an address to coordinates.

**Request:**
```json
{
  "address": "123 Queen Street, Toronto, ON, Canada"
}
```

**Response:**
```json
{
  "success": true,
  "coordinates": {
    "latitude": 43.6511085,
    "longitude": -79.3834744,
    "display_name": "Sheraton Centre Toronto Hotel...",
    "confidence": 100
  }
}
```

#### `GET /api/geocoding/nearby-artisans`
Find artisans within specified distance.

**Query Parameters:**
- `latitude`: User's latitude
- `longitude`: User's longitude
- `maxDistance`: Maximum distance in km (default: 50)

**Response:**
```json
{
  "success": true,
  "artisans": [
    {
      "artisan": { /* artisan data */ },
      "distance": 2.5,
      "formattedDistance": "2.5km"
    }
  ],
  "count": 5,
  "maxDistance": 50
}
```

### Enhanced Search Endpoints

#### `GET /api/products/enhanced-search`
Search products with distance-based ranking.

**Query Parameters:**
- `search`: Search query
- `userLat`: User's latitude
- `userLng`: User's longitude
- `proximityRadius`: Search radius in km
- `includeDistance`: Include distance information
- `enhancedRanking`: Enable enhanced ranking

**Response:**
```json
{
  "products": [
    {
      "name": "Artisan Bread",
      "price": 5.99,
      "distance": 2.3,
      "formattedDistance": "2.3km",
      "proximityScore": 0.95,
      "enhancedScore": 1250
    }
  ],
  "searchMetadata": {
    "query": "bread",
    "totalResults": 15,
    "userLocation": "available",
    "enhancedRanking": true
  }
}
```

## Distance Badge Component

### `frontend/src/components/DistanceBadge.jsx`
Visual component for displaying distance information.

**Features:**
- Color-coded by distance (green: ≤5km, blue: ≤15km, yellow: ≤30km, orange: >30km)
- Icons based on distance (🏠, 🚶, 🚗, 🚚)
- Formatted distance display

**Usage:**
```jsx
<DistanceBadge 
  distance={2.5} 
  formattedDistance="2.5km"
/>
```

## Configuration

### Rate Limiting
- **Nominatim**: 1 request per second
- **Cache Duration**: 24 hours for geocoding results
- **User Agent**: `bazaarMKT/1.0 (https://github.com/ramzann7/bazaarmkt)`

### Distance Calculations
- **Formula**: Haversine formula
- **Earth Radius**: 6,371 km
- **Units**: Kilometers
- **Precision**: 1 decimal place for display

### Search Ranking
- **Proximity Weight**: Up to 200 points
- **Scoring Formula**: `Math.exp(-distance / maxDistance)`
- **Default Radius**: 50km
- **Max Distance**: 100km

## Error Handling

### Common Errors
1. **Address Not Found**: Returns `null` with warning
2. **Rate Limit Exceeded**: Automatic retry with delay
3. **Invalid Coordinates**: Validation with error message
4. **Network Issues**: Graceful fallback

### Fallback Strategies
1. **Cached Results**: Use cached geocoding data
2. **Default Location**: Use city-level coordinates
3. **Manual Entry**: Allow user to enter coordinates
4. **Browser Geolocation**: Use device location as fallback

## Testing

### Test Scripts
- `scripts/testing/test-geocoding.js`: Comprehensive geocoding tests
- Manual testing with real addresses
- Distance calculation verification
- API endpoint testing

### Test Cases
1. **Address Geocoding**: Various address formats
2. **Distance Calculations**: Known city distances
3. **Search Integration**: Distance-based ranking
4. **Error Scenarios**: Invalid addresses, network issues
5. **Performance**: Rate limiting and caching

## Performance Considerations

### Optimization Strategies
1. **Caching**: 24-hour cache for geocoding results
2. **Rate Limiting**: Respect Nominatim's usage policy
3. **Batch Processing**: Multiple addresses in sequence
4. **Lazy Loading**: Geocode only when needed
5. **Background Updates**: Update coordinates asynchronously

### Monitoring
- Geocoding success rates
- Response times
- Cache hit rates
- Error frequencies
- Rate limit compliance

## Security & Privacy

### Data Protection
- **No Storage**: Raw addresses not stored permanently
- **Coordinates Only**: Only latitude/longitude saved
- **User Consent**: Optional location sharing
- **Anonymization**: No personal data in geocoding requests

### Rate Limiting
- **Respectful Usage**: Follow Nominatim's terms of service
- **User Agent**: Proper identification in requests
- **Error Handling**: Graceful degradation on limits

## Future Enhancements

### Planned Features
1. **Multiple Providers**: Fallback geocoding services
2. **Offline Support**: Local geocoding database
3. **Real-time Updates**: Live location tracking
4. **Advanced Filtering**: Multiple distance ranges
5. **Route Planning**: Delivery route optimization

### Integration Opportunities
1. **Maps Integration**: Interactive location display
2. **Delivery Tracking**: Real-time location updates
3. **Analytics**: Location-based insights
4. **Notifications**: Proximity-based alerts
5. **Social Features**: Nearby artisan discovery

## Troubleshooting

### Common Issues

#### Geocoding Fails
1. Check address format
2. Verify network connectivity
3. Check rate limiting
4. Review error logs

#### Distance Calculations Incorrect
1. Verify coordinate format
2. Check Haversine formula
3. Validate input data
4. Test with known distances

#### Search Ranking Issues
1. Check user coordinates
2. Verify proximity scoring
3. Review ranking weights
4. Test with sample data

### Debug Tools
- Browser console logging
- Network request monitoring
- Coordinate validation
- Distance calculation verification
- Cache inspection

## Support

For issues or questions about the geocoding system:
1. Check this documentation
2. Review error logs
3. Test with provided scripts
4. Contact development team

---

*Last updated: August 30, 2025*
