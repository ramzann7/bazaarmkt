const sharp = require('sharp');

/**
 * Image Optimization Service
 * Compresses and resizes images to reduce storage and bandwidth
 */

/**
 * Optimize image for avatar/profile use
 * @param {Buffer|string} imageInput - Buffer or base64 string
 * @param {Object} options - Optimization options
 * @returns {Promise<string>} - Optimized base64 string
 */
async function optimizeProfileImage(imageInput, options = {}) {
  try {
    const {
      maxWidth = 400,        // Max width for profile images
      maxHeight = 400,       // Max height for profile images
      quality = 80,          // JPEG quality (1-100)
      format = 'jpeg'        // Output format
    } = options;

    // Convert base64 to buffer if needed
    let buffer;
    if (typeof imageInput === 'string') {
      // Remove data URL prefix if present
      const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = imageInput;
    }

    // Optimize with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',           // Maintain aspect ratio
        withoutEnlargement: true // Don't upscale smaller images
      })
      .jpeg({ 
        quality,
        progressive: true,       // Progressive JPEG
        mozjpeg: true           // Use mozjpeg for better compression
      })
      .toBuffer();

    // Convert back to base64
    const base64 = optimizedBuffer.toString('base64');
    const dataURL = `data:image/${format};base64,${base64}`;

    console.log(`📸 Image optimized: ${buffer.length} bytes → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length/buffer.length) * 100)}% reduction)`);

    return dataURL;
  } catch (error) {
    console.error('❌ Image optimization error:', error);
    throw error;
  }
}

/**
 * Optimize business/product image
 * @param {Buffer|string} imageInput - Buffer or base64 string
 * @param {Object} options - Optimization options
 * @returns {Promise<string>} - Optimized base64 string
 */
async function optimizeBusinessImage(imageInput, options = {}) {
  try {
    const {
      maxWidth = 800,        // Max width for business images
      maxHeight = 800,       // Max height for business images
      quality = 85,          // Slightly higher quality for business
      format = 'jpeg'
    } = options;

    // Convert base64 to buffer if needed
    let buffer;
    if (typeof imageInput === 'string') {
      const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = imageInput;
    }

    // Optimize with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    const base64 = optimizedBuffer.toString('base64');
    const dataURL = `data:image/${format};base64,${base64}`;

    console.log(`📸 Business image optimized: ${buffer.length} bytes → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length/buffer.length) * 100)}% reduction)`);

    return dataURL;
  } catch (error) {
    console.error('❌ Business image optimization error:', error);
    throw error;
  }
}

/**
 * Optimize product image
 * @param {Buffer|string} imageInput - Buffer or base64 string
 * @param {Object} options - Optimization options
 * @returns {Promise<string>} - Optimized base64 string
 */
async function optimizeProductImage(imageInput, options = {}) {
  try {
    const {
      maxWidth = 600,
      maxHeight = 600,
      quality = 85,
      format = 'jpeg'
    } = options;

    let buffer;
    if (typeof imageInput === 'string') {
      const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = imageInput;
    }

    const optimizedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    const base64 = optimizedBuffer.toString('base64');
    const dataURL = `data:image/${format};base64,${base64}`;

    console.log(`📸 Product image optimized: ${buffer.length} bytes → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length/buffer.length) * 100)}% reduction)`);

    return dataURL;
  } catch (error) {
    console.error('❌ Product image optimization error:', error);
    throw error;
  }
}

/**
 * Get image metadata without loading full image
 */
async function getImageInfo(imageInput) {
  try {
    let buffer;
    if (typeof imageInput === 'string') {
      const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = imageInput;
    }

    const metadata = await sharp(buffer).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
      hasAlpha: metadata.hasAlpha
    };
  } catch (error) {
    console.error('❌ Get image info error:', error);
    return null;
  }
}

module.exports = {
  optimizeProfileImage,
  optimizeBusinessImage,
  optimizeProductImage,
  getImageInfo
};

