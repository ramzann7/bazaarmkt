/**
 * Inventory Management Model
 * Handles all inventory-related logic, calculations, and business rules
 */

class InventoryModel {
  constructor(product) {
    if (!product) {
      throw new Error('Product is required to create InventoryModel');
    }
    this.product = product;
    this.inventoryData = this.initializeInventoryData();
  }

  /**
   * Initialize inventory data from product
   */
  initializeInventoryData() {
    return {
      stock: this.product?.stock || 0,
      totalCapacity: this.product?.totalCapacity || 0,
      remainingCapacity: this.product?.remainingCapacity || 0,
      availableQuantity: this.product?.availableQuantity || 0,
      capacityPeriod: this.product?.capacityPeriod || '',
      nextAvailableDate: this.product?.nextAvailableDate || null,
      lastCapacityRestore: this.product?.lastCapacityRestore || null,
      totalProductionQuantity: this.product?.totalProductionQuantity || 0,
      scheduleType: this.product?.scheduleType || 'daily'
    };
  }

  /**
   * Get inventory display data based on product type
   */
  getInventoryDisplayData() {
    if (!this.product || !this.product.productType) {
      return null;
    }
    
    switch (this.product.productType) {
      case 'ready_to_ship':
        return {
          label: 'Stock',
          current: this.inventoryData.stock,
          total: null,
          unit: this.product.unit || 'units',
          isLow: this.inventoryData.stock <= 5,
          lowThreshold: 5,
          lowMessage: 'Low Stock!',
          period: null
        };

      case 'made_to_order':
        return {
          label: 'Capacity',
          current: this.inventoryData.remainingCapacity,
          total: this.inventoryData.totalCapacity,
          unit: this.product.unit || 'units',
          isLow: this.inventoryData.remainingCapacity <= 1,
          lowThreshold: 1,
          lowMessage: 'Low Capacity!',
          period: this.inventoryData.capacityPeriod ? `per ${this.inventoryData.capacityPeriod}` : null
        };

      case 'scheduled_order':
        return {
          label: 'Available',
          current: this.inventoryData.availableQuantity,
          total: null,
          unit: this.product.unit || 'units',
          isLow: this.inventoryData.availableQuantity <= 5,
          lowThreshold: 5,
          lowMessage: 'Low Available!',
          period: null
        };

      default:
        return null;
    }
  }

  /**
   * Calculate remaining capacity for made-to-order products
   * Formula: Total Capacity - Orders = Remaining Capacity
   */
  calculateRemainingCapacity(newTotalCapacity = null) {
    if (this.product.productType !== 'made_to_order') {
      return null;
    }

    const totalCapacity = newTotalCapacity || this.inventoryData.totalCapacity;
    const currentUsed = this.inventoryData.totalCapacity - this.inventoryData.remainingCapacity;
    const newRemainingCapacity = Math.max(0, totalCapacity - currentUsed);

    return {
      totalCapacity,
      remainingCapacity: newRemainingCapacity,
      used: currentUsed,
      available: newRemainingCapacity
    };
  }

  /**
   * Check if inventory needs restoration based on period/dates
   */
  checkInventoryRestoration() {
    const now = new Date();
    const restorationChecks = [];

    // Check made-to-order capacity restoration
    if (this.product.productType === 'made_to_order' && this.inventoryData.capacityPeriod) {
      const needsRestore = this.checkCapacityPeriodRestoration(now);
      if (needsRestore) {
        restorationChecks.push({
          type: 'capacity_restoration',
          productId: this.product._id,
          updates: {
            remainingCapacity: this.inventoryData.totalCapacity,
            lastCapacityRestore: now.toISOString()
          }
        });
      }
    }

    // Check scheduled order restoration
    if (this.product.productType === 'scheduled_order' && this.inventoryData.nextAvailableDate) {
      const needsRestore = this.checkProductionDateRestoration(now);
      if (needsRestore) {
        restorationChecks.push({
          type: 'production_restoration',
          productId: this.product._id,
          updates: {
            availableQuantity: this.inventoryData.totalProductionQuantity || this.inventoryData.availableQuantity,
            nextAvailableDate: this.getNextProductionDate(now)
          }
        });
      }
    }

    return restorationChecks;
  }

  /**
   * Check if capacity period has passed and needs restoration
   */
  checkCapacityPeriodRestoration(currentDate) {
    const lastRestored = this.inventoryData.lastCapacityRestore 
      ? new Date(this.inventoryData.lastCapacityRestore) 
      : this.product.createdAt 
        ? new Date(this.product.createdAt) 
        : currentDate;

    switch (this.inventoryData.capacityPeriod) {
      case 'daily':
        return currentDate.getDate() !== lastRestored.getDate() || 
               currentDate.getMonth() !== lastRestored.getMonth() || 
               currentDate.getFullYear() !== lastRestored.getFullYear();

      case 'weekly':
        const daysDiff = Math.floor((currentDate - lastRestored) / (1000 * 60 * 60 * 24));
        return daysDiff >= 7;

      case 'monthly':
        return currentDate.getMonth() !== lastRestored.getMonth() || 
               currentDate.getFullYear() !== lastRestored.getFullYear();

      default:
        return false;
    }
  }

  /**
   * Check if production date has passed and needs restoration
   */
  checkProductionDateRestoration(currentDate) {
    if (!this.inventoryData.nextAvailableDate) return false;
    
    const productionDate = new Date(this.inventoryData.nextAvailableDate);
    return currentDate >= productionDate;
  }

  /**
   * Calculate next production date based on schedule type
   */
  getNextProductionDate(currentDate) {
    const nextDate = new Date(currentDate);
    
    switch (this.inventoryData.scheduleType) {
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
    
    return nextDate.toISOString();
  }

  /**
   * Validate inventory update based on product type and business rules
   */
  validateInventoryUpdate(field, value) {
    const errors = [];

    switch (this.product.productType) {
      case 'ready_to_ship':
        if (field === 'stock') {
          if (value < 0) errors.push('Stock cannot be negative');
          if (!Number.isInteger(value)) errors.push('Stock must be a whole number');
        }
        break;

      case 'made_to_order':
        if (field === 'totalCapacity') {
          if (value < 0) errors.push('Total capacity cannot be negative');
          if (!Number.isInteger(value)) errors.push('Total capacity must be a whole number');
          if (value < 1) errors.push('Total capacity must be at least 1');
        }
        if (field === 'remainingCapacity') {
          if (value < 0) errors.push('Remaining capacity cannot be negative');
          if (value > this.inventoryData.totalCapacity) {
            errors.push('Remaining capacity cannot exceed total capacity');
          }
        }
        break;

      case 'scheduled_order':
        if (field === 'availableQuantity') {
          if (value < 0) errors.push('Available quantity cannot be negative');
          if (!Number.isInteger(value)) errors.push('Available quantity must be a whole number');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get used capacity for made-to-order products
   */
  getUsedCapacity() {
    if (this.product.productType !== 'made_to_order') return 0;
    return this.inventoryData.totalCapacity - this.inventoryData.remainingCapacity;
  }

  /**
   * Get capacity utilization percentage
   */
  getCapacityUtilization() {
    if (this.product.productType !== 'made_to_order' || this.inventoryData.totalCapacity === 0) {
      return 0;
    }
    return Math.round((this.getUsedCapacity() / this.inventoryData.totalCapacity) * 100);
  }

  /**
   * Get inventory status based on thresholds
   */
  getInventoryStatus() {
    const displayData = this.getInventoryDisplayData();
    
    if (!displayData) return { status: 'unknown', message: '', color: 'gray' };

    if (displayData.isLow) {
      return {
        status: 'low',
        message: displayData.lowMessage,
        color: 'red'
      };
    }

    // Check if capacity is getting close to limit for made-to-order
    if (this.product.productType === 'made_to_order') {
      const utilization = this.getCapacityUtilization();
      if (utilization >= 80) {
        return {
          status: 'high_utilization',
          message: 'High capacity utilization',
          color: 'yellow'
        };
      }
    }

    return {
      status: 'good',
      message: 'Inventory levels are good',
      color: 'green'
    };
  }

  /**
   * Update inventory data
   */
  updateInventoryData(updates) {
    this.inventoryData = { ...this.inventoryData, ...updates };
  }

  /**
   * Get inventory summary for reporting
   */
  getInventorySummary() {
    const displayData = this.getInventoryDisplayData();
    const status = this.getInventoryStatus();

    return {
      productId: this.product._id,
      productName: this.product.name,
      productType: this.product.productType,
      displayData,
      status,
      utilization: this.product.productType === 'made_to_order' ? this.getCapacityUtilization() : null,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Check if product is out of stock
   */
  isOutOfStock() {
    switch (this.product.productType) {
      case 'ready_to_ship':
        return this.inventoryData.stock <= 0;
      
      case 'made_to_order':
        return this.inventoryData.remainingCapacity <= 0;
      
      case 'scheduled_order':
        return this.inventoryData.availableQuantity <= 0;
      
      default:
        return false;
    }
  }

  /**
   * Get out of stock status with details
   */
  getOutOfStockStatus() {
    const isOut = this.isOutOfStock();
    
    if (!isOut) {
      return {
        isOutOfStock: false,
        message: null,
        reason: null
      };
    }

    let message = '';
    let reason = '';

    switch (this.product.productType) {
      case 'ready_to_ship':
        message = 'Out of Stock';
        reason = 'No items available';
        break;
      
      case 'made_to_order':
        message = 'No Capacity Available';
        reason = 'All production slots are filled';
        break;
      
      case 'scheduled_order':
        message = 'Fully Booked';
        reason = 'All available slots are taken';
        break;
      
      default:
        message = 'Unavailable';
        reason = 'Product not available';
    }

    return {
      isOutOfStock: true,
      message,
      reason
    };
  }

  /**
   * Static method to process multiple products for inventory restoration
   */
  static processInventoryRestoration(products) {
    const restorationUpdates = [];

    products.forEach(product => {
      const inventoryModel = new InventoryModel(product);
      const checks = inventoryModel.checkInventoryRestoration();
      restorationUpdates.push(...checks);
    });

    return restorationUpdates;
  }

  /**
   * Static method to get inventory summary for multiple products
   */
  static getInventorySummaries(products) {
    return products.map(product => {
      const inventoryModel = new InventoryModel(product);
      return inventoryModel.getInventorySummary();
    });
  }
}

export default InventoryModel;
