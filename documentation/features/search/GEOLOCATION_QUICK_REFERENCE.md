# Geolocation System - Quick Reference

**Last Updated:** September 30, 2025

---

## 🎯 Quick Start

### For Artisans: Getting Coordinates

**Automatic:** When you update your address in your profile, coordinates are automatically geocoded.

**Manual Migration:** Run this command to geocode all existing artisans:
```bash
node backend/migrate-artisan-coordinates.js
```

---

## 📍 API Endpoints

### Geocode Address
```javascript
POST /api/geocoding/geocode
Body: { "address": "123 Main St, Toronto, ON" }
```

### Find Nearby Artisans
```javascript
GET /api/geocoding/nearby-artisans?latitude=43.6532&longitude=-79.3832&maxDistance=25
```

### Calculate Distance
```javascript
POST /api/geocoding/distance
Body: { "lat1": 45.5, "lon1": -73.5, "lat2": 43.6, "lon2": -79.3 }
```

---

## 🗃️ Database Structure

```javascript
// Artisan document
{
  artisanName: "My Shop",
  address: {
    street: "123 Main St",
    city: "Toronto",
    state: "ON",
    zipCode: "M5H 1T1"
  },
  coordinates: {
    latitude: 43.6532,
    longitude: -79.3832,
    confidence: 85,
    source: "nominatim",
    lastUpdated: Date
  }
}
```

---

## ✅ Quick Checks

### Check Artisan Coordinates
```bash
node backend/check-geolocation-db.js
```

### Test All Geocoding Features
```bash
# Ensure backend is running on port 4000
node backend/test-geocoding-endpoints.js
```

---

## 🔧 Common Tasks

### Add Coordinates to New Artisan
Just have them update their address - auto-geocodes!

### Re-geocode All Artisans
```bash
node backend/migrate-artisan-coordinates.js
```

### Find Artisans Missing Coordinates
```javascript
db.artisans.find({
  "coordinates.latitude": { $exists: false }
})
```

---

## 📊 Current Stats

- **Service:** Nominatim (OpenStreetMap)
- **Rate Limit:** 1 request/second
- **Accuracy:** ~75-95% confidence
- **Coverage:** 2/5 artisans (40%)

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No coordinates | Artisan needs valid address (street + city) |
| Geocoding fails | Check Nominatim service, verify address format |
| Wrong distance | Verify lat/lng order (latitude first!) |
| No nearby results | Run migration to add coordinates to artisans |

---

## 📚 Full Documentation

See `/documentation/GEOLOCATION_IMPLEMENTATION.md` for complete details.
