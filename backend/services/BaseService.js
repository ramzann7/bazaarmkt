/**
 * Base Service Class
 * Provides common functionality for all services
 */

class BaseService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get a collection from the database
   */
  getCollection(name) {
    return this.db.collection(name);
  }

  /**
   * Create a new document
   */
  async create(collection, data) {
    const result = await this.getCollection(collection).insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return result;
  }

  /**
   * Find a document by ID
   */
  async findById(collection, id) {
    const { ObjectId } = require('mongodb');
    return await this.getCollection(collection).findOne({ _id: new ObjectId(id) });
  }

  /**
   * Find documents with query
   */
  async find(collection, query = {}, options = {}) {
    return await this.getCollection(collection).find(query, options).toArray();
  }

  /**
   * Find one document with query
   */
  async findOne(collection, query) {
    return await this.getCollection(collection).findOne(query);
  }

  /**
   * Update a document by ID
   */
  async updateById(collection, id, data) {
    const { ObjectId } = require('mongodb');
    const result = await this.getCollection(collection).updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...data,
          updatedAt: new Date()
        }
      }
    );
    return result;
  }

  /**
   * Update documents with query
   */
  async update(collection, query, data) {
    const result = await this.getCollection(collection).updateMany(
      query,
      { 
        $set: {
          ...data,
          updatedAt: new Date()
        }
      }
    );
    return result;
  }

  /**
   * Delete a document by ID
   */
  async deleteById(collection, id) {
    const { ObjectId } = require('mongodb');
    const result = await this.getCollection(collection).deleteOne({ _id: new ObjectId(id) });
    return result;
  }

  /**
   * Delete documents with query
   */
  async delete(collection, query) {
    const result = await this.getCollection(collection).deleteMany(query);
    return result;
  }

  /**
   * Count documents with query
   */
  async count(collection, query = {}) {
    return await this.getCollection(collection).countDocuments(query);
  }

  /**
   * Aggregate documents
   */
  async aggregate(collection, pipeline) {
    return await this.getCollection(collection).aggregate(pipeline).toArray();
  }

  /**
   * Paginate results
   */
  async paginate(collection, query = {}, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.getCollection(collection).find(query).sort(sort).skip(skip).limit(limit).toArray(),
      this.count(collection, query)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Validate ObjectId
   */
  isValidObjectId(id) {
    const { ObjectId } = require('mongodb');
    return ObjectId.isValid(id);
  }

  /**
   * Create ObjectId
   */
  createObjectId(id) {
    const { ObjectId } = require('mongodb');
    return new ObjectId(id);
  }

  /**
   * Handle service errors
   */
  handleError(error, context = 'Service operation') {
    console.error(`❌ ${context}:`, error);
    throw new Error(`${context} failed: ${error.message}`);
  }

  /**
   * Log service operations
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

module.exports = BaseService;
