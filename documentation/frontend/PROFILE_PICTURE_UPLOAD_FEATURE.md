# 📸 Profile Picture Upload Feature - Implementation Guide

**Date:** October 9, 2025  
**Feature:** Single profile picture upload with avatar fallback  
**Storage:** Vercel Blob Storage  
**Status:** COMPLETE ✅

---

## 🎯 Feature Overview

**Functionality:**
- ✅ Users can upload ONE profile picture
- ✅ Image processed to 400x400px square
- ✅ Uploaded to Vercel Blob Storage
- ✅ URL saved to `users` collection in database
- ✅ If no picture exists, shows avatar icon (fallback)

---

## 📁 Files Created/Modified

### Backend (2 files modified)

1. **`/backend/routes/upload/index.js`** ✅
   - Added `/upload/profile-picture` POST endpoint
   - Processes image to 400x400px square
   - Uploads to Vercel Blob at `profiles/` path
   - Fallback to base64 for local development

2. **`/backend/routes/auth/index.js`** ✅
   - Modified `updateProfile` function
   - Now accepts `profilePicture` field
   - Saves URL to users collection

### Frontend (1 file created)

3. **`/frontend/src/components/ProfilePictureUpload.jsx`** ✅ NEW
   - Reusable profile picture upload component
   - Shows current picture OR avatar icon (fallback)
   - Click to change picture
   - Preview before upload
   - Progress indicator

---

## 🔧 How It Works

### Upload Flow

```
User clicks on profile picture
    ↓
File selector opens
    ↓
User selects image
    ↓
Preview modal shows
    ↓
User clicks "Upload"
    ↓
Image processed with Sharp (400x400)
    ↓
Uploaded to Vercel Blob (profiles/)
    ↓
Returns CDN URL
    ↓
Update user profile with URL
    ↓
Save to database (users collection)
    ↓
Picture displayed from Vercel Blob CDN
```

### Fallback Logic

```
Profile loads
    ↓
Check if user.profilePicture exists
    ↓
YES: Show image from Vercel Blob URL
NO:  Show UserIcon avatar (amber gradient)
```

---

## 💾 Database Schema

### Users Collection

```javascript
{
  _id: ObjectId("..."),
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "514-555-1234",
  role: "patron",
  // NEW FIELD:
  profilePicture: "https://blob.vercel-storage.com/profiles/profile-abc123.jpg",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**Field:** `profilePicture`  
**Type:** String (URL)  
**Optional:** Yes (defaults to null/undefined)  
**Fallback:** UserIcon avatar if not set

---

## 📡 API Endpoints

### 1. Upload Profile Picture

**Endpoint:** `POST /api/upload/profile-picture`

**Request:**
```javascript
// FormData
const formData = new FormData();
formData.append('profilePicture', imageBlob, 'profile.jpg');

// Headers
{
  'Content-Type': 'multipart/form-data',
  'Authorization': 'Bearer YOUR_TOKEN'
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "profile-abc123-photo.jpg",
    "size": 45678,
    "type": "image/jpeg",
    "url": "https://blob.vercel-storage.com/profiles/profile-abc123-photo.jpg",
    "profilePicture": "https://blob.vercel-storage.com/profiles/profile-abc123-photo.jpg"
  }
}
```

### 2. Update Profile (Save Picture URL)

**Endpoint:** `PUT /api/auth/profile`

**Request:**
```javascript
{
  "profilePicture": "https://blob.vercel-storage.com/profiles/profile-abc123.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "...",
      "firstName": "John",
      "profilePicture": "https://blob.vercel-storage.com/profiles/profile-abc123.jpg",
      ...
    }
  }
}
```

---

## 🎨 Component Usage

### In Profile or Account Component

```jsx
import ProfilePictureUpload from './ProfilePictureUpload';

function ProfileComponent() {
  const [user, setUser] = useState(null);

  const handleProfilePictureUpdate = (newPictureUrl) => {
    // Update local state
    setUser(prev => ({
      ...prev,
      profilePicture: newPictureUrl
    }));
    
    // Optionally refresh from server
    // refreshUserProfile();
  };

  return (
    <div>
      <ProfilePictureUpload
        currentPicture={user?.profilePicture}
        onUpdate={handleProfilePictureUpdate}
      />
      
      {/* Rest of profile */}
    </div>
  );
}
```

---

## 🎯 Component Features

### ProfilePictureUpload Component

**Props:**
- `currentPicture` (string) - Current profile picture URL (optional)
- `onUpdate` (function) - Callback when picture is updated
- `className` (string) - Additional CSS classes

**Display:**
- Shows 32x32 rounded profile picture OR UserIcon avatar
- Hover overlay with camera icon and "Change Photo" text
- Click anywhere on image to select new photo

**Upload Process:**
- File selector (images only, max 10MB)
- Preview modal with cancel/upload buttons
- Progress indicator during upload
- Success/error toast notifications
- Automatic profile refresh

**Fallback:**
- If `currentPicture` is null/undefined → Shows amber gradient with UserIcon
- If `currentPicture` fails to load → Shows fallback avatar

---

## 🔐 Security & Validation

### File Validation

**Frontend:**
- File type: Must be image/* (jpeg, png, gif, webp)
- File size: Max 10MB
- Shows error toast if invalid

**Backend:**
- Multer validates file type
- Sharp processes and optimizes
- Uploaded to secure Vercel Blob storage

### Image Processing

**Specifications:**
- Dimensions: 400x400px (square)
- Fit: Cover (centers and crops)
- Format: JPEG (optimized)
- Quality: 90% (high quality for faces)
- Progressive: Yes (better loading)

---

## 📊 Storage Details

### Vercel Blob Storage

**Path:** `profiles/profile-{uuid}-{filename}.jpg`

**Example URLs:**
```
https://blob.vercel-storage.com/profiles/profile-123e4567-e89b-photo.jpg
https://blob.vercel-storage.com/profiles/profile-987f6543-a21b-avatar.jpg
```

**Benefits:**
- ✅ CDN distribution (fast worldwide)
- ✅ Automatic HTTPS
- ✅ No filesystem needed
- ✅ Scales automatically
- ✅ Built-in caching

**Pricing:**
- Free tier: 1GB storage, 10GB bandwidth
- Sufficient for ~2,000-5,000 profile pictures

---

## 🧪 Testing Checklist

### Test Cases

- [ ] Upload profile picture as authenticated user
  - [ ] Click on avatar/picture area
  - [ ] Select image file
  - [ ] Preview shows correctly
  - [ ] Upload completes successfully
  - [ ] New picture displays immediately
  - [ ] URL saved to database

- [ ] Fallback behavior
  - [ ] New user with no picture shows UserIcon avatar
  - [ ] Gradient background displays
  - [ ] Hover shows "Change Photo"

- [ ] Validation
  - [ ] Reject non-image files
  - [ ] Reject files > 10MB
  - [ ] Show appropriate error messages

- [ ] Error handling
  - [ ] Network error shows toast
  - [ ] Upload failure doesn't crash
  - [ ] Can retry after error

---

## 🔍 Database Query Examples

### Get Users with Profile Pictures

```javascript
db.users.find(
  { profilePicture: { $exists: true, $ne: null } },
  { firstName: 1, lastName: 1, email: 1, profilePicture: 1 }
)
```

### Update Profile Picture Manually

```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { 
    $set: { 
      profilePicture: "https://blob.vercel-storage.com/profiles/profile-123.jpg",
      updatedAt: new Date()
    }
  }
)
```

### Remove Profile Picture

```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { 
    $unset: { profilePicture: "" },
    $set: { updatedAt: new Date() }
  }
)
```

---

## 📝 Usage Example

### Complete Implementation in Account.jsx

```jsx
import ProfilePictureUpload from './ProfilePictureUpload';

// Inside your Account component
<div className="flex items-center space-x-6 mb-6">
  {/* Profile Picture Upload */}
  <ProfilePictureUpload
    currentPicture={user?.profilePicture}
    onUpdate={(newUrl) => {
      setUser(prev => ({ ...prev, profilePicture: newUrl }));
      toast.success('Profile picture updated!');
    }}
  />
  
  {/* User Info */}
  <div>
    <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
    <p className="text-gray-600">{user.email}</p>
  </div>
</div>
```

---

## ⚙️ Environment Variables Required

### Backend

```bash
# Required for production
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Get from: Vercel Dashboard → Storage → Create Blob Store
```

### Frontend

No special environment variables needed - uses backend API.

---

## 🎨 Visual Behavior

### No Profile Picture (Default)
```
┌─────────────────┐
│                 │
│   ┌─────────┐   │
│   │         │   │
│   │  UserIcon
│   │         │   │
│   └─────────┘   │
│                 │
│ Amber Gradient  │
└─────────────────┘
```

### With Profile Picture
```
┌─────────────────┐
│                 │
│   User Photo    │
│   400x400px     │
│   Square Crop   │
│                 │
└─────────────────┘
  Hover: Camera Icon
  "Change Photo"
```

---

## ✅ Summary

**Feature Status:** COMPLETE ✅

**What It Does:**
- ONE profile picture per user
- Saved to Vercel Blob Storage
- URL stored in users collection
- Fallback to avatar icon if no picture
- Click to change/upload new picture

**Integration Points:**
- Backend: `/api/upload/profile-picture` endpoint
- Backend: Updated updateProfile in auth routes  
- Frontend: ProfilePictureUpload component
- Database: profilePicture field in users collection

**Ready to Use:** YES ✅

---

## 📖 Next Steps to Integrate

1. **Import component in Account.jsx or Profile.jsx:**
```jsx
import ProfilePictureUpload from './ProfilePictureUpload';
```

2. **Add to profile header:**
```jsx
<ProfilePictureUpload
  currentPicture={user?.profilePicture}
  onUpdate={(url) => {
    setUser(prev => ({ ...prev, profilePicture: url }));
  }}
/>
```

3. **Test locally** (with Blob token in .env)

4. **Deploy to Vercel** (with BLOB_READ_WRITE_TOKEN set)

---

**Created:** October 9, 2025  
**Type:** Single image upload with avatar fallback  
**Storage:** Vercel Blob  
**Status:** Ready for integration ✅


