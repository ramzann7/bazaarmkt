/**
 * Utility functions for generating and handling URL slugs
 */

/**
 * Generate a URL-friendly slug from a string
 * @param {string} text - The text to convert to a slug
 * @returns {string} - The URL-friendly slug
 */
export const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Remove accents/diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Generate a unique slug by appending a random string if needed
 * @param {string} text - The text to convert to a slug
 * @param {string} uniqueId - Optional unique ID to append
 * @returns {string} - The unique URL-friendly slug
 */
export const generateUniqueSlug = (text, uniqueId = null) => {
  const baseSlug = generateSlug(text);
  
  if (uniqueId) {
    // Use last 8 characters of ID for uniqueness
    const shortId = uniqueId.toString().slice(-8);
    return `${baseSlug}-${shortId}`;
  }
  
  return baseSlug;
};

/**
 * Parse slug to extract ID if present
 * @param {string} slug - The slug to parse
 * @returns {string|null} - The extracted ID or null
 */
export const extractIdFromSlug = (slug) => {
  if (!slug) return null;
  
  // Check if slug ends with an ID pattern (e.g., -3e2e8948)
  const match = slug.match(/-([a-f0-9]{8,})$/i);
  return match ? match[1] : null;
};

/**
 * Check if a string is a MongoDB ObjectId
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's an ObjectId
 */
export const isObjectId = (str) => {
  if (!str) return false;
  return /^[a-f\d]{24}$/i.test(str);
};

