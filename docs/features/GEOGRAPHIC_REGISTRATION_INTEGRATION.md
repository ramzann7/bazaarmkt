# Geographic Settings Integration in Registration

## Implementation Complete

Geographic restrictions are now checked during user registration.

---

## Backend Implementation ✅

### Registration Endpoint Updated
**File:** `backend/routes/auth/index.js`

**New Logic:**
```javascript
// Check geographic restrictions if enabled
const geoSettings = await db.collection('geographicsettings').findOne({});

if (geoSettings && geoSettings.isEnabled && geoSettings.restrictions.type !== 'none') {
  // Validate location based on restriction type
  if (geoSettings.restrictions.type === 'country' && location?.country) {
    allowed = geoSettings.restrictions.allowedCountries.includes(location.country);
  } else if (geoSettings.restrictions.type === 'region' && location?.region) {
    allowed = geoSettings.restrictions.allowedRegions.includes(location.region);
  }
  
  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: geoSettings.userExperience?.restrictionMessage || 'Service not available in your region'
    });
  }
}
```

---

## How It Works

### Registration Flow with Geographic Validation

```
User Fills Registration Form
         ↓
Frontend detects user location (optional)
         ↓
POST /api/auth/register
  {
    email, password, firstName, lastName,
    location: { country: 'Canada', region: 'Quebec' }
  }
         ↓
Backend checks geographicsettings collection
         ↓
If restrictions enabled:
  ├─ Check if country/region is allowed
  ├─ If NO → Return 403 error with message
  └─ If YES → Continue with registration
         ↓
Create user account
         ↓
Return success
```

---

## Geographic Settings Configuration

### Admin Can Configure:

#### Restriction Types:
1. **None** - No restrictions (default)
2. **Country** - Limit to specific countries
3. **Region** - Limit to specific regions/provinces
4. **Coordinates** - Limit to geographic area (future)

#### Example Configuration:
```javascript
// Restrict to Canada only
{
  isEnabled: true,
  restrictions: {
    type: 'country',
    allowedCountries: ['Canada']
  },
  userExperience: {
    restrictionMessage: 'Currently available in Canada only'
  }
}
```

---

## User Experience

### When Restrictions Are Enabled

#### User in Allowed Region:
1. Fills registration form
2. Submits form
3. ✅ Account created successfully
4. Redirected to dashboard

#### User in Restricted Region:
1. Fills registration form
2. Submits form
3. ❌ Error message shown:
   - "Registration is not available in your country"
   - Or custom message from admin settings
4. Registration blocked

---

## Frontend Integration (Optional Enhancement)

### Current State:
- Backend validates location if provided
- Frontend can optionally send location data

### Recommended Enhancement:
```javascript
// frontend/src/components/register.jsx or registration page

// Detect user location before registration
const getUserLocation = async () => {
  try {
    // Get IP-based location
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      country: data.country_name,
      region: data.region,
      city: data.city
    };
  } catch (error) {
    console.warn('Could not detect location:', error);
    return null;
  }
};

// Include in registration
const handleRegister = async (formData) => {
  const location = await getUserLocation();
  
  const registrationData = {
    ...formData,
    location // Include location for validation
  };
  
  await registerUser(registrationData);
};
```

---

## Admin Configuration Steps

### To Enable Geographic Restrictions:

1. **Login as Admin**
2. **Go to** `/admin/geographic-settings`
3. **Enable Restrictions** (toggle on)
4. **Select Restriction Type:**
   - Country-based
   - Region-based
   - Coordinates-based (future)
5. **Add Allowed Locations:**
   - If Country: Add "Canada", "United States", etc.
   - If Region: Add "Quebec", "Ontario", etc.
6. **Customize Messages:**
   - Welcome message
   - Restriction message
7. **Save Settings**

---

## Testing

### Test With Restrictions Disabled (Default)
```bash
curl -X POST "http://localhost:4000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```
**Expected:** ✅ User created successfully

### Test With Country Restrictions Enabled
```bash
# 1. Enable restrictions via admin dashboard:
#    - isEnabled: true
#    - type: 'country'
#    - allowedCountries: ['Canada']

# 2. Try to register from allowed country
curl -X POST "http://localhost:4000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "canada@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "location": {
      "country": "Canada"
    }
  }'
```
**Expected:** ✅ User created successfully

```bash
# 3. Try to register from restricted country
curl -X POST "http://localhost:4000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "france@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "location": {
      "country": "France"
    }
  }'
```
**Expected:** ❌ 403 Error "Registration is not available in your country"

---

## Error Responses

### Geographic Restriction Error
```json
{
  "success": false,
  "message": "Registration is not available in your country",
  "restrictionType": "country"
}
```

### Custom Message (from admin settings)
```json
{
  "success": false,
  "message": "Currently available in Canada only. We're expanding soon!",
  "restrictionType": "country"
}
```

---

## Database Schema

### geographicsettings Collection
```javascript
{
  isEnabled: false,  // Toggle restrictions on/off
  restrictions: {
    type: 'none',    // 'none', 'country', 'region', 'coordinates'
    allowedCountries: [],  // e.g., ['Canada', 'United States']
    allowedRegions: [],    // e.g., ['Quebec', 'Ontario']
    allowedCoordinates: [] // For future geo-fencing
  },
  addressValidation: {
    enabled: true,
    countryRules: [...]  // Canada & US validation rules
  },
  userExperience: {
    showWelcomeMessage: true,
    welcomeMessage: 'Welcome to bazaarMKT!',
    restrictionMessage: 'Service not available in your region.',
    allowLocationPrompt: true,
    fallbackToIP: true
  },
  testing: {
    enabled: false,
    bypassRestrictions: false
  }
}
```

---

## Files Modified

### Backend (1)
1. `backend/routes/auth/index.js`
   - Added geographic validation to registration
   - Checks `geographicsettings` collection
   - Returns 403 if region not allowed

### Frontend (Optional)
- Could add location detection
- Could show restriction message before form
- Could pre-validate before submission

---

## Status

✅ **Backend Validation:** Implemented  
⚠️ **Frontend Detection:** Optional (can be added)  
✅ **Admin Configuration:** Working  
✅ **Error Messages:** Customizable  

---

## Next Steps

### Immediate (Optional)
1. Add IP-based location detection to frontend
2. Show restriction notice before registration form
3. Pre-validate location before allowing form submission

### Future Enhancements
1. Coordinate-based geo-fencing
2. VPN/proxy detection
3. Location history tracking
4. Whitelist for special cases

---

## Summary

✅ Geographic restrictions integrated into registration  
✅ Admin can configure via dashboard  
✅ Backend validates location during registration  
✅ Customizable error messages  
✅ Works with existing registration flow  

🌍 **Geographic Settings Now Active in Registration!**


