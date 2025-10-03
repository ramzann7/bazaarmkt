/**
 * Auth Service
 * Handles authentication, user management, and guest operations
 */

const BaseService = require('./BaseService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService extends BaseService {
  constructor(db) {
    super(db);
    this.usersCollection = 'users';
    this.artisansCollection = 'artisans';
  }

  /**
   * Check if email exists
   */
  async checkEmail(email) {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }
    
    const user = await this.findOne(this.usersCollection, { email: email.toLowerCase() });
    
    return {
      exists: !!user,
      email: email.toLowerCase(),
      userId: user?._id || null
    };
  }

  /**
   * Create guest user
   */
  async createGuest(guestData) {
    const { firstName, lastName, email } = guestData;
    
    if (!firstName || !lastName || !email) {
      throw new Error('First name, last name, and email are required');
    }
    
    // Check if email already exists
    const existingUser = await this.findOne(this.usersCollection, { 
      email: email.toLowerCase() 
    });
    
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // Create guest user
    const guestUser = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      role: 'user',
      userType: 'buyer',
      isGuest: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      walletBalance: 0
    };
    
    const result = await this.create(this.usersCollection, guestUser);
    
    return {
      userId: result.insertedId,
      ...guestUser,
      _id: result.insertedId
    };
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { firstName, lastName, email, password, userType = 'buyer' } = userData;
    
    if (!firstName || !lastName || !email || !password) {
      throw new Error('All fields are required');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Check if email already exists
    const existingUser = await this.findOne(this.usersCollection, { 
      email: email.toLowerCase() 
    });
    
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userType === 'artisan' ? 'artisan' : 'user',
      userType: userType,
      isGuest: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      walletBalance: 0
    };
    
    const result = await this.create(this.usersCollection, user);
    
    // Remove password from response
    delete user.password;
    
    return {
      userId: result.insertedId,
      ...user,
      _id: result.insertedId
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Find user
    const user = await this.findOne(this.usersCollection, { 
      email: email.toLowerCase() 
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        userType: user.userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password from response
    delete user.password;
    
    return {
      user,
      token,
      expiresIn: '24h'
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh user data
      const user = await this.findById(this.usersCollection, decoded.userId);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }
      
      return {
        valid: true,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const user = await this.findById(this.usersCollection, userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Remove sensitive data
    delete user.password;
    
    return user;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updateData) {
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'profilePicture'];
    const filteredData = {};
    
    // Only allow specific fields to be updated
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });
    
    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const result = await this.updateById(this.usersCollection, userId, filteredData);
    
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    
    return {
      success: true,
      message: 'Profile updated successfully',
      updatedFields: Object.keys(filteredData)
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }
    
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
    
    // Get user
    const user = await this.findById(this.usersCollection, userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await this.getCollection(this.usersCollection).updateOne(
      { _id: this.createObjectId(userId) },
      { 
        $set: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      }
    );
    
    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  /**
   * Reset password
   */
  async resetPassword(email, newPassword) {
    if (!email || !newPassword) {
      throw new Error('Email and new password are required');
    }
    
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Find user
    const user = await this.findOne(this.usersCollection, { 
      email: email.toLowerCase() 
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await this.getCollection(this.usersCollection).updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    return {
      success: true,
      message: 'Password reset successfully'
    };
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId, password) {
    // Get user
    const user = await this.findById(this.usersCollection, userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }
    
    // Soft delete - mark as inactive
    await this.getCollection(this.usersCollection).updateOne(
      { _id: this.createObjectId(userId) },
      { 
        $set: { 
          status: 'deleted',
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    return {
      success: true,
      message: 'Account deleted successfully'
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    const [user, artisanProfile] = await Promise.all([
      this.findById(this.usersCollection, userId),
      this.findOne(this.artisansCollection, { user: this.createObjectId(userId) })
    ]);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const stats = {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        userType: user.userType,
        isGuest: user.isGuest,
        status: user.status,
        walletBalance: user.walletBalance || 0,
        createdAt: user.createdAt
      }
    };
    
    if (artisanProfile) {
      stats.artisan = {
        _id: artisanProfile._id,
        artisanName: artisanProfile.artisanName,
        businessName: artisanProfile.businessName,
        type: artisanProfile.type,
        status: artisanProfile.status,
        isSpotlight: artisanProfile.isSpotlight || false
      };
    }
    
    return stats;
  }

  /**
   * Get auth analytics
   */
  async getAuthAnalytics() {
    const [totalUsers, activeUsers, guestUsers, artisanUsers] = await Promise.all([
      this.count(this.usersCollection),
      this.count(this.usersCollection, { status: 'active' }),
      this.count(this.usersCollection, { isGuest: true }),
      this.count(this.usersCollection, { userType: 'artisan' })
    ]);
    
    return {
      totalUsers,
      activeUsers,
      guestUsers,
      artisanUsers,
      regularUsers: totalUsers - guestUsers
    };
  }
}

module.exports = AuthService;
