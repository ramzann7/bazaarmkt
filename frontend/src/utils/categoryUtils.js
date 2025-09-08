// Category Utility Functions for Consistent Category Handling
// This ensures all services use the same category format (keys vs names)

import { PRODUCT_CATEGORIES, getCategoryName, getSubcategoryName } from '../data/productReference';

/**
 * Validates if a category key is valid
 * @param {string} categoryKey - The category key to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidCategoryKey = (categoryKey) => {
  return categoryKey && PRODUCT_CATEGORIES.hasOwnProperty(categoryKey);
};

/**
 * Validates if a subcategory key is valid for a given category
 * @param {string} categoryKey - The category key
 * @param {string} subcategoryKey - The subcategory key to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidSubcategoryKey = (categoryKey, subcategoryKey) => {
  if (!isValidCategoryKey(categoryKey)) return false;
  const category = PRODUCT_CATEGORIES[categoryKey];
  return category && category.subcategories && category.subcategories.hasOwnProperty(subcategoryKey);
};

/**
 * Normalizes a category value to ensure it's a valid key
 * @param {string} categoryValue - The category value (could be key or name)
 * @returns {string|null} - The normalized category key or null if invalid
 */
export const normalizeCategoryKey = (categoryValue) => {
  if (!categoryValue) return null;
  
  // If it's already a valid key, return it
  if (isValidCategoryKey(categoryValue)) {
    return categoryValue;
  }
  
  // Try to find by name
  for (const [key, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (category.name === categoryValue) {
      return key;
    }
  }
  
  return null;
};

/**
 * Normalizes a subcategory value to ensure it's a valid key
 * @param {string} categoryKey - The category key
 * @param {string} subcategoryValue - The subcategory value (could be key or name)
 * @returns {string|null} - The normalized subcategory key or null if invalid
 */
export const normalizeSubcategoryKey = (categoryKey, subcategoryValue) => {
  if (!categoryKey || !subcategoryValue) return null;
  
  const normalizedCategoryKey = normalizeCategoryKey(categoryKey);
  if (!normalizedCategoryKey) return null;
  
  const category = PRODUCT_CATEGORIES[normalizedCategoryKey];
  if (!category || !category.subcategories) return null;
  
  // If it's already a valid key, return it
  if (isValidSubcategoryKey(normalizedCategoryKey, subcategoryValue)) {
    return subcategoryValue;
  }
  
  // Try to find by name
  for (const [key, subcategory] of Object.entries(category.subcategories)) {
    if (subcategory.name === subcategoryValue) {
      return key;
    }
  }
  
  return null;
};

/**
 * Validates and normalizes product data to ensure consistent category format
 * @param {Object} productData - The product data to validate
 * @returns {Object} - The normalized product data
 */
export const normalizeProductData = (productData) => {
  const normalized = { ...productData };
  
  // Normalize category
  if (productData.category) {
    const normalizedCategory = normalizeCategoryKey(productData.category);
    if (normalizedCategory) {
      normalized.category = normalizedCategory;
    } else {
      console.warn(`Invalid category: ${productData.category}`);
      delete normalized.category;
    }
  }
  
  // Normalize subcategory
  if (productData.subcategory && normalized.category) {
    const normalizedSubcategory = normalizeSubcategoryKey(normalized.category, productData.subcategory);
    if (normalizedSubcategory) {
      normalized.subcategory = normalizedSubcategory;
    } else {
      console.warn(`Invalid subcategory: ${productData.subcategory} for category: ${normalized.category}`);
      delete normalized.subcategory;
    }
  }
  
  return normalized;
};

/**
 * Gets the display name for a category key
 * @param {string} categoryKey - The category key
 * @returns {string} - The display name or the key if not found
 */
export const getCategoryDisplayName = (categoryKey) => {
  return getCategoryName(categoryKey) || categoryKey;
};

/**
 * Gets the display name for a subcategory key
 * @param {string} categoryKey - The category key
 * @param {string} subcategoryKey - The subcategory key
 * @returns {string} - The display name or the key if not found
 */
export const getSubcategoryDisplayName = (categoryKey, subcategoryKey) => {
  return getSubcategoryName(categoryKey, subcategoryKey) || subcategoryKey;
};

/**
 * Validates search filters to ensure consistent category format
 * @param {Object} filters - The search filters
 * @returns {Object} - The normalized filters
 */
export const normalizeSearchFilters = (filters) => {
  const normalized = { ...filters };
  
  // Normalize category filter
  if (filters.category) {
    const normalizedCategory = normalizeCategoryKey(filters.category);
    if (normalizedCategory) {
      normalized.category = normalizedCategory;
    } else {
      console.warn(`Invalid category filter: ${filters.category}`);
      delete normalized.category;
    }
  }
  
  // Normalize subcategory filter
  if (filters.subcategory && normalized.category) {
    const normalizedSubcategory = normalizeSubcategoryKey(normalized.category, filters.subcategory);
    if (normalizedSubcategory) {
      normalized.subcategory = normalizedSubcategory;
    } else {
      console.warn(`Invalid subcategory filter: ${filters.subcategory} for category: ${normalized.category}`);
      delete normalized.subcategory;
    }
  }
  
  return normalized;
};

/**
 * Logs category usage for debugging
 * @param {string} component - The component name
 * @param {string} action - The action being performed
 * @param {Object} data - The data being processed
 */
export const logCategoryUsage = (component, action, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CategoryUtils] ${component} - ${action}:`, {
      category: data.category,
      subcategory: data.subcategory,
      normalized: normalizeProductData(data)
    });
  }
};

export default {
  isValidCategoryKey,
  isValidSubcategoryKey,
  normalizeCategoryKey,
  normalizeSubcategoryKey,
  normalizeProductData,
  getCategoryDisplayName,
  getSubcategoryDisplayName,
  normalizeSearchFilters,
  logCategoryUsage
};
