/**
 * Inventory Restoration Service
 * Handles automatic inventory restoration based on periods and dates
 */

import InventoryModel from '../models/InventoryModel';
import productService from './productService';
import { toast } from 'react-hot-toast';

class InventoryRestorationService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 60000; // Check every minute
  }

  /**
   * Start automatic inventory restoration
   * @param {Array} products - Array of products to monitor
   * @param {Function} onUpdate - Callback when products are updated
   */
  startAutoRestoration(products, onUpdate) {
    if (this.isRunning) {
      console.warn('Inventory restoration service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting inventory restoration service...');

    // Initial check
    this.performRestorationCheck(products, onUpdate);

    // Set up interval for regular checks
    this.intervalId = setInterval(() => {
      this.performRestorationCheck(products, onUpdate);
    }, this.checkInterval);
  }

  /**
   * Stop automatic inventory restoration
   */
  stopAutoRestoration() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️ Stopped inventory restoration service');
  }

  /**
   * Perform a single restoration check
   * @param {Array} products - Array of products to check
   * @param {Function} onUpdate - Callback when products are updated
   */
  async performRestorationCheck(products, onUpdate) {
    try {
      const restorationUpdates = InventoryModel.processInventoryRestoration(products);
      
      if (restorationUpdates.length > 0) {
        console.log(`🔄 Found ${restorationUpdates.length} products needing inventory restoration`);
        
        const updatedProducts = [];
        
        for (const update of restorationUpdates) {
          try {
            const updatedProduct = await productService.updateProduct(update.productId, update.updates);
            updatedProducts.push(updatedProduct);
            
            console.log(`✅ Restored inventory for product: ${updatedProduct.name}`, {
              type: update.type,
              updates: update.updates
            });
          } catch (error) {
            console.error(`❌ Failed to restore inventory for product ${update.productId}:`, error);
          }
        }

        // Notify parent component of updates
        if (onUpdate && updatedProducts.length > 0) {
          onUpdate(updatedProducts);
        }

        // Show success notification
        if (updatedProducts.length > 0) {
          toast.success(`${updatedProducts.length} product(s) inventory restored automatically!`);
        }
      }
    } catch (error) {
      console.error('❌ Error during inventory restoration check:', error);
    }
  }

  /**
   * Manual restoration check for specific products
   * @param {Array} productIds - Array of product IDs to check
   * @param {Array} allProducts - All products array
   * @param {Function} onUpdate - Callback when products are updated
   */
  async manualRestorationCheck(productIds, allProducts, onUpdate) {
    try {
      const productsToCheck = allProducts.filter(p => productIds.includes(p._id));
      const restorationUpdates = InventoryModel.processInventoryRestoration(productsToCheck);
      
      if (restorationUpdates.length === 0) {
        toast.info('No products need inventory restoration at this time');
        return;
      }

      const updatedProducts = [];
      
      for (const update of restorationUpdates) {
        try {
          const updatedProduct = await productService.updateProduct(update.productId, update.updates);
          updatedProducts.push(updatedProduct);
        } catch (error) {
          console.error(`❌ Failed to restore inventory for product ${update.productId}:`, error);
        }
      }

      if (onUpdate && updatedProducts.length > 0) {
        onUpdate(updatedProducts);
      }

      if (updatedProducts.length > 0) {
        toast.success(`${updatedProducts.length} product(s) inventory restored!`);
      }
    } catch (error) {
      console.error('❌ Error during manual inventory restoration:', error);
      toast.error('Failed to restore inventory');
    }
  }

  /**
   * Get restoration status for all products
   * @param {Array} products - Array of products to analyze
   */
  getRestorationStatus(products) {
    const status = {
      totalProducts: products.length,
      needsRestoration: 0,
      madeToOrder: 0,
      scheduledOrder: 0,
      readyToShip: 0,
      restorationDetails: []
    };

    products.forEach(product => {
      const inventoryModel = new InventoryModel(product);
      const checks = inventoryModel.checkInventoryRestoration();
      
      if (checks.length > 0) {
        status.needsRestoration += checks.length;
        status.restorationDetails.push({
          productId: product._id,
          productName: product.name,
          productType: product.productType,
          restorationTypes: checks.map(c => c.type)
        });
      }

      // Count by product type
      switch (product.productType) {
        case 'made_to_order':
          status.madeToOrder++;
          break;
        case 'scheduled_order':
          status.scheduledOrder++;
          break;
        case 'ready_to_ship':
          status.readyToShip++;
          break;
      }
    });

    return status;
  }

  /**
   * Get inventory summary for reporting
   * @param {Array} products - Array of products to analyze
   */
  getInventorySummary(products) {
    return InventoryModel.getInventorySummaries(products);
  }

  /**
   * Set check interval for automatic restoration
   * @param {number} interval - Interval in milliseconds
   */
  setCheckInterval(interval) {
    this.checkInterval = interval;
    
    if (this.isRunning) {
      // Restart with new interval
      this.stopAutoRestoration();
      // Note: Will need to restart manually with new interval
    }
  }

  /**
   * Check if service is running
   */
  isServiceRunning() {
    return this.isRunning;
  }
}

// Create singleton instance
const inventoryRestorationService = new InventoryRestorationService();

export default inventoryRestorationService;
