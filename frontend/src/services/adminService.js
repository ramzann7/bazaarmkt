import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get dashboard statistics
export const getStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Return mock data for development
    return {
      totalUsers: 1250,
      totalProducts: 450,
      totalArtisans: 45,
      featuredProducts: 12
    };
  }
};

// Get all users
export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get all products
export const getProducts = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/products`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Get all artisans
export const getArtisans = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/artisans`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching artisans:', error);
    throw error;
  }
};

// Update user status
export const updateUserStatus = async (userId, isActive) => {
  try {
    const response = await axios.patch(`${API_URL}/admin/users/${userId}/status`, 
      { isActive },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId, role) => {
  try {
    const response = await axios.patch(`${API_URL}/admin/users/${userId}/role`, 
      { role },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Update product status
export const updateProductStatus = async (productId, isActive) => {
  try {
    const response = await axios.patch(`${API_URL}/admin/products/${productId}/status`, 
      { isActive },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating product status:', error);
    throw error;
  }
};

// Set featured product
export const setFeaturedProduct = async (productId, isFeatured) => {
  try {
    const response = await axios.patch(`${API_URL}/admin/products/${productId}/featured`, 
      { isFeatured },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error setting featured product:', error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (productId) => {
  try {
    const response = await axios.delete(`${API_URL}/admin/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Update artisan status
export const updateArtisanStatus = async (artisanId, isActive) => {
  try {
    const response = await axios.patch(`${API_URL}/admin/artisans/${artisanId}/status`, 
      { isActive },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating artisan status:', error);
    throw error;
  }
};

// Update artisan verification
export const updateArtisanVerification = async (artisanId, isVerified) => {
  try {
    const response = await axios.patch(`${API_URL}/admin/artisans/${artisanId}/verification`, 
      { isVerified },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating artisan verification:', error);
    throw error;
  }
};

export default {
  getStats,
  getUsers,
  getProducts,
  getArtisans,
  updateUserStatus,
  updateUserRole,
  updateProductStatus,
  setFeaturedProduct,
  deleteProduct,
  updateArtisanStatus,
  updateArtisanVerification
};
