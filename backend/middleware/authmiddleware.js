/**
 * Enhanced Authentication Middleware
 * 
 * Provides authentication and authorization for different user types.
 * Uses the shared database connection for better performance.
 */

const jwt = require("jsonwebtoken");
const { connectToDatabase, ObjectId } = require("../utils/database");
const { AppError } = require("./errorHandler");

/**
 * Basic token verification middleware
 * Validates JWT token and loads user data
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Expect "Bearer TOKEN"

    if (!token) {
      throw new AppError("No token provided", 401, "NO_TOKEN", "AUTH_001");
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } } // exclude password
    );
    
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND", "AUTH_002");
    }

    if (!user.isActive) {
      throw new AppError("User account is deactivated", 403, "ACCOUNT_DEACTIVATED", "AUTH_003");
    }

    // Attach user data to request
    req.user = user;
    req.userId = decoded.userId;
    req.token = token;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Artisan-specific authentication middleware
 * Requires user to be authenticated and have an artisan profile
 */
const requireArtisan = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "AUTH_REQUIRED", "AUTH_004");
    }

    if (req.user.role !== 'artisan') {
      throw new AppError("Artisan access required", 403, "ARTISAN_REQUIRED", "AUTH_005");
    }

    // Get artisan profile
    const { db } = await connectToDatabase();
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(req.userId)
    });

    if (!artisan) {
      throw new AppError("Artisan profile not found", 404, "ARTISAN_PROFILE_NOT_FOUND", "AUTH_006");
    }

    if (artisan.status !== 'active') {
      throw new AppError("Artisan account is not active", 403, "ARTISAN_INACTIVE", "AUTH_007");
    }

    // Attach artisan data to request
    req.artisan = artisan;
    
    next();
  } catch (error) {
    next(error);
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
  requireArtisan,
  requireAdmin,
  verifyOwnership,
  optionalAuth
};
