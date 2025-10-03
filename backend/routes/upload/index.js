const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure multer for memory storage
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

// Upload single image
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

    // In a real application, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll just return the processed image data
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
  } catch (error) {
    console.error('Upload image error:', error);
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

      const base64Image = processedImage.toString('base64');
      
      processedImages.push({
        filename,
        size: processedImage.length,
        type: mimetype,
        url: `data:${mimetype};base64,${base64Image}`
      });
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
