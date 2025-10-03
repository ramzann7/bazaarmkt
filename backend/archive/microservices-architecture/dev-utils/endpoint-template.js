/**
 * Endpoint Template for Serverless Architecture
 * Copy this file and modify for new API endpoints
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

/**
 * Template endpoint handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const templateEndpoint = async (req, res) => {
  try {
    // 1. AUTHENTICATION (if required)
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 2. VALIDATION
    const { requiredField, optionalField } = req.body;
    
    if (!requiredField) {
      return res.status(400).json({
        success: false,
        message: 'Required field is missing'
      });
    }

    // 3. DATABASE CONNECTION
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const collection = db.collection('your_collection');

    // 4. BUSINESS LOGIC
    const result = await collection.findOne({ 
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(userId)
    });

    if (!result) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // 5. DATABASE OPERATIONS
    const updateData = {
      requiredField,
      optionalField: optionalField || result.optionalField,
      updatedAt: new Date()
    };

    await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    // 6. CLEANUP
    await client.close();

    // 7. RESPONSE
    res.json({
      success: true,
      message: 'Operation completed successfully',
      data: {
        id: req.params.id,
        ...updateData
      }
    });

  } catch (error) {
    console.error('Template endpoint error:', error);
    
    // Handle specific error types
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = templateEndpoint;
