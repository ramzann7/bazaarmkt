/**
 * File Service - Microservices Foundation
 * Handles file uploads, image processing, and file storage management
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class FileService {
  constructor() {
    this.serviceName = 'file-service';
    this.version = '1.0.0';
    this.isInitialized = false;
    this.uploadPath = process.env.UPLOAD_PATH || './public/uploads';
  }

  /**
   * Initialize File Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ File Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 File Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ File Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ File Service database connected');

      await CacheService.healthCheck();
      console.log('✅ File Service cache connected');

      // Ensure upload directory exists
      await this.ensureUploadDirectory();

      this.isInitialized = true;
      console.log('✅ File Service initialized successfully');
    } catch (error) {
      console.error('❌ File Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      console.log(`✅ Upload directory ensured: ${this.uploadPath}`);
    } catch (error) {
      console.error('❌ Failed to create upload directory:', error);
      throw error;
    }
  }

  /**
   * Configure multer for file uploads
   */
  configureMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const fileFilter = (req, file, cb) => {
      // Allow images and documents
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and documents are allowed.'));
      }
    };

    return multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: fileFilter
    });
  }

  /**
   * Upload single file
   */
  async uploadFile(file, metadata = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const filesCollection = db.collection('files');
      
      const fileRecord = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
        metadata: metadata,
        uploadedAt: new Date(),
        status: 'active'
      };
      
      const result = await filesCollection.insertOne(fileRecord);
      await client.close();
      
      return {
        success: true,
        fileId: result.insertedId,
        file: fileRecord
      };
    } catch (error) {
      console.error('File Service - Upload file error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files, metadata = {}) {
    try {
      const results = [];
      
      for (const file of files) {
        const result = await this.uploadFile(file, metadata);
        results.push(result);
      }
      
      return {
        success: true,
        files: results,
        count: results.length
      };
    } catch (error) {
      console.error('File Service - Upload files error:', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const filesCollection = db.collection('files');
      
      const file = await filesCollection.findOne({ 
        _id: new ObjectId(fileId),
        status: 'active'
      });
      
      await client.close();
      
      if (!file) {
        throw new Error('File not found');
      }
      
      return {
        success: true,
        file: file
      };
    } catch (error) {
      console.error('File Service - Get file error:', error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const filesCollection = db.collection('files');
      
      // Get file record first
      const file = await filesCollection.findOne({ 
        _id: new ObjectId(fileId),
        status: 'active'
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Delete physical file
      try {
        await fs.unlink(file.path);
      } catch (fsError) {
        console.warn('Physical file not found, continuing with database deletion');
      }
      
      // Mark as deleted in database
      await filesCollection.updateOne(
        { _id: new ObjectId(fileId) },
        { $set: { status: 'deleted', deletedAt: new Date() } }
      );
      
      await client.close();
      
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('File Service - Delete file error:', error);
      throw error;
    }
  }

  /**
   * Get files by metadata
   */
  async getFilesByMetadata(metadata, limit = 50) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const filesCollection = db.collection('files');
      
      const query = { status: 'active' };
      
      // Add metadata filters
      Object.keys(metadata).forEach(key => {
        query[`metadata.${key}`] = metadata[key];
      });
      
      const files = await filesCollection.find(query)
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .toArray();
      
      await client.close();
      
      return {
        success: true,
        files: files,
        count: files.length
      };
    } catch (error) {
      console.error('File Service - Get files by metadata error:', error);
      throw error;
    }
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(daysOld = 30) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const filesCollection = db.collection('files');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // Find old files
      const oldFiles = await filesCollection.find({
        status: 'active',
        uploadedAt: { $lt: cutoffDate }
      }).toArray();
      
      let deletedCount = 0;
      
      for (const file of oldFiles) {
        try {
          // Delete physical file
          await fs.unlink(file.path);
          
          // Mark as deleted in database
          await filesCollection.updateOne(
            { _id: file._id },
            { $set: { status: 'deleted', deletedAt: new Date() } }
          );
          
          deletedCount++;
        } catch (error) {
          console.warn(`Failed to delete file ${file.filename}:`, error.message);
        }
      }
      
      await client.close();
      
      return {
        success: true,
        deletedCount: deletedCount,
        message: `Cleaned up ${deletedCount} old files`
      };
    } catch (error) {
      console.error('File Service - Cleanup old files error:', error);
      throw error;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStatistics() {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const filesCollection = db.collection('files');
      
      const stats = await filesCollection.aggregate([
        { $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          averageSize: { $avg: '$size' }
        }}
      ]).toArray();
      
      const typeStats = await filesCollection.aggregate([
        { $group: {
          _id: '$mimetype',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }},
        { $sort: { count: -1 } }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        statistics: stats[0] || { totalFiles: 0, totalSize: 0, averageSize: 0 },
        typeBreakdown: typeStats
      };
    } catch (error) {
      console.error('File Service - Get file statistics error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        service: this.serviceName,
        status: 'healthy',
        version: this.version,
        initialized: this.isInitialized,
        uploadPath: this.uploadPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.serviceName,
      version: this.version,
      initialized: this.isInitialized,
      endpoints: [
        'POST /api/files/upload',
        'GET /api/files/:id',
        'DELETE /api/files/:id',
        'GET /api/files/metadata',
        'POST /api/files/cleanup',
        'GET /api/files/statistics'
      ]
    };
  }
}

module.exports = new FileService();
