const { put, del, list } = require('@vercel/blob');

class BlobStorageService {
  constructor() {
    this.isEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;
  }

  /**
   * Upload a file to Vercel Blob Storage
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} contentType - MIME type
   * @returns {Promise<{url: string, pathname: string}>}
   */
  async uploadFile(buffer, filename, contentType) {
    if (!this.isEnabled) {
      throw new Error('Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.');
    }

    try {
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: contentType,
      });

      return {
        url: blob.url,
        pathname: blob.pathname,
        downloadUrl: blob.downloadUrl
      };
    } catch (error) {
      console.error('Error uploading to Vercel Blob:', error);
      throw new Error('Failed to upload file to blob storage');
    }
  }

  /**
   * Delete a file from Vercel Blob Storage
   * @param {string} url - Blob URL
   * @returns {Promise<boolean>}
   */
  async deleteFile(url) {
    if (!this.isEnabled) {
      throw new Error('Vercel Blob Storage is not configured');
    }

    try {
      await del(url);
      return true;
    } catch (error) {
      console.error('Error deleting from Vercel Blob:', error);
      return false;
    }
  }

  /**
   * List files in blob storage
   * @param {Object} options - List options
   * @returns {Promise<Array>}
   */
  async listFiles(options = {}) {
    if (!this.isEnabled) {
      throw new Error('Vercel Blob Storage is not configured');
    }

    try {
      const { blobs } = await list(options);
      return blobs;
    } catch (error) {
      console.error('Error listing files from Vercel Blob:', error);
      throw new Error('Failed to list files from blob storage');
    }
  }

  /**
   * Check if blob storage is enabled
   * @returns {boolean}
   */
  isBlobStorageEnabled() {
    return this.isEnabled;
  }

  /**
   * Get blob storage status
   * @returns {Object}
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      tokenConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
      environment: process.env.NODE_ENV
    };
  }
}

module.exports = new BlobStorageService();
