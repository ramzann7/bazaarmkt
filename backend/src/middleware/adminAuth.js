const adminAuth = (req, res, next) => {
  try {
    console.log('🔍 Admin auth middleware - User:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'none');
    
    // Check if user exists and has admin role
    if (!req.user) {
      console.log('🔍 Admin auth middleware - No user found');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      console.log('🔍 Admin auth middleware - User role is not admin:', req.user.role);
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('🔍 Admin auth middleware - Admin access granted');
    next();
  } catch (error) {
    console.error('🔍 Admin auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = adminAuth;
