/**
 * Order Timeline Service
 * Manages comprehensive order timelines and realistic completion date calculations
 * Phase 1 Implementation
 */

const BaseService = require('./BaseService');

class OrderTimelineService extends BaseService {
  constructor(db) {
    super(db);
    this.ordersCollection = 'orders';
    this.productsCollection = 'products';
    this.artisansCollection = 'artisans';
  }

  /**
   * Calculate comprehensive order timeline considering all factors
   */
  async calculateOrderTimeline(order, artisanCapacity = null) {
    try {
      console.log('🕐 Calculating order timeline for order:', order._id);
      
      const timeline = {
        orderId: order._id,
        calculatedAt: new Date(),
        items: [],
        overallTimeline: {
          orderConfirmedDate: order.createdAt || new Date(),
          earliestStartDate: null,
          estimatedCompletionDate: null,
          estimatedReadyDate: null,
          bufferDays: 1 // Default buffer for quality control
        },
        productionRequirements: {
          totalProductionTime: 0,
          longestLeadTime: 0,
          criticalPath: []
        }
      };

      // Process each item in the order
      for (const item of order.items || []) {
        const itemTimeline = await this.calculateItemTimeline(
          item, 
          artisanCapacity
        );
        timeline.items.push(itemTimeline);
      }

      // Calculate overall timeline from item timelines
      timeline.overallTimeline = this.calculateOverallTimeline(timeline.items);
      
      // Determine production requirements
      timeline.productionRequirements = this.calculateProductionRequirements(timeline.items);

      console.log('✅ Order timeline calculated:', timeline);
      return timeline;

    } catch (error) {
      console.error('❌ Error calculating order timeline:', error);
      throw new Error(`Failed to calculate order timeline: ${error.message}`);
    }
  }

  /**
   * Calculate timeline for individual order item
   */
  async calculateItemTimeline(item, artisanCapacity = null) {
    try {
      // Get product details with current inventory
      const product = await this.findById(this.productsCollection, item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const itemTimeline = {
        productId: item.productId,
        productName: item.name || product.name,
        productType: product.productType || 'ready_to_ship',
        quantity: item.quantity || 1,
        timeline: {
          orderDate: new Date(),
          productionStartDate: null,
          estimatedCompletionDate: null,
          leadTimeHours: 0,
          bufferTimeHours: 0
        },
        productionInfo: {
          requiresProduction: false,
          estimatedProductionHours: 0,
          canBatchProduce: false,
          priorityLevel: 'normal'
        }
      };

      // Calculate timeline based on product type
      switch (product.productType) {
        case 'ready_to_ship':
          itemTimeline.timeline = this.calculateReadyToShipTimeline(product, item);
          break;
          
        case 'made_to_order':
          itemTimeline.timeline = await this.calculateMadeToOrderTimeline(
            product, 
            item, 
            artisanCapacity
          );
          itemTimeline.productionInfo.requiresProduction = true;
          break;
          
        case 'scheduled_order':
          itemTimeline.timeline = this.calculateScheduledOrderTimeline(product, item);
          itemTimeline.productionInfo.requiresProduction = true;
          break;
          
        default:
          // Default to ready_to_ship behavior
          itemTimeline.timeline = this.calculateReadyToShipTimeline(product, item);
      }

      return itemTimeline;

    } catch (error) {
      console.error('❌ Error calculating item timeline:', error);
      throw error;
    }
  }

  /**
   * Calculate timeline for ready-to-ship products
   */
  calculateReadyToShipTimeline(product, item) {
    const now = new Date();
    const packingTimeHours = 2; // Standard packing time
    const bufferTimeHours = 4; // Buffer for processing

    return {
      orderDate: now,
      productionStartDate: now, // Can start immediately
      estimatedCompletionDate: new Date(now.getTime() + (packingTimeHours * 60 * 60 * 1000)),
      leadTimeHours: packingTimeHours,
      bufferTimeHours: bufferTimeHours,
      readyForPickupDate: new Date(now.getTime() + ((packingTimeHours + bufferTimeHours) * 60 * 60 * 1000))
    };
  }

  /**
   * Calculate timeline for made-to-order products - SIMPLIFIED
   * Customer promise: if product says "3 days lead time", order is ready in 3 days
   */
  async calculateMadeToOrderTimeline(product, item, artisanCapacity) {
    const now = new Date();
    
    // SIMPLE APPROACH: Lead time is the customer promise
    // 3 days lead time = order ready in 3 days from confirmation
    const leadTime = product.leadTime || 1;
    const leadTimeUnit = product.leadTimeUnit || 'days';
    
    // Calculate ready date directly from lead time (customer promise)
    let readyDate;
    switch (leadTimeUnit.toLowerCase()) {
      case 'hours':
        readyDate = new Date(now.getTime() + (leadTime * 60 * 60 * 1000));
        break;
      case 'days':
        readyDate = new Date(now.getTime() + (leadTime * 24 * 60 * 60 * 1000));
        break;
      case 'weeks':
        readyDate = new Date(now.getTime() + (leadTime * 7 * 24 * 60 * 60 * 1000));
        break;
      default:
        // Default to days
        readyDate = new Date(now.getTime() + (leadTime * 24 * 60 * 60 * 1000));
    }
    
    // Internal production scheduling (for artisan planning only)
    const leadTimeHours = this.convertToHours(leadTime, leadTimeUnit);
    let productionStartDate = now;
    
    // Production queue removed - artisans work directly with orders
    // Production start date is immediate for simplicity
    
    return {
      orderDate: now,
      // Production starts immediately for simple workflow
      productionStartDate: productionStartDate,
      // Customer promise based on lead time
      estimatedCompletionDate: readyDate,
      readyForPickupDate: readyDate,
      // Simple values for compatibility
      leadTimeHours: leadTimeHours,
      bufferTimeHours: 0 // No buffer needed - lead time is the promise
    };
  }

  /**
   * Calculate timeline for scheduled order products - SIMPLIFIED
   * Customer promise: if product is scheduled for a specific date, that's when it's ready
   */
  calculateScheduledOrderTimeline(product, item) {
    const now = new Date();
    
    // For scheduled orders, the nextAvailableDate IS the customer promise
    const scheduledDate = product.nextAvailableDate ? 
      new Date(product.nextAvailableDate) : 
      new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Default to tomorrow if not set

    // Simple approach: scheduled date is when the order is ready
    return {
      orderDate: now,
      productionStartDate: scheduledDate, // Could be earlier, but this is for display
      estimatedCompletionDate: scheduledDate,
      readyForPickupDate: scheduledDate,
      leadTimeHours: Math.max(1, (scheduledDate - now) / (60 * 60 * 1000)), // Hours until scheduled date
      bufferTimeHours: 0, // No buffer - scheduled date is the promise
      scheduledForDate: scheduledDate
    };
  }

  /**
   * Calculate overall timeline from individual item timelines
   */
  calculateOverallTimeline(itemTimelines) {
    if (!itemTimelines || itemTimelines.length === 0) {
      const now = new Date();
      return {
        orderConfirmedDate: now,
        earliestStartDate: now,
        estimatedCompletionDate: now,
        estimatedReadyDate: now,
        bufferDays: 1
      };
    }

    // Find the earliest production start date
    const earliestStartDate = itemTimelines.reduce((earliest, item) => {
      const itemStart = item.timeline.productionStartDate;
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null);

    // Find the latest completion date (critical path)
    const latestCompletionDate = itemTimelines.reduce((latest, item) => {
      const itemCompletion = item.timeline.readyForPickupDate || item.timeline.estimatedCompletionDate;
      return !latest || itemCompletion > latest ? itemCompletion : latest;
    }, null);

    // Calculate buffer time
    const totalProductionHours = itemTimelines.reduce((total, item) => {
      return total + (item.timeline.leadTimeHours || 0);
    }, 0);
    
    const bufferHours = Math.max(8, totalProductionHours * 0.15); // 15% buffer, minimum 8 hours
    const bufferDays = Math.ceil(bufferHours / 24);

    return {
      orderConfirmedDate: new Date(),
      earliestStartDate: earliestStartDate,
      estimatedCompletionDate: latestCompletionDate,
      estimatedReadyDate: new Date(
        latestCompletionDate.getTime() + (bufferHours * 60 * 60 * 1000)
      ),
      bufferDays: bufferDays,
      totalProductionHours: totalProductionHours
    };
  }

  /**
   * Calculate production requirements for the order
   */
  calculateProductionRequirements(itemTimelines) {
    const requirements = {
      totalProductionTime: 0,
      longestLeadTime: 0,
      criticalPath: [],
      batchOpportunities: [],
      resourceRequirements: {}
    };

    itemTimelines.forEach(item => {
      const leadTime = item.timeline.leadTimeHours || 0;
      requirements.totalProductionTime += leadTime;
      
      if (leadTime > requirements.longestLeadTime) {
        requirements.longestLeadTime = leadTime;
        requirements.criticalPath = [item.productId];
      }

      // Check for batch production opportunities
      if (item.productionInfo.canBatchProduce) {
        requirements.batchOpportunities.push({
          productId: item.productId,
          productType: item.productType,
          quantity: item.quantity
        });
      }
    });

    return requirements;
  }

  /**
   * Update timeline estimates based on production events
   */
  async updateTimelineEstimates(orderId, productionEvents) {
    try {
      console.log('🔄 Updating timeline estimates for order:', orderId);
      
      const order = await this.findById(this.ordersCollection, orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Recalculate timeline with new production events
      const updatedTimeline = await this.calculateOrderTimeline(order);
      
      // Apply production event adjustments
      for (const event of productionEvents) {
        this.applyProductionEvent(updatedTimeline, event);
      }

      // Save updated timeline to order
      const result = await this.getCollection(this.ordersCollection).updateOne(
        { _id: this.createObjectId(orderId) },
        {
          $set: {
            timeline: updatedTimeline,
            'timeline.lastUpdated': new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Failed to update order timeline');
      }

      console.log('✅ Timeline estimates updated successfully');
      return updatedTimeline;

    } catch (error) {
      console.error('❌ Error updating timeline estimates:', error);
      throw error;
    }
  }

  /**
   * Apply production event to timeline (production started, milestone reached, etc.)
   */
  applyProductionEvent(timeline, event) {
    switch (event.type) {
      case 'production_started':
        timeline.overallTimeline.actualStartDate = event.timestamp;
        break;
        
      case 'milestone_reached':
        // Update progress and recalculate remaining time
        const progress = event.progress || 0;
        timeline.overallTimeline.progressPercentage = progress;
        break;
        
      case 'delay_reported':
        const delayHours = event.delayHours || 0;
        timeline.overallTimeline.estimatedCompletionDate = new Date(
          timeline.overallTimeline.estimatedCompletionDate.getTime() + 
          (delayHours * 60 * 60 * 1000)
        );
        break;
        
      case 'production_completed':
        timeline.overallTimeline.actualCompletionDate = event.timestamp;
        break;
    }
  }


  /**
   * Convert lead time to hours for consistent calculations
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
   * CONSOLIDATED STATUS MANAGEMENT
   * Determine appropriate order status based on production events
   * Resolves overlap between order status and production queue systems
   */
  async getOrderStatusFromProductionEvents(orderId) {
    try {
      // Get order to check current status and items
      const order = await this.findById(this.ordersCollection, orderId);
      if (!order) return null;
      
      // Don't change status for orders that are already delivered/completed/cancelled
      const finalStates = ['delivered', 'picked_up', 'completed', 'cancelled', 'declined'];
      if (finalStates.includes(order.status)) {
        return null; // Keep current status
      }
      
      // SIMPLIFIED STATUS MANAGEMENT WITHOUT PRODUCTION QUEUE
      // Status progression: pending → confirmed → preparing → ready_for_pickup/delivery
      
      // If order is pending, it should be confirmed when artisan accepts it
      if (order.status === 'pending') {
        return 'confirmed';
      }
      
      // Since production queue is removed, we use simple timeline-based status management
      // This method is now mainly for compatibility - actual status updates should happen 
      // through direct order status updates by artisans
      
      return null; // Keep current status - let artisans manage status directly
      
    } catch (error) {
      console.error('❌ Error determining order status from production events:', error);
      return null;
    }
  }

  /**
   * Get realistic completion date for customer display
   */
  async getCustomerCompletionEstimate(orderId) {
    try {
      const order = await this.findById(this.ordersCollection, orderId);
      if (!order || !order.timeline) {
        return null;
      }

      const timeline = order.timeline.overallTimeline;
      return {
        estimatedReadyDate: timeline.estimatedReadyDate,
        confidence: this.calculateConfidenceLevel(timeline),
        bufferIncluded: true,
        lastUpdated: timeline.lastUpdated || order.createdAt
      };
      
    } catch (error) {
      console.error('❌ Error getting customer completion estimate:', error);
      return null;
    }
  }

  /**
   * Calculate confidence level for timeline estimate
   */
  calculateConfidenceLevel(timeline) {
    // Simple confidence calculation based on various factors
    let confidence = 90; // Start with 90% confidence

    // Reduce confidence if timeline is far in future
    const daysUntilReady = Math.ceil(
      (new Date(timeline.estimatedReadyDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilReady > 7) confidence -= 10;
    if (daysUntilReady > 14) confidence -= 10;
    
    // Reduce confidence if production time is very long
    if (timeline.totalProductionHours > 40) confidence -= 10;
    
    return Math.max(60, confidence); // Minimum 60% confidence
  }
}

module.exports = OrderTimelineService;
