# Automatic Address Geocoding

## Overview

The platform now automatically geocodes addresses when they are created or updated, ensuring that all addresses have accurate latitude/longitude coordinates for delivery distance calculations, map displays, and location-based features.

---

## When Geocoding Happens

### ✅ Automatic Geocoding Triggers

1. **Artisan Profile Updates** (`PUT /api/profile/artisan`)
   - When an artisan updates their business address
   - Coordinates are added to both `artisans` and `users` collections

2. **User Address Updates** (`PUT /api/profile/addresses`)
   - When a user (patron/artisan) updates their addresses list
   - All addresses with a `street` field are geocoded

3. **Adding New Address** (`POST /api/profile/addresses`)
   - When a user adds a new address
   - Address is geocoded before being added to the database

---

## Implementation Details

### Backend Service: `geocodingService.js`

Located at: `backend/services/geocodingService.js`

**Features:**
- Uses OpenStreetMap's Nominatim API
- Rate limiting (1 second between requests)
- Confidence scoring for results
- Reverse geocoding capability
- Error handling (non-blocking - updates continue even if geocoding fails)

**Methods:**
```javascript
geocodeAddress(address)      // Address → Coordinates
reverseGeocode(lat, lng)     // Coordinates → Address
calculateConfidence(result)  // Quality score 0-100
```

---

## Data Structure

### Input (Address Object)
```javascript
{
  street: "3444 Rue Mance",
  city: "Saint-Hubert",
  state: "Quebec",         // or "province"
  zipCode: "J4T 2J7",     // or "postalCode"
  country: "Canada"
}
```

### Output (Geocoded Address)
```javascript
{
  street: "3444 Rue Mance",
  city: "Saint-Hubert",
  state: "Quebec",
  zipCode: "J4T 2J7",
  country: "Canada",
  latitude: 45.4935233,           // ← Added by geocoding
  longitude: -73.4761212,         // ← Added by geocoding
  geocodedAt: Date,               // ← Timestamp
  geocodedFrom: "3444, Rue Mance, Saint-Hubert..." // ← Full location name
}
```

---

## Database Collections Updated

### 1. `artisans` Collection
When artisan updates their profile:
```javascript
{
  _id: ObjectId,
  artisanName: "...",
  address: {
    street: "...",
    city: "...",
    latitude: 45.4935233,    // ← Added
    longitude: -73.4761212   // ← Added
  },
  coordinates: {              // ← Top-level coordinates
    latitude: 45.4935233,
    longitude: -73.4761212
  },
  geocodedAt: Date,
  geocodedFrom: "..."
}
```

### 2. `users` Collection

**For Artisans:**
```javascript
{
  _id: ObjectId,
  role: "artisan",
  coordinates: {              // ← Synced from artisan address
    latitude: 45.4935233,
    longitude: -73.4761212
  },
  address: {
    latitude: 45.4935233,
    longitude: -73.4761212
  }
}
```

**For Patrons:**
```javascript
{
  _id: ObjectId,
  role: "patron",
  addresses: [
    {
      type: "home",
      street: "...",
      city: "...",
      latitude: 45.5370591,   // ← Added to each address
      longitude: -73.5504495, // ← Added to each address
      geocodedAt: Date,
      geocodedFrom: "..."
    },
    // ... more addresses
  ]
}
```

---

## Frontend Integration

### Cart Component (`Cart.jsx`)

**Priority Order for Artisan Coordinates:**
```javascript
const artisanLat = artisanData.artisan?.coordinates?.latitude || 
                   artisanData.artisan?.address?.latitude || 
                   artisanData.artisan?.address?.lat;
```

**Benefits:**
- ✅ Accurate delivery distance calculations
- ✅ Personal delivery radius validation
- ✅ Uber Direct quote location accuracy
- ✅ Correct pickup location display

### Cart Service (`cartService.js`)

**Fetches fresh artisan data:**
```javascript
fetchArtisanProfile(artisanId)
// Returns artisan with coordinates from database
```

---

## Rate Limiting & Best Practices

### Nominatim Usage Policy Compliance

1. **Rate Limiting**: 1 second between requests
2. **User Agent**: Proper identification
3. **Caching**: Frontend caches geocoded results
4. **Non-blocking**: Geocoding failures don't block updates

### Error Handling

```javascript
try {
  const coordinates = await geocodingService.geocodeAddress(address);
  if (coordinates) {
    // Add coordinates
  } else {
    console.log('⚠️ Could not geocode address');
    // Continue with update anyway
  }
} catch (error) {
  console.error('❌ Geocoding failed:', error);
  // Continue with update anyway
}
```

---

## Testing & Validation

### Manual Geocoding Script

For bulk geocoding existing addresses:
```bash
cd backend
node scripts/geocode-all-artisans.js
```

### Verification

1. **Update artisan address** in profile
2. **Check database** for coordinates:
   ```javascript
   // In MongoDB
   db.artisans.findOne({ _id: ObjectId("...") })
   // Should have coordinates.latitude and coordinates.longitude
   ```
3. **Frontend check**: Distances calculate correctly in cart

---

## API Endpoints Updated

### 1. Update Artisan Profile
```
PUT /api/profile/artisan
```
**Body:**
```json
{
  "address": {
    "street": "3444 Rue Mance",
    "city": "Saint-Hubert",
    "state": "Quebec",
    "zipCode": "J4T 2J7"
  }
}
```

**Response includes coordinates:**
```json
{
  "success": true,
  "data": {
    "user": {
      "artisan": {
        "address": {
          "street": "3444 Rue Mance",
          "city": "Saint-Hubert",
          "latitude": 45.4935233,
          "longitude": -73.4761212
        },
        "coordinates": {
          "latitude": 45.4935233,
          "longitude": -73.4761212
        }
      }
    }
  }
}
```

### 2. Update User Addresses
```
PUT /api/profile/addresses
```
**Body:**
```json
{
  "addresses": [
    {
      "type": "home",
      "street": "2020 Rue Florian",
      "city": "Montreal",
      "state": "Quebec",
      "zipCode": "H2K 3K2"
    }
  ]
}
```

**Each address will be geocoded automatically**

### 3. Add Single Address
```
POST /api/profile/addresses
```
**Body:**
```json
{
  "address": {
    "type": "work",
    "street": "...",
    "city": "..."
  }
}
```

**Address will be geocoded before insertion**

---

## Confidence Scoring

The geocoding service calculates a confidence score (0-100) based on:

- **Base**: 50 points
- **Place Type**:
  - House/Building: +30
  - Street/Residential: +20
  - City/Town: +10
- **Address Components**:
  - House number: +10
  - Road name: +5
  - Postal code: +5

**Only results with ≥60% confidence are cached on frontend**

---

## Monitoring & Logs

### Success Logs
```
🌍 Geocoding address: 3444 Rue Mance, Saint-Hubert, Quebec, Canada
✅ Geocoded successfully: 45.4935233, -73.4761212
   Location: 3444, Rue Mance, Saint-Hubert, Longueuil...
✅ Synced coordinates to users collection
```

### Warning Logs
```
⚠️ Geocoding skipped: No valid address
⚠️ No geocoding results for: [address]
⚠️ Could not geocode address, coordinates not added
```

### Error Logs
```
❌ Geocoding failed: [error message]
❌ Failed to geocode address: [street]
```

---

## Benefits

### For Platform
- ✅ Accurate delivery distance calculations
- ✅ Better location-based features
- ✅ Improved user experience
- ✅ Map integrations work correctly
- ✅ Uber Direct API gets accurate coordinates

### For Users
- ✅ Correct delivery radius validation
- ✅ Accurate delivery fee calculations
- ✅ Better pickup location display
- ✅ Location-based search (future feature)

### For Developers
- ✅ Automatic - no manual geocoding needed
- ✅ Non-blocking - failures don't stop updates
- ✅ Rate-limited - complies with API policies
- ✅ Cached - efficient performance

---

## Future Enhancements

1. **Geocoding Cache Service**: Store results in database to reduce API calls
2. **Address Validation**: Warn users about invalid/incomplete addresses
3. **Multiple Providers**: Fallback to Google Maps if Nominatim fails
4. **Batch Geocoding**: Queue system for bulk operations
5. **Location Search**: Use coordinates for "near me" features

---

## Related Files

### Backend
- `backend/services/geocodingService.js` - Main geocoding service
- `backend/routes/profile/index.js` - Profile update handlers with geocoding
- `backend/utils/artisanSchemaUtils.js` - Schema normalization

### Frontend
- `frontend/src/components/Cart.jsx` - Uses coordinates for delivery
- `frontend/src/services/cartService.js` - Fetches artisan coordinates
- `frontend/src/services/geocodingService.js` - Frontend geocoding (for validation)

---

## Summary

All addresses are now automatically geocoded when created or updated, ensuring the platform has accurate coordinates for delivery calculations, map displays, and location-based features. The implementation is robust, non-blocking, and complies with geocoding API usage policies.

**Status**: ✅ Fully Implemented & Production Ready

