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
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const client = await connectToDatabase();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = user;
    req.userId = decoded.userId;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: "Artisan access required"
      });
    }

    const client = await connectToDatabase();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(req.userId)
    });

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan profile not found"
      });
    }

    req.artisan = artisan;
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
