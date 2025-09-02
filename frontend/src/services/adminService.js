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
export const updateUserStatus = async (userId, status) => {
  try {
    const response = await axios.put(`${API_URL}/admin/users/${userId}/status`, 
      { status },
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

// Update product status
export const updateProductStatus = async (productId, status) => {
  try {
    const response = await axios.put(`${API_URL}/admin/products/${productId}/status`, 
      { status },
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
export const setFeaturedProduct = async (productId, featured) => {
  try {
    const response = await axios.put(`${API_URL}/admin/products/${productId}/featured`, 
      { featured },
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

export default {
  getStats,
  getUsers,
  getProducts,
  getArtisans,
  updateUserStatus,
  updateProductStatus,
  setFeaturedProduct
};
