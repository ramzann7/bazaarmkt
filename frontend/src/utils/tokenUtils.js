// Centralized token utilities to prevent cache collisions

// Token cache to prevent repeated decoding
let tokenCache = new Map();

/**
 * Get user ID from JWT token with caching
 * @param {string} token - JWT token
 * @returns {string|null} - User ID or null if invalid
 */
export const getUserIdFromToken = (token) => {
  if (!token) return null;
  
  // Check cache first
  if (tokenCache.has(token)) {
    return tokenCache.get(token).userId;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('🔍 Token decoded - userId:', payload.userId, 'email:', payload.email);
    
    // Cache the decoded token
    tokenCache.set(token, {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      exp: payload.exp,
      decodedAt: Date.now()
    });
    
    return payload.userId;
  } catch (error) {
    console.error('❌ Error decoding token:', error);
    return null;
  }
};

/**
 * Get user email from JWT token with caching
 * @param {string} token - JWT token
 * @returns {string|null} - User email or null if invalid
 */
export const getUserEmailFromToken = (token) => {
  if (!token) return null;
  
  // Check cache first
  if (tokenCache.has(token)) {
    return tokenCache.get(token).email;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Cache the decoded token
    tokenCache.set(token, {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      exp: payload.exp,
      decodedAt: Date.now()
    });
    
    return payload.email;
  } catch (error) {
    console.error('❌ Error decoding token for email:', error);
    return null;
  }
};

/**
 * Validate token and get user info with caching
 * @param {string} token - JWT token
 * @returns {object|null} - User info object or null if invalid
 */
export const getTokenUserInfo = (token) => {
  if (!token) return null;
  
  // Check cache first
  if (tokenCache.has(token)) {
    const cached = tokenCache.get(token);
    return {
      userId: cached.userId,
      email: cached.email,
      userType: cached.userType,
      exp: cached.exp
    };
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Cache the decoded token
    tokenCache.set(token, {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      exp: payload.exp,
      decodedAt: Date.now()
    });
    
    return {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      exp: payload.exp
    };
  } catch (error) {
    console.error('❌ Error decoding token for user info:', error);
    return null;
  }
};

/**
 * Clear token cache (useful when logging out or token changes)
 */
export const clearTokenCache = () => {
  tokenCache.clear();
};
