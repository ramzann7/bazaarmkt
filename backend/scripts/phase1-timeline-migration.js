/**
 * Phase 1 Timeline Migration Script
 * Adds comprehensive timeline fields to Order schema (production queue removed for simplicity)
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { MongoClient } = require('mongodb');

class TimelineMigration {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'bazarmkt';
    
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.db = this.client.db(dbName);
    
    console.log('✅ Connected to MongoDB for timeline migration');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✅ Disconnected from MongoDB');
    }
  }

  /**
   * Run the complete Phase 1 migration
   */
  async runMigration() {
    try {
      console.log('🚀 Starting Phase 1 Timeline Migration...');
      
      await this.connect();
      
      // Step 1: Add timeline fields to existing orders
      await this.addTimelineFieldsToOrders();
      
      // Step 2: Create indexes for performance
      await this.createIndexes();
      
      // Step 4: Initialize timeline data for existing orders
      await this.initializeExistingOrderTimelines();
      
      console.log('✅ Phase 1 Timeline Migration completed successfully');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  // Production queue collection creation removed - artisans work directly with orders
  async createProductionQueueCollection_REMOVED() {
    try {
      console.log('📋 Creating production queue collection...');
      
      // Drop existing collection if it exists (for development)
      try {
        await this.db.collection('production_queue').drop();
        console.log('🗑️  Dropped existing production_queue collection');
      } catch (error) {
        // Collection doesn't exist, which is fine
      }

      // Create collection with validation schema
      await this.db.createCollection('production_queue', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: [
              'orderId', 
              'artisanId', 
              'productId', 
              'scheduledStartDate', 
              'estimatedDurationHours',
              'status'
            ],
            properties: {
              orderId: {
                bsonType: 'objectId',
                description: 'Order ID is required'
              },
              artisanId: {
                bsonType: 'objectId',
                description: 'Artisan ID is required'
              },
              productId: {
                bsonType: 'objectId',
                description: 'Product ID is required'
              },
              productName: {
                bsonType: 'string',
                description: 'Product name for reference'
              },
              quantity: {
                bsonType: 'number',
                minimum: 1,
                description: 'Quantity must be at least 1'
              },
              scheduledStartDate: {
                bsonType: 'date',
                description: 'Scheduled start date is required'
              },
              estimatedDurationHours: {
                bsonType: 'number',
                minimum: 0,
                description: 'Estimated duration must be non-negative'
              },
              estimatedEndDate: {
                bsonType: 'date',
                description: 'Estimated completion date'
              },
              actualStartDate: {
                bsonType: ['date', 'null'],
                description: 'Actual start date when production begins'
              },
              actualEndDate: {
                bsonType: ['date', 'null'],
                description: 'Actual completion date'
              },
              actualDurationHours: {
                bsonType: ['number', 'null'],
                minimum: 0,
                description: 'Actual duration when completed'
              },
              status: {
                bsonType: 'string',
                enum: ['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled'],
                description: 'Queue item status'
              },
              priority: {
                bsonType: 'string',
                enum: ['low', 'normal', 'high', 'rush'],
                description: 'Production priority level'
              },
              delayReason: {
                bsonType: ['string', 'null'],
                description: 'Reason for delay if applicable'
              },
              newEstimatedEndDate: {
                bsonType: ['date', 'null'],
                description: 'Updated end date if delayed'
              },
              createdAt: {
                bsonType: 'date',
                description: 'Creation timestamp'
              },
              updatedAt: {
                bsonType: 'date',
                description: 'Last update timestamp'
              }
            }
          }
        }
      });

      console.log('✅ Production queue collection created');

    } catch (error) {
      console.error('❌ Error creating production queue collection:', error);
      throw error;
    }
  }

  /**
   * Add timeline fields to existing orders using schema update
   */
  async addTimelineFieldsToOrders() {
    try {
      console.log('📝 Adding timeline fields to orders...');

      // First, check if any orders already have timeline fields
      const ordersWithTimeline = await this.db.collection('orders').countDocuments({
        timeline: { $exists: true }
      });

      if (ordersWithTimeline > 0) {
        console.log(`ℹ️ Found ${ordersWithTimeline} orders that already have timeline fields`);
      }
      
      // Define the timeline schema structure
      const timelineSchema = {
        calculatedAt: null,
        overallTimeline: {
          orderConfirmedDate: null,
          earliestStartDate: null,
          estimatedCompletionDate: null,
          estimatedReadyDate: null,
          actualStartDate: null,
          actualCompletionDate: null,
          bufferDays: 1,
          totalProductionHours: 0,
          progressPercentage: 0,
          lastUpdated: null
        },
        items: [],
        productionRequirements: {
          totalProductionTime: 0,
          longestLeadTime: 0,
          criticalPath: [],
          batchOpportunities: [],
          resourceRequirements: {}
        },
        milestones: [],
        notifications: {
          productionStartReminder: { sent: false, sentAt: null },
          halfwayUpdate: { sent: false, sentAt: null },
          completionNotice: { sent: false, sentAt: null },
          readyForPickup: { sent: false, sentAt: null }
        }
      };

      // Update all orders that don't have timeline field
      const result = await this.db.collection('orders').updateMany(
        { timeline: { $exists: false } },
        { 
          $set: { 
            timeline: timelineSchema
          }
        }
      );

      // Update the newly added timeline fields
      await this.db.collection('orders').updateMany(
        { 
          'timeline.overallTimeline.orderConfirmedDate': { $exists: false },
          'timeline.calculatedAt': { $exists: false }
        },
        { 
          $set: { 
            'timeline.overallTimeline.orderConfirmedDate': new Date(),
            'timeline.calculatedAt': new Date()
          }
        }
      );

      console.log(`✅ Added timeline fields to ${result.modifiedCount} orders`);

    } catch (error) {
      console.error('❌ Error adding timeline fields to orders:', error);
      throw error;
    }
  }

  /**
   * Create necessary indexes for performance
   */
  async createIndexes() {
    try {
      console.log('🔍 Creating performance indexes...');
      
      // Production queue indexes
      // Production queue indexes removed - working directly with orders

      // Orders collection timeline indexes
      await this.db.collection('orders').createIndexes([
        { key: { 'timeline.overallTimeline.estimatedCompletionDate': 1 } },
        { key: { 'timeline.overallTimeline.estimatedReadyDate': 1 } },
        { key: { 'timeline.calculatedAt': 1 } },
        { key: { 'artisan': 1, 'timeline.overallTimeline.estimatedCompletionDate': 1 } }
      ]);

      console.log('✅ Indexes created successfully');

    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Initialize timeline data for existing orders
   */
  async initializeExistingOrderTimelines() {
    try {
      console.log('⏰ Initializing timelines for existing orders...');
      
      // Get orders that need timeline initialization
      const orders = await this.db.collection('orders').find({
        $or: [
          { 'timeline.overallTimeline.estimatedCompletionDate': null },
          { 'timeline.overallTimeline.estimatedCompletionDate': { $exists: false } }
        ]
      }).limit(100).toArray(); // Process in batches

      console.log(`Found ${orders.length} orders requiring timeline initialization`);

      let processed = 0;
      for (const order of orders) {
        try {
          await this.initializeOrderTimeline(order);
          processed++;
          
          if (processed % 10 === 0) {
            console.log(`Processed ${processed}/${orders.length} orders`);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to initialize timeline for order ${order._id}:`, error.message);
        }
      }

      console.log(`✅ Initialized timelines for ${processed} orders`);

    } catch (error) {
      console.error('❌ Error initializing order timelines:', error);
      throw error;
    }
  }

  /**
   * Initialize timeline for a single order
   */
  async initializeOrderTimeline(order) {
    try {
      const now = new Date();
      const orderDate = order.createdAt || now;
      
      // Calculate basic timeline based on existing order data
      const timeline = {
        calculatedAt: now,
        overallTimeline: {
          orderConfirmedDate: orderDate,
          earliestStartDate: orderDate,
          estimatedCompletionDate: null,
          estimatedReadyDate: null,
          actualStartDate: order.status === 'preparing' ? orderDate : null,
          actualCompletionDate: ['completed', 'delivered', 'picked_up'].includes(order.status) ? 
            (order.updatedAt || orderDate) : null,
          bufferDays: 1,
          totalProductionHours: 0,
          progressPercentage: this.calculateProgressFromStatus(order.status),
          lastUpdated: now
        },
        items: [],
        productionRequirements: {
          totalProductionTime: 0,
          longestLeadTime: 0,
          criticalPath: [],
          batchOpportunities: [],
          resourceRequirements: {}
        }
      };

      // Estimate completion dates based on order status and items
      if (order.items && order.items.length > 0) {
        let totalEstimatedHours = 0;
        
        for (const item of order.items) {
          // Get product info for better estimates
          const product = await this.db.collection('products').findOne({
            _id: item.productId
          });

          let itemEstimatedHours = 2; // Default 2 hours
          
          if (product) {
            // Calculate based on product type
            switch (product.productType) {
              case 'ready_to_ship':
                itemEstimatedHours = 0.5; // 30 minutes for ready items
                break;
              case 'made_to_order':
                if (product.leadTime && product.leadTimeUnit) {
                  itemEstimatedHours = this.convertToHours(product.leadTime, product.leadTimeUnit);
                }
                break;
              case 'scheduled_order':
                itemEstimatedHours = 4; // Default for scheduled items
                break;
            }
          }

          totalEstimatedHours += itemEstimatedHours * (item.quantity || 1);
          
          timeline.items.push({
            productId: item.productId,
            productName: item.name || item.productName,
            estimatedHours: itemEstimatedHours,
            quantity: item.quantity || 1
          });
        }

        timeline.overallTimeline.totalProductionHours = totalEstimatedHours;
        
        // Calculate estimated dates if not completed
        if (!timeline.overallTimeline.actualCompletionDate) {
          const estimatedCompletion = new Date(
            orderDate.getTime() + (totalEstimatedHours * 60 * 60 * 1000)
          );
          timeline.overallTimeline.estimatedCompletionDate = estimatedCompletion;
          timeline.overallTimeline.estimatedReadyDate = new Date(
            estimatedCompletion.getTime() + (24 * 60 * 60 * 1000) // +1 day buffer
          );
        }
      }

      // Update the order with calculated timeline
      await this.db.collection('orders').updateOne(
        { _id: order._id },
        { $set: { timeline: timeline } }
      );

    } catch (error) {
      throw new Error(`Failed to initialize timeline for order ${order._id}: ${error.message}`);
    }
  }

  /**
   * Calculate progress percentage from order status
   */
  calculateProgressFromStatus(status) {
    const statusProgress = {
      'pending': 0,
      'confirmed': 10,
      'preparing': 25,
      'ready_for_pickup': 90,
      'ready_for_delivery': 90,
      'out_for_delivery': 95,
      'delivered': 100,
      'picked_up': 100,
      'completed': 100,
      'cancelled': 0
    };

    return statusProgress[status] || 0;
  }

  /**
   * Convert lead time to hours for calculations
   */
  convertToHours(leadTime, leadTimeUnit) {
    switch (leadTimeUnit) {
      case 'hours':
        return leadTime;
      case 'days':
        return leadTime * 24;
      case 'weeks':
        return leadTime * 24 * 7;
      default:
        return leadTime * 24; // Default to days
    }
  }

  /**
   * Rollback migration (for development/testing)
   */
  async rollbackMigration() {
    try {
      console.log('🔄 Rolling back Phase 1 Timeline Migration...');
      
      await this.connect();
      
      // Remove timeline fields from orders
      await this.db.collection('orders').updateMany(
        {},
        { $unset: { timeline: "" } }
      );

      // Production queue collection not created - nothing to drop

      console.log('✅ Migration rolled back successfully');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution
if (require.main === module) {
  const migration = new TimelineMigration();
  
  const command = process.argv[2];
  
  if (command === 'rollback') {
    migration.rollbackMigration()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Migration rollback failed:', error);
        process.exit(1);
      });
  } else {
    migration.runMigration()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

module.exports = TimelineMigration;
