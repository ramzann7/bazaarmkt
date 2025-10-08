# Community Create Post - Improvements Plan

**Date:** October 2, 2025  
**Status:** 📋 IMPLEMENTATION

## Improvements to Implement

### 1. ✅ Remove Category Field
- Not useful for community posts
- Adds unnecessary friction
- Auto-categorize based on post type

### 2. ✅ Enable Image Upload
- Allow artisans to upload photos
- Support multiple images (up to 4)
- Preview before posting
- Drag & drop support

### 3. ✅ Contextual Content Suggestions
Based on post type, provide helpful placeholders and tips:

**Story Posts:**
```
Placeholder: "Share your artisan journey, a special moment, or inspiration..."
Tips: 
  • Tell a personal story
  • Share what makes your craft special
  • Connect with your customers
```

**Recipe Posts:**
```
Placeholder: "Share your delicious recipe with the community..."
Tips:
  • Include measurements and timing
  • Share cooking tips and tricks
  • Mention dietary considerations
```

**Tips & Tricks:**
```
Placeholder: "Share a helpful tip or trick from your craft..."
Tips:
  • Keep it practical and actionable
  • Include step-by-step if needed
  • Share pro techniques
```

**Product Showcase:**
```
Placeholder: "Tell the story behind this product..."
Tips:
  • What makes it special?
  • How is it made?
  • Who would love this?
```

**Events:**
```
Placeholder: "Describe your event and what attendees can expect..."
Tips:
  • Include what to bring
  • Mention any requirements
  • Share event highlights
```

**Polls:**
```
Placeholder: "Ask your community a question..."
Tips:
  • Keep options clear and concise
  • Make it relevant to your craft
  • Engage your audience
```

### 4. ✅ Better Visual Design
- Larger modal on desktop
- Better spacing and typography
- Progress indicator for multi-step posts
- Character counter for title/content
- Required field indicators

### 5. ✅ Image Upload Implementation
```javascript
const [imageFiles, setImageFiles] = useState([]);
const [imagePreview, setImagePreviews] = useState([]);

const handleImageUpload = async (files) => {
  // Upload to Vercel Blob or backend
  // Show preview
  // Add to post.images array
};
```

## Implementation Details

### Files to Modify:
1. `frontend/src/components/Community.jsx`
   - Remove category dropdown
   - Add image upload section
   - Add contextual placeholders
   - Improve modal styling

### New Features:
- Image preview grid
- Drag & drop zone
- Delete uploaded images
- Image compression (client-side)
- Upload progress indicator

## Status: IMPLEMENTING

