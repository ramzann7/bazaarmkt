const jwt = require('jsonwebtoken');
const User = require('../models/user');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('🔍 Auth middleware - Token received:', !!token, token ? token.substring(0, 20) + '...' : 'none');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
    console.log('🔍 Auth middleware - Decoded token:', decoded);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    console.log('Found user:', user);
    
    // Preserve JWT payload information in the user object
    req.user = {
      ...user.toObject(),
      isGuest: decoded.isGuest || false,
      guestId: decoded.guestId || null
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = verifyToken;

