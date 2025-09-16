/**
 * Inventory Service
 * Handles inventory operations and restoration logic
 */

const Product = require('../models/product');

class InventoryService {
  /**
   * Update product inventory based on product type
   * @param {string} productId - Product ID
   * @param {Object} inventoryData - Inventory data to update
   * @returns {Object} Updated product
   */
  async updateInventory(productId, inventoryData) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Validate inventory data based on product type
      this.validateInventoryUpdate(product, inventoryData);

      // Update product with new inventory data
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: inventoryData },
        { new: true, runValidators: true }
      );

      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  }

  /**
   * Validate inventory update based on product type
   * @param {Object} product - Product object
   * @param {Object} inventoryData - Inventory data to validate
   */
  validateInventoryUpdate(product, inventoryData) {
    switch (product.productType) {
      case 'ready_to_ship':
        if (inventoryData.stock !== undefined && inventoryData.stock < 0) {
          throw new Error('Stock cannot be negative');
        }
        break;

      case 'made_to_order':
        if (inventoryData.totalCapacity !== undefined) {
          if (inventoryData.totalCapacity < 1) {
            throw new Error('Total capacity must be at least 1');
          }
          
          // Calculate remaining capacity based on current usage
          const currentUsed = product.totalCapacity - product.remainingCapacity;
          if (inventoryData.remainingCapacity === undefined) {
            inventoryData.remainingCapacity = Math.max(0, inventoryData.totalCapacity - currentUsed);
          }
        }
        
        if (inventoryData.remainingCapacity !== undefined) {
          const totalCapacity = inventoryData.totalCapacity || product.totalCapacity;
          if (inventoryData.remainingCapacity > totalCapacity) {
            throw new Error('Remaining capacity cannot exceed total capacity');
          }
          if (inventoryData.remainingCapacity < 0) {
            throw new Error('Remaining capacity cannot be negative');
          }
        }
        break;

      case 'scheduled_order':
        if (inventoryData.availableQuantity !== undefined && inventoryData.availableQuantity < 0) {
          throw new Error('Available quantity cannot be negative');
        }
        break;
    }
  }

  /**
   * Check and restore inventory for all products
   * @returns {Array} Array of restoration updates performed
   */
  async checkAndRestoreInventory() {
    try {
      const now = new Date();
      const updates = [];

      // Find products that need restoration
      const madeToOrderProducts = await Product.find({
        productType: 'made_to_order',
        capacityPeriod: { $exists: true }
      });

      const scheduledOrderProducts = await Product.find({
        productType: 'scheduled_order',
        nextAvailableDate: { $lte: now }
      });

      // Process made-to-order products
      for (const product of madeToOrderProducts) {
        const needsRestore = this.checkCapacityPeriodRestoration(product, now);
        if (needsRestore) {
          const update = {
            productId: product._id,
            updates: {
              remainingCapacity: product.totalCapacity,
              lastCapacityRestore: now
            },
            type: 'capacity_restoration'
          };
          updates.push(update);
        }
      }

      // Process scheduled order products
      for (const product of scheduledOrderProducts) {
        const nextProductionDate = this.getNextProductionDate(product.scheduleType, now);
        const update = {
          productId: product._id,
          updates: {
            availableQuantity: product.totalProductionQuantity || product.availableQuantity,
            nextAvailableDate: nextProductionDate
          },
          type: 'production_restoration'
        };
        updates.push(update);
      }

      // Apply updates
      for (const update of updates) {
        await Product.findByIdAndUpdate(update.productId, { $set: update.updates });
      }

      return updates;
    } catch (error) {
      throw new Error(`Failed to restore inventory: ${error.message}`);
    }
  }

  /**
   * Check if capacity period has passed and needs restoration
   * @param {Object} product - Product object
   * @param {Date} currentDate - Current date
   * @returns {boolean} Whether restoration is needed
   */
  checkCapacityPeriodRestoration(product, currentDate) {
    const lastRestored = product.lastCapacityRestore || product.createdAt;
    const lastRestoredDate = new Date(lastRestored);

    switch (product.capacityPeriod) {
      case 'daily':
        return currentDate.getDate() !== lastRestoredDate.getDate() || 
               currentDate.getMonth() !== lastRestoredDate.getMonth() || 
               currentDate.getFullYear() !== lastRestoredDate.getFullYear();

      case 'weekly':
        const daysDiff = Math.floor((currentDate - lastRestoredDate) / (1000 * 60 * 60 * 24));
        return daysDiff >= 7;

      case 'monthly':
        return currentDate.getMonth() !== lastRestoredDate.getMonth() || 
               currentDate.getFullYear() !== lastRestoredDate.getFullYear();

      default:
        return false;
    }
  }

  /**
   * Calculate next production date based on schedule type
   * @param {string} scheduleType - Schedule type
   * @param {Date} currentDate - Current date
   * @returns {Date} Next production date
   */
  getNextProductionDate(scheduleType, currentDate) {
    const nextDate = new Date(currentDate);
    
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
   * Get inventory summary for all products
   * @param {string} artisanId - Artisan ID (optional)
   * @returns {Object} Inventory summary
   */
  async getInventorySummary(artisanId = null) {
    try {
      const query = artisanId ? { artisan: artisanId } : {};
      
      const products = await Product.find(query).populate('artisan', 'name email');
      
      const summary = {
        totalProducts: products.length,
        byProductType: {
          ready_to_ship: 0,
          made_to_order: 0,
          scheduled_order: 0
        },
        lowStock: {
          ready_to_ship: 0,
          made_to_order: 0,
          scheduled_order: 0
        },
        needsRestoration: 0,
        products: []
      };

      for (const product of products) {
        summary.byProductType[product.productType]++;
        
        // Check for low stock/capacity
        let isLow = false;
        switch (product.productType) {
          case 'ready_to_ship':
            isLow = product.stock <= 5;
            break;
          case 'made_to_order':
            isLow = product.remainingCapacity <= 1;
            break;
          case 'scheduled_order':
            isLow = product.availableQuantity <= 5;
            break;
        }
        
        if (isLow) {
          summary.lowStock[product.productType]++;
        }

        // Check if needs restoration
        const needsRestore = this.checkCapacityPeriodRestoration(product, new Date());
        if (needsRestore) {
          summary.needsRestoration++;
        }

        summary.products.push({
          _id: product._id,
          name: product.name,
          productType: product.productType,
          isLow,
          needsRestoration: needsRestore,
          inventory: this.getProductInventoryData(product)
        });
      }

      return summary;
    } catch (error) {
      throw new Error(`Failed to get inventory summary: ${error.message}`);
    }
  }

  /**
   * Get inventory data for a specific product
   * @param {Object} product - Product object
   * @returns {Object} Inventory data
   */
  getProductInventoryData(product) {
    switch (product.productType) {
      case 'ready_to_ship':
        return {
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          unit: product.unit
        };

      case 'made_to_order':
        return {
          totalCapacity: product.totalCapacity,
          remainingCapacity: product.remainingCapacity,
          usedCapacity: product.totalCapacity - product.remainingCapacity,
          capacityPeriod: product.capacityPeriod,
          lastCapacityRestore: product.lastCapacityRestore,
          unit: product.unit
        };

      case 'scheduled_order':
        return {
          availableQuantity: product.availableQuantity,
          totalProductionQuantity: product.totalProductionQuantity,
          nextAvailableDate: product.nextAvailableDate,
          nextAvailableTime: product.nextAvailableTime,
          scheduleType: product.scheduleType,
          unit: product.unit
        };

      default:
        return {};
    }
  }

  /**
   * Update capacity for made-to-order products
   * @param {string} productId - Product ID
   * @param {number} newTotalCapacity - New total capacity
   * @returns {Object} Updated product
   */
  async updateCapacity(productId, newTotalCapacity) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.productType !== 'made_to_order') {
        throw new Error('Only made-to-order products can have capacity updated');
      }

      const currentUsed = product.totalCapacity - product.remainingCapacity;
      const newRemainingCapacity = Math.max(0, newTotalCapacity - currentUsed);

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          $set: {
            totalCapacity: newTotalCapacity,
            remainingCapacity: newRemainingCapacity
          }
        },
        { new: true, runValidators: true }
      );

      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update capacity: ${error.message}`);
    }
  }
}

module.exports = new InventoryService();
