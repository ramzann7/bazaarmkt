/**
 * Backend Inventory Restoration Service
 * Handles automatic capacity and quantity restoration for made-to-order and scheduled products
 */

const { ObjectId } = require('mongodb');

class InventoryRestorationService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Check if capacity period has passed
   */
  checkCapacityPeriodPassed(product, currentDate) {
    if (!product.capacityPeriod) return false;

    const lastRestored = product.lastCapacityRestore 
      ? new Date(product.lastCapacityRestore)
      : product.createdAt 
        ? new Date(product.createdAt)
        : currentDate;

    switch (product.capacityPeriod) {
      case 'daily':
        // Check if it's a different day
        return currentDate.getDate() !== lastRestored.getDate() || 
               currentDate.getMonth() !== lastRestored.getMonth() || 
               currentDate.getFullYear() !== lastRestored.getFullYear();

      case 'weekly':
        // Check if 7 or more days have passed
        const daysDiff = Math.floor((currentDate - lastRestored) / (1000 * 60 * 60 * 24));
        return daysDiff >= 7;

      case 'monthly':
        // Check if it's a different month
        return currentDate.getMonth() !== lastRestored.getMonth() || 
               currentDate.getFullYear() !== lastRestored.getFullYear();

      default:
        return false;
    }
  }

  /**
   * Check if production date has passed
   */
  checkProductionDatePassed(product, currentDate) {
    if (!product.nextAvailableDate) return false;
    
    const productionDate = new Date(product.nextAvailableDate);
    return currentDate >= productionDate;
  }

  /**
   * Calculate next production date
   */
  getNextProductionDate(product, currentDate) {
    const nextDate = new Date(currentDate);
    const scheduleType = product.scheduleType || 'daily';
    
    switch (scheduleType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return nextDate;
  }

  /**
   * Process all products and restore inventory where needed
   */
  async processAllRestorations() {
    const currentDate = new Date();
    const restorations = {
      madeToOrder: { checked: 0, restored: 0, products: [] },
      scheduledOrder: { checked: 0, restored: 0, products: [] },
      total: 0
    };

    try {
      const productsCollection = this.db.collection('products');

      // Process made-to-order products
      const madeToOrderProducts = await productsCollection.find({
        productType: 'made_to_order',
        status: { $in: ['active', 'out_of_stock'] },
        capacityPeriod: { $exists: true }
      }).toArray();

      restorations.madeToOrder.checked = madeToOrderProducts.length;

      for (const product of madeToOrderProducts) {
        if (this.checkCapacityPeriodPassed(product, currentDate)) {
          // Restore remaining capacity to total capacity
          const updateResult = await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: {
                remainingCapacity: product.totalCapacity || 0,
                lastCapacityRestore: currentDate,
                status: (product.totalCapacity || 0) > 0 ? 'active' : 'out_of_stock',
                updatedAt: currentDate
              }
            }
          );

          if (updateResult.modifiedCount > 0) {
            restorations.madeToOrder.restored++;
            restorations.madeToOrder.products.push({
              id: product._id,
              name: product.name,
              restoredTo: product.totalCapacity,
              period: product.capacityPeriod
            });
          }
        }
      }

      // Process scheduled order products
      const scheduledOrderProducts = await productsCollection.find({
        productType: 'scheduled_order',
        status: { $in: ['active', 'out_of_stock'] },
        nextAvailableDate: { $exists: true }
      }).toArray();

      restorations.scheduledOrder.checked = scheduledOrderProducts.length;

      for (const product of scheduledOrderProducts) {
        if (this.checkProductionDatePassed(product, currentDate)) {
          // Restore available quantity and update next date
          const restoredQuantity = product.totalProductionQuantity || product.availableQuantity || 0;
          const nextDate = this.getNextProductionDate(product, currentDate);

          const updateResult = await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: {
                availableQuantity: restoredQuantity,
                nextAvailableDate: nextDate,
                status: restoredQuantity > 0 ? 'active' : 'out_of_stock',
                updatedAt: currentDate
              }
            }
          );

          if (updateResult.modifiedCount > 0) {
            restorations.scheduledOrder.restored++;
            restorations.scheduledOrder.products.push({
              id: product._id,
              name: product.name,
              restoredTo: restoredQuantity,
              nextDate: nextDate
            });
          }
        }
      }

      restorations.total = restorations.madeToOrder.restored + restorations.scheduledOrder.restored;

      console.log(`✅ Inventory Restoration Complete:
        - Made-to-Order: ${restorations.madeToOrder.restored}/${restorations.madeToOrder.checked} restored
        - Scheduled Order: ${restorations.scheduledOrder.restored}/${restorations.scheduledOrder.checked} restored
        - Total Restored: ${restorations.total}`);

      return restorations;
    } catch (error) {
      console.error('❌ Error processing inventory restorations:', error);
      throw error;
    }
  }

  /**
   * Get restoration status for specific product
   */
  async checkProductRestorationStatus(productId) {
    const currentDate = new Date();
    
    try {
      const productsCollection = this.db.collection('products');
      const product = await productsCollection.findOne({ _id: new ObjectId(productId) });

      if (!product) {
        return { needsRestoration: false, reason: 'Product not found' };
      }

      if (product.productType === 'made_to_order' && product.capacityPeriod) {
        const needsRestore = this.checkCapacityPeriodPassed(product, currentDate);
        return {
          needsRestoration: needsRestore,
          productType: 'made_to_order',
          currentCapacity: product.remainingCapacity,
          willRestoreTo: product.totalCapacity,
          period: product.capacityPeriod,
          lastRestored: product.lastCapacityRestore
        };
      }

      if (product.productType === 'scheduled_order' && product.nextAvailableDate) {
        const needsRestore = this.checkProductionDatePassed(product, currentDate);
        return {
          needsRestoration: needsRestore,
          productType: 'scheduled_order',
          currentQuantity: product.availableQuantity,
          willRestoreTo: product.totalProductionQuantity || product.availableQuantity,
          nextDate: product.nextAvailableDate,
          scheduleType: product.scheduleType
        };
      }

      return { needsRestoration: false, reason: 'Product type does not support auto-restoration' };
    } catch (error) {
      console.error('Error checking product restoration status:', error);
      throw error;
    }
  }
}

module.exports = InventoryRestorationService;
