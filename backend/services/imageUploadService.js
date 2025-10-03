/**
 * Image Upload Service
 * Combines image optimization + Vercel Blob storage for production-ready image handling
 */

const imageOptimizationService = require('./imageOptimizationService');
const vercelBlobService = require('./vercelBlobService');

class ImageUploadService {
  /**
   * Process and upload a profile image
   * @param {string|Buffer} imageInput - Base64 string or Buffer
   * @param {string} filename - Original filename (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadProfileImage(imageInput, filename = 'profile.jpg', options = {}) {
    try {
      console.log('📸 Processing profile image...');
      
      // Step 1: Optimize the image
      const optimizedBase64 = await imageOptimizationService.optimizeProfileImage(imageInput, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 80,
        ...options
      });
      
      // Step 2: Convert base64 to buffer
      const base64Data = optimizedBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Step 3: Upload to Vercel Blob
      const result = await vercelBlobService.uploadFile(
        buffer,
        filename,
        'image/jpeg',
        'profiles/'
      );
      
      console.log(`✅ Profile image uploaded: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.error('❌ Profile image upload failed:', error);
      throw error;
    }
  }

  /**
   * Process and upload a business image
   * @param {string|Buffer} imageInput - Base64 string or Buffer
   * @param {string} filename - Original filename (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadBusinessImage(imageInput, filename = 'business.jpg', options = {}) {
    try {
      console.log('📸 Processing business image...');
      
      // Step 1: Optimize the image
      const optimizedBase64 = await imageOptimizationService.optimizeBusinessImage(imageInput, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        ...options
      });
      
      // Step 2: Convert base64 to buffer
      const base64Data = optimizedBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Step 3: Upload to Vercel Blob
      const result = await vercelBlobService.uploadFile(
        buffer,
        filename,
        'image/jpeg',
        'businesses/'
      );
      
      console.log(`✅ Business image uploaded: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.error('❌ Business image upload failed:', error);
      throw error;
    }
  }

  /**
   * Process and upload a product image
   * @param {string|Buffer} imageInput - Base64 string or Buffer
   * @param {string} filename - Original filename (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadProductImage(imageInput, filename = 'product.jpg', options = {}) {
    try {
      console.log('📸 Processing product image...');
      
      // Step 1: Optimize the image
      const optimizedBase64 = await imageOptimizationService.optimizeProductImage(imageInput, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 85,
        ...options
      });
      
      // Step 2: Convert base64 to buffer
      const base64Data = optimizedBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Step 3: Upload to Vercel Blob
      const result = await vercelBlobService.uploadFile(
        buffer,
        filename,
        'image/jpeg',
        'products/'
      );
      
      console.log(`✅ Product image uploaded: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.error('❌ Product image upload failed:', error);
      throw error;
    }
  }

  /**
   * Process and upload a community post image
   * @param {string|Buffer} imageInput - Base64 string or Buffer
   * @param {string} filename - Original filename (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadCommunityImage(imageInput, filename = 'post.jpg', options = {}) {
    try {
      console.log('📸 Processing community image...');
      
      // Step 1: Optimize the image
      const optimizedBase64 = await imageOptimizationService.optimizeProductImage(imageInput, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        ...options
      });
      
      // Step 2: Convert base64 to buffer
      const base64Data = optimizedBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Step 3: Upload to Vercel Blob
      const result = await vercelBlobService.uploadFile(
        buffer,
        filename,
        'image/jpeg',
        'community/'
      );
      
      console.log(`✅ Community image uploaded: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.error('❌ Community image upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Vercel Blob
   * @param {string} url - Image URL to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteImage(url) {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid image URL');
      }
      
      // Only delete if it's a Vercel Blob URL
      if (url.includes('blob.vercel-storage.com') || url.includes('vercel-storage.com')) {
        return await vercelBlobService.deleteFile(url);
      } else {
        console.log('⚠️ Not a Vercel Blob URL, skipping deletion:', url);
        return { success: true, message: 'Not a Vercel Blob URL' };
      }
    } catch (error) {
      console.error('❌ Image deletion failed:', error);
      throw error;
    }
  }

  /**
   * Check if Vercel Blob is available
   * @returns {boolean}
   */
  isAvailable() {
    return vercelBlobService.isAvailable();
  }

  /**
   * Handle image upload with fallback to base64 if Vercel Blob unavailable
   * @param {string} imageInput - Base64 image data
   * @param {string} type - Image type (profile, business, product, community)
   * @param {string} filename - Original filename
   * @returns {Promise<string>} - URL or base64 string
   */
  async handleImageUpload(imageInput, type = 'business', filename = 'image.jpg') {
    try {
      // If Vercel Blob is not available, return optimized base64
      if (!this.isAvailable()) {
        console.warn('⚠️ Vercel Blob not available, storing optimized base64');
        switch (type) {
          case 'profile':
            return await imageOptimizationService.optimizeProfileImage(imageInput);
          case 'business':
            return await imageOptimizationService.optimizeBusinessImage(imageInput);
          case 'product':
            return await imageOptimizationService.optimizeProductImage(imageInput);
          case 'community':
            return await imageOptimizationService.optimizeProductImage(imageInput);
          default:
            return await imageOptimizationService.optimizeBusinessImage(imageInput);
        }
      }

      // Upload to Vercel Blob
      switch (type) {
        case 'profile':
          return await this.uploadProfileImage(imageInput, filename);
        case 'business':
          return await this.uploadBusinessImage(imageInput, filename);
        case 'product':
          return await this.uploadProductImage(imageInput, filename);
        case 'community':
          return await this.uploadCommunityImage(imageInput, filename);
        default:
          return await this.uploadBusinessImage(imageInput, filename);
      }
    } catch (error) {
      console.error('❌ Image upload error:', error);
      // Fallback to optimized base64 on error
      console.warn('⚠️ Falling back to optimized base64');
      return await imageOptimizationService.optimizeBusinessImage(imageInput);
    }
  }
}

// Create singleton instance
const imageUploadService = new ImageUploadService();

module.exports = imageUploadService;

