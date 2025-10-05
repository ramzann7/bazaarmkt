// Centralized token utilities to prevent cache collisions

/**
 * Get user ID from JWT token
 * @param {string} token - JWT token
 * @returns {string|null} - User ID or null if invalid
 */
export const getUserIdFromToken = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('🔍 Token decoded - userId:', payload.userId, 'email:', payload.email);
    return payload.userId;
  } catch (error) {
    console.error('❌ Error decoding token:', error);
    return null;
  }
};

/**
 * Get user email from JWT token
 * @param {string} token - JWT token
 * @returns {string|null} - User email or null if invalid
 */
export const getUserEmailFromToken = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email;
  } catch (error) {
    console.error('❌ Error decoding token for email:', error);
    return null;
  }
};

/**
 * Validate token and get user info
 * @param {string} token - JWT token
 * @returns {object|null} - User info object or null if invalid
 */
export const getTokenUserInfo = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
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
