/**
 * Vercel Blob Service
 * Handles file uploads to Vercel Blob storage for production
 */

const { put, del, list } = require('@vercel/blob');

class VercelBlobService {
  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!this.token) {
      console.warn('⚠️ BLOB_READ_WRITE_TOKEN not found. Vercel Blob functionality disabled.');
    }
  }

  /**
   * Upload a file to Vercel Blob
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} contentType - MIME type
   * @param {string} path - Path where to store the file (e.g., 'products/', 'profiles/')
   * @returns {Promise<Object>} - Upload result with URL
   */
  async uploadFile(buffer, filename, contentType, path = 'uploads/') {
    if (!this.token) {
      throw new Error('Vercel Blob token not configured');
    }

    try {
      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${filename}`;
      const fullPath = `${path}${uniqueFilename}`;

      const blob = await put(fullPath, buffer, {
        access: 'public',
        token: this.token,
        contentType: contentType,
        addRandomSuffix: false // We're already adding our own suffix
      });

      console.log(`✅ File uploaded to Vercel Blob: ${blob.url}`);
      
      return {
        success: true,
        url: blob.url,
        filename: uniqueFilename,
        path: fullPath,
        size: buffer.length,
        contentType: contentType
      };
    } catch (error) {
      console.error('❌ Vercel Blob upload error:', error);
      throw new Error(`Failed to upload to Vercel Blob: ${error.message}`);
    }
  }

  /**
   * Delete a file from Vercel Blob
   * @param {string} url - The blob URL to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteFile(url) {
    if (!this.token) {
      throw new Error('Vercel Blob token not configured');
    }

    try {
      await del(url, {
        token: this.token
      });

      console.log(`✅ File deleted from Vercel Blob: ${url}`);
      
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('❌ Vercel Blob deletion error:', error);
      throw new Error(`Failed to delete from Vercel Blob: ${error.message}`);
    }
  }

  /**
   * List files in a directory
   * @param {string} prefix - Directory prefix (e.g., 'uploads/products/')
   * @returns {Promise<Object>} - List of files
   */
  async listFiles(prefix = 'uploads/') {
    if (!this.token) {
      throw new Error('Vercel Blob token not configured');
    }

    try {
      const { blobs } = await list({
        prefix: prefix,
        token: this.token,
        limit: 1000
      });

      return {
        success: true,
        files: blobs,
        count: blobs.length
      };
    } catch (error) {
      console.error('❌ Vercel Blob list error:', error);
      throw new Error(`Failed to list files from Vercel Blob: ${error.message}`);
    }
  }

  /**
   * Check if Vercel Blob is available
   * @returns {boolean} - True if Vercel Blob is configured and available
   */
  isAvailable() {
    return !!this.token;
  }

  /**
   * Get the base URL for Vercel Blob
   * @returns {string} - Base URL for Vercel Blob
   */
  getBaseUrl() {
    // Extract domain from token if possible, or use default
    return 'https://blob.vercel-storage.com';
  }

  /**
   * Convert local file path to Vercel Blob URL
   * @param {string} localPath - Local file path (e.g., '/uploads/products/image.jpg')
   * @returns {string} - Vercel Blob URL
   */
  convertLocalPathToBlobUrl(localPath) {
    if (!localPath) return null;
    
    // Remove leading slash and convert to blob format
    const cleanPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
    return `https://blob.vercel-storage.com/${cleanPath}`;
  }
}

// Create singleton instance
const vercelBlobService = new VercelBlobService();

module.exports = vercelBlobService;
