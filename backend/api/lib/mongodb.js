// MongoDB connection utility for serverless functions
// Following 2024 best practices for Vercel serverless functions
const mongoose = require('mongoose');

// Global connection cache for serverless functions
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable mongoose buffering for serverless
      maxPoolSize: 1, // Single connection for serverless
      minPoolSize: 1, // Maintain minimum connection
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 15000, // 15 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectToDatabase;
