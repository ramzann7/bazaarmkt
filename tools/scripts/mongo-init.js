// MongoDB initialization script for bazaarMKT
db = db.getSiblingDB('bazaarmkt-app');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "firstName", "lastName", "role"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        },
        firstName: { bsonType: "string" },
        lastName: { bsonType: "string" },
        role: {
          bsonType: "string",
          enum: ["artisan", "patron", "admin"]
        }
      }
    }
  }
});

db.createCollection('artisans');
db.createCollection('products');
db.createCollection('orders');
db.createCollection('reviews');
db.createCollection('geographicSettings');
db.createCollection('platformSettings');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.products.createIndex({ "artisan": 1 });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "isFeatured": 1 });
db.products.createIndex({ "productType": 1 });
db.artisans.createIndex({ "user": 1 }, { unique: true });
db.orders.createIndex({ "patron": 1 });
db.orders.createIndex({ "artisan": 1 });
db.orders.createIndex({ "status": 1 });

print('✅ bazaarMKT database initialized successfully!');
