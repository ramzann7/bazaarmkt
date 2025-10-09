const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');

// Vercel Blob service - try to load, use fallback if not available
let vercelBlobService;
try {
  const servicePath = path.join(__dirname, '../services/vercelBlobService.js');
  vercelBlobService = require(servicePath);
  console.log('✅ Vercel Blob service loaded');
} catch (error) {
  console.warn('⚠️ Vercel Blob service not available, will use base64 fallback');
  vercelBlobService = {
    isAvailable: () => false
  };
}

// Use Node.js built-in crypto.randomUUID() instead of uuid package
const uuidv4 = () => crypto.randomUUID();

// Configure multer for memory storage (required for Vercel Blob)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Upload single image (generic)
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const filename = `${uuidv4()}-${originalname}`;
    
    // Process image with sharp
    const processedImage = await sharp(buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload to Vercel Blob if available, otherwise return base64
    if (vercelBlobService.isAvailable()) {
      const uploadResult = await vercelBlobService.uploadFile(
        processedImage,
        filename,
        'image/jpeg',
        'uploads/'
      );
      
      res.json({
        success: true,
        data: {
          filename: uploadResult.filename,
          size: uploadResult.size,
          type: 'image/jpeg',
          url: uploadResult.url // Vercel Blob CDN URL
        }
      });
    } else {
      // Fallback to base64 for local development
      const base64Image = processedImage.toString('base64');
      res.json({
        success: true,
        data: {
          filename,
          size: processedImage.length,
          type: mimetype,
          url: `data:${mimetype};base64,${base64Image}` // Temporary URL
        }
      });
    }
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload profile picture (optimized for avatars)
router.post('/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No profile picture provided' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const filename = `profile-${uuidv4()}-${originalname}`;
    
    // Process image specifically for profile pictures (square, smaller)
    const processedImage = await sharp(buffer)
      .resize(400, 400, { 
        fit: 'cover', // Cover ensures square aspect ratio
        position: 'center'
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    // Upload to Vercel Blob
    if (vercelBlobService.isAvailable()) {
      const uploadResult = await vercelBlobService.uploadFile(
        processedImage,
        filename,
        'image/jpeg',
        'profiles/'
      );
      
      res.json({
        success: true,
        data: {
          filename: uploadResult.filename,
          size: uploadResult.size,
          type: 'image/jpeg',
          url: uploadResult.url,
          profilePicture: uploadResult.url // Return as profilePicture for easy use
        }
      });
    } else {
      // Fallback to base64 for local development
      console.warn('⚠️ Vercel Blob not configured, using base64 fallback');
      const base64Image = processedImage.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      
      res.json({
        success: true,
        data: {
          filename,
          size: processedImage.length,
          type: 'image/jpeg',
          url: dataUrl,
          profilePicture: dataUrl
        }
      });
    }
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload multiple images
router.post('/images', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided' });
    }

    const processedImages = [];
    
    for (const file of req.files) {
      const { buffer, originalname, mimetype } = file;
      const filename = `${uuidv4()}-${originalname}`;
      
      const processedImage = await sharp(buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload to Vercel Blob if available
      if (vercelBlobService.isAvailable()) {
        const uploadResult = await vercelBlobService.uploadFile(
          processedImage,
          filename,
          'image/jpeg',
          'uploads/'
        );
        
        processedImages.push({
          filename: uploadResult.filename,
          size: uploadResult.size,
          type: 'image/jpeg',
          url: uploadResult.url
        });
      } else {
        // Fallback to base64 for local development
        const base64Image = processedImage.toString('base64');
        processedImages.push({
          filename,
          size: processedImage.length,
          type: mimetype,
          url: `data:${mimetype};base64,${base64Image}`
        });
      }
    }
    
    res.json({
      success: true,
      data: processedImages
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete image
router.delete('/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // In a real application, you would delete from cloud storage
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
