/**
 * Simplified Authentication Middleware for Serverless
 * Provides essential authentication with minimal overhead
 */

const jwt = require("jsonwebtoken");
const { connectToDatabase, ObjectId } = require("../utils/database");

/**
 * Basic token verification middleware
 * Validates JWT token and loads user data
 */
const verifyToken = async (req, res, next) => {
  try {
    console.log('🔍 verifyToken middleware called for:', req.method, req.path);
    
    // DEBUG: Log the auth header exactly as received
    console.log("Auth Header:", req.headers.authorization);
    
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      console.log('❌ No token provided');
      console.log('❌ Auth header value:', authHeader);
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    console.log('🔍 Token found, length:', token.length);
    console.log('🔍 Token preview:', token.substring(0, 20) + '...');
    
    // DEBUG: Decode token without verification to check payload
    const decodedWithoutVerify = jwt.decode(token, { complete: true });
    console.log("Decoded token:", decodedWithoutVerify);
    
    // DEBUG: Check JWT secret
    console.log('🔍 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🔍 JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'NOT SET');
    
    console.log('🔍 Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified, user ID:', decoded.userId);
    console.log('✅ Full decoded payload:', decoded);
    
    // Use optimized database connection (no close() for serverless reuse)
    const client = await connectToDatabase();
    console.log('✅ Database connection established');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      console.log('❌ User not found for ID:', decoded.userId);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log('✅ User found:', user.email);
    req.user = user;
    req.userId = decoded.userId;
    req.token = token;
    
    console.log('✅ verifyToken middleware completed, calling next()');
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

/**
 * Artisan-specific authentication middleware
 * Requires user to be authenticated and have an artisan profile
 */
const requireArtisan = async (req, res, next) => {
  try {
    console.log('🔍 requireArtisan middleware called');
    console.log('🔍 req.user exists:', !!req.user);
    console.log('🔍 req.user.role:', req.user?.role);
    console.log('🔍 req.userId:', req.userId);
    
    if (!req.user) {
      console.log('❌ No user in request - auth middleware did not run');
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'artisan') {
      console.log('❌ User is not an artisan, role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: "Artisan access required"
      });
    }

    console.log('✅ User is artisan, looking up artisan profile...');
    const client = await connectToDatabase();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(req.userId)
    });

    if (!artisan) {
      console.log('❌ Artisan profile not found for user ID:', req.userId);
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found"
      });
    }

    console.log('✅ Artisan profile found:', artisan.artisanName);
    req.artisan = artisan;
    console.log('✅ requireArtisan middleware completed');
    next();
  } catch (error) {
    console.error('Artisan auth error:', error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

/**
 * Admin-specific authentication middleware
 * Requires user to be authenticated and have admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "AUTH_REQUIRED", "AUTH_004");
    }

    if (req.user.role !== 'admin') {
      throw new AppError("Admin access required", 403, "ADMIN_REQUIRED", "AUTH_008");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Resource ownership verification middleware
 * Verifies that user owns the requested resource
 */
const verifyOwnership = (resourceType, idParam = 'id') => async (req, res, next) => {
  try {
    const resourceId = req.params[idParam];
    
    if (!ObjectId.isValid(resourceId)) {
      throw new AppError(`Invalid ${resourceType} ID format`, 400, "INVALID_ID", "AUTH_009");
    }

    const { db } = await connectToDatabase();
    let collection;
    let ownerField;

    // Determine collection and owner field based on resource type
    switch (resourceType) {
      case 'product':
        collection = db.collection('products');
        ownerField = 'artisan';
        break;
      case 'order':
        collection = db.collection('orders');
        ownerField = 'userId';
        break;
      default:
        throw new AppError(`Unknown resource type: ${resourceType}`, 400, "UNKNOWN_RESOURCE", "AUTH_010");
    }

    const resource = await collection.findOne({ _id: new ObjectId(resourceId) });
    
    if (!resource) {
      throw new AppError(`${resourceType} not found`, 404, "RESOURCE_NOT_FOUND", "AUTH_011");
    }

    // For products, check if user's artisan profile owns the product
    if (resourceType === 'product' && req.artisan) {
      if (resource[ownerField].toString() !== req.artisan._id.toString()) {
        throw new AppError("You can only access your own products", 403, "OWNERSHIP_REQUIRED", "AUTH_012");
      }
    } else {
      // For other resources, check direct user ownership
      if (resource[ownerField].toString() !== req.userId) {
        throw new AppError(`You can only access your own ${resourceType}s`, 403, "OWNERSHIP_REQUIRED", "AUTH_012");
      }
    }

    // Attach resource to request for further use
    req[resourceType] = resource;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Loads user data if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // No token provided, continue without user data
      return next();
    }

    // Try to verify token and load user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );
    
    if (user && user.isActive) {
      req.user = user;
      req.userId = decoded.userId;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Token invalid, continue without user data
    next();
  }
};

module.exports = {
  verifyToken,
  requireArtisan
};
