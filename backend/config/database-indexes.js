/**
 * Database Indexes Configuration
 * Optimizes query performance for MongoDB Atlas
 */

const { getDB } = require('./database');

/**
 * Create all database indexes
 */
async function createIndexes() {
  try {
    const db = await getDB();
    console.log('🔍 Creating database indexes...');

    // Users collection indexes
    await createUserIndexes(db);
    
    // Products collection indexes
    await createProductIndexes(db);
    
    // Orders collection indexes
    await createOrderIndexes(db);
    
    // Community collection indexes
    await createCommunityIndexes(db);
    
    // Artisans collection indexes
    await createArtisanIndexes(db);
    
    // Reviews collection indexes
    await createReviewIndexes(db);
    
    // Notifications collection indexes
    await createNotificationIndexes(db);

    console.log('✅ All database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Create indexes for users collection
 */
async function createUserIndexes(db) {
  const usersCollection = db.collection('users');
  
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ role: 1 });
  await usersCollection.createIndex({ userType: 1 });
  await usersCollection.createIndex({ createdAt: -1 });
  await usersCollection.createIndex({ 'profile.firstName': 1, 'profile.lastName': 1 });
  await usersCollection.createIndex({ 'address.city': 1, 'address.state': 1 });
  
  console.log('✅ User indexes created');
}

/**
 * Create indexes for products collection
 */
async function createProductIndexes(db) {
  const productsCollection = db.collection('products');
  
  // Basic field indexes
  await productsCollection.createIndex({ artisan: 1 });
  await productsCollection.createIndex({ category: 1 });
  await productsCollection.createIndex({ subcategory: 1 });
  await productsCollection.createIndex({ status: 1 });
  await productsCollection.createIndex({ isActive: 1 });
  await productsCollection.createIndex({ price: 1 });
  await productsCollection.createIndex({ createdAt: -1 });
  await productsCollection.createIndex({ updatedAt: -1 });
  await productsCollection.createIndex({ 'location.city': 1, 'location.state': 1 });
  
  // Optimized text search index with weighted fields for better relevance
  await productsCollection.createIndex(
    {
      name: 'text',
      description: 'text', 
      tags: 'text',
      category: 'text'
    },
    {
      weights: {
        name: 10,       // Product name most important
        tags: 5,        // Tags moderately important
        category: 3,    // Category helpful for context
        description: 1  // Description least important
      },
      name: 'optimized_text_search_index'
    }
  );
  
  // Compound indexes for common query patterns
  await productsCollection.createIndex({ 
    artisan: 1, 
    status: 1, 
    createdAt: -1 
  });
  await productsCollection.createIndex({ 
    category: 1, 
    subcategory: 1, 
    status: 1 
  });
  await productsCollection.createIndex({ 
    isActive: 1, 
    category: 1, 
    price: 1 
  });
  await productsCollection.createIndex({ 
    isActive: 1, 
    productType: 1,
    createdAt: -1
  });
  
  // Inventory-aware compound indexes
  await productsCollection.createIndex({ 
    productType: 1, 
    stock: 1, 
    isActive: 1 
  });
  await productsCollection.createIndex({ 
    productType: 1, 
    remainingCapacity: 1, 
    isActive: 1 
  });
  await productsCollection.createIndex({ 
    productType: 1, 
    availableQuantity: 1, 
    isActive: 1 
  });
  
  // Popular/featured products optimization
  await productsCollection.createIndex({ 
    isActive: 1,
    views: -1,
    soldCount: -1
  });
  await productsCollection.createIndex({ 
    isFeatured: 1,
    isActive: 1,
    createdAt: -1
  });
  
  console.log('✅ Product indexes created with optimized text search');
}

/**
 * Create indexes for orders collection
 */
async function createOrderIndexes(db) {
  const ordersCollection = db.collection('orders');
  
  await ordersCollection.createIndex({ customer: 1 });
  await ordersCollection.createIndex({ artisan: 1 });
  await ordersCollection.createIndex({ status: 1 });
  await ordersCollection.createIndex({ createdAt: -1 });
  await ordersCollection.createIndex({ updatedAt: -1 });
  await ordersCollection.createIndex({ 
    customer: 1, 
    status: 1, 
    createdAt: -1 
  });
  await ordersCollection.createIndex({ 
    artisan: 1, 
    status: 1, 
    createdAt: -1 
  });
  await ordersCollection.createIndex({ 'items.product': 1 });
  await ordersCollection.createIndex({ 'payment.status': 1 });
  
  console.log('✅ Order indexes created');
}

/**
 * Create indexes for community collection
 */
async function createCommunityIndexes(db) {
  const communityPostsCollection = db.collection('community_posts');
  const communityCommentsCollection = db.collection('community_comments');
  
  // Community posts indexes
  await communityPostsCollection.createIndex({ author: 1 });
  await communityPostsCollection.createIndex({ type: 1 });
  await communityPostsCollection.createIndex({ category: 1 });
  await communityPostsCollection.createIndex({ status: 1 });
  await communityPostsCollection.createIndex({ createdAt: -1 });
  await communityPostsCollection.createIndex({ updatedAt: -1 });
  await communityPostsCollection.createIndex({ likes: -1 });
  await communityPostsCollection.createIndex({ 
    type: 1, 
    status: 1, 
    createdAt: -1 
  });
  await communityPostsCollection.createIndex({ 
    author: 1, 
    type: 1, 
    createdAt: -1 
  });
  await communityPostsCollection.createIndex({ 
    title: 'text', 
    content: 'text' 
  });
  
  // Community comments indexes
  await communityCommentsCollection.createIndex({ postId: 1 });
  await communityCommentsCollection.createIndex({ author: 1 });
  await communityCommentsCollection.createIndex({ createdAt: -1 });
  await communityCommentsCollection.createIndex({ 
    postId: 1, 
    createdAt: -1 
  });
  
  console.log('✅ Community indexes created');
}

/**
 * Create indexes for artisans collection
 */
async function createArtisanIndexes(db) {
  const artisansCollection = db.collection('artisans');
  
  await artisansCollection.createIndex({ user: 1 }, { unique: true });
  await artisansCollection.createIndex({ businessName: 1 });
  await artisansCollection.createIndex({ status: 1 });
  await artisansCollection.createIndex({ 'address.city': 1, 'address.state': 1 });
  await artisansCollection.createIndex({ 'address.coordinates': '2dsphere' });
  await artisansCollection.createIndex({ createdAt: -1 });
  await artisansCollection.createIndex({ updatedAt: -1 });
  await artisansCollection.createIndex({ 
    status: 1, 
    'address.city': 1, 
    'address.state': 1 
  });
  await artisansCollection.createIndex({ 
    businessName: 'text', 
    description: 'text' 
  });
  
  console.log('✅ Artisan indexes created');
}

/**
 * Create indexes for reviews collection
 */
async function createReviewIndexes(db) {
  const reviewsCollection = db.collection('reviews');
  
  await reviewsCollection.createIndex({ product: 1 });
  await reviewsCollection.createIndex({ artisan: 1 });
  await reviewsCollection.createIndex({ customer: 1 });
  await reviewsCollection.createIndex({ rating: 1 });
  await reviewsCollection.createIndex({ createdAt: -1 });
  await reviewsCollection.createIndex({ 
    product: 1, 
    createdAt: -1 
  });
  await reviewsCollection.createIndex({ 
    artisan: 1, 
    rating: 1, 
    createdAt: -1 
  });
  await reviewsCollection.createIndex({ 
    customer: 1, 
    product: 1 
  }, { unique: true }); // One review per customer per product
  
  console.log('✅ Review indexes created');
}

/**
 * Create indexes for notifications collection
 */
async function createNotificationIndexes(db) {
  const notificationsCollection = db.collection('notifications');
  
  await notificationsCollection.createIndex({ user: 1 });
  await notificationsCollection.createIndex({ type: 1 });
  await notificationsCollection.createIndex({ read: 1 });
  await notificationsCollection.createIndex({ createdAt: -1 });
  await notificationsCollection.createIndex({ 
    user: 1, 
    read: 1, 
    createdAt: -1 
  });
  await notificationsCollection.createIndex({ 
    user: 1, 
    type: 1, 
    createdAt: -1 
  });
  
  console.log('✅ Notification indexes created');
}

/**
 * Drop all indexes (for development/testing)
 */
async function dropAllIndexes() {
  try {
    const db = await getDB();
    console.log('🗑️ Dropping all database indexes...');

    const collections = ['users', 'products', 'orders', 'community_posts', 'community_comments', 'artisans', 'reviews', 'notifications'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      
      for (const index of indexes) {
        if (index.name !== '_id_') { // Keep the default _id index
          await collection.dropIndex(index.name);
        }
      }
    }

    console.log('✅ All database indexes dropped');
  } catch (error) {
    console.error('❌ Error dropping database indexes:', error);
    throw error;
  }
}

/**
 * Get index statistics
 */
async function getIndexStats() {
  try {
    const db = await getDB();
    const collections = ['users', 'products', 'orders', 'community_posts', 'community_comments', 'artisans', 'reviews', 'notifications'];
    const stats = {};

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      stats[collectionName] = indexes.map(index => ({
        name: index.name,
        key: index.key,
        unique: index.unique || false,
        sparse: index.sparse || false
      }));
    }

    return stats;
  } catch (error) {
    console.error('❌ Error getting index stats:', error);
    throw error;
  }
}

module.exports = {
  createIndexes,
  dropAllIndexes,
  getIndexStats,
  createUserIndexes,
  createProductIndexes,
  createOrderIndexes,
  createCommunityIndexes,
  createArtisanIndexes,
  createReviewIndexes,
  createNotificationIndexes
};
