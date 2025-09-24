const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/authMiddleware');
// const blobStorage = require('../services/blobStorage');

// Configure multer for memory storage (for blob upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload product photo
router.post('/photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `image-${uniqueSuffix}${path.extname(req.file.originalname)}`;

    // Upload to Vercel Blob Storage
    const blobResult = await blobStorage.uploadFile(
      req.file.buffer,
      filename,
      req.file.mimetype
    );
    
    res.json({
      message: 'Photo uploaded successfully',
      url: blobResult.url,
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      blobPathname: blobResult.pathname
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ 
      message: 'Error uploading photo',
      error: error.message 
    });
  }
});

// Delete uploaded photo
router.delete('/photo/:url', verifyToken, async (req, res) => {
  try {
    const blobUrl = decodeURIComponent(req.params.url);
    
    const success = await blobStorage.deleteFile(blobUrl);
    
    if (success) {
      res.json({ message: 'Photo deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found or could not be deleted' });
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ 
      message: 'Error deleting photo',
      error: error.message 
    });
  }
});

// Get blob storage status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const status = blobStorage.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting blob status:', error);
    res.status(500).json({ 
      message: 'Error getting blob status',
      error: error.message 
    });
  }
});

module.exports = router;
