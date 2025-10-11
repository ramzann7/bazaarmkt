/**
 * Delivery Buffer Configuration
 * Settings for Uber Direct delivery buffer and surge protection
 */

module.exports = {
  delivery: {
    professionalDelivery: {
      // Buffer configuration
      bufferPercentage: process.env.DELIVERY_BUFFER_PERCENTAGE 
        ? parseFloat(process.env.DELIVERY_BUFFER_PERCENTAGE) 
        : 20, // Default 20% buffer
      
      minBuffer: process.env.DELIVERY_MIN_BUFFER 
        ? parseFloat(process.env.DELIVERY_MIN_BUFFER) 
        : 2.00, // Minimum buffer in dollars
      
      maxBuffer: process.env.DELIVERY_MAX_BUFFER 
        ? parseFloat(process.env.DELIVERY_MAX_BUFFER) 
        : 10.00, // Maximum buffer in dollars
      
      // Artisan cost absorption limits
      artisanAbsorptionLimit: process.env.ARTISAN_ABSORPTION_LIMIT 
        ? parseFloat(process.env.ARTISAN_ABSORPTION_LIMIT) 
        : 5.00, // Max artisan can be asked to absorb
      
      autoApproveThreshold: process.env.AUTO_APPROVE_THRESHOLD 
        ? parseFloat(process.env.AUTO_APPROVE_THRESHOLD) 
        : 0.50, // Auto-approve cost increases under $0.50
      
      refundThreshold: process.env.REFUND_THRESHOLD 
        ? parseFloat(process.env.REFUND_THRESHOLD) 
        : 0.25, // Don't refund amounts under $0.25
      
      // Timeout configuration
      artisanResponseTimeout: process.env.ARTISAN_RESPONSE_TIMEOUT 
        ? parseInt(process.env.ARTISAN_RESPONSE_TIMEOUT) 
        : 7200, // 2 hours in seconds (default timeout for artisan response)
      
      quoteValidityPeriod: process.env.QUOTE_VALIDITY_PERIOD 
        ? parseInt(process.env.QUOTE_VALIDITY_PERIOD) 
        : 900 // 15 minutes in seconds (how long Uber quotes are valid)
    }
  },
  
  /**
   * Get buffer percentage with constraints
   * @param {Number} estimatedFee - The estimated delivery fee
   * @returns {Object} Buffer configuration for this specific quote
   */
  getBufferConfig(estimatedFee) {
    const config = this.delivery.professionalDelivery;
    let bufferAmount = estimatedFee * (config.bufferPercentage / 100);
    
    // Apply min/max constraints
    if (bufferAmount < config.minBuffer) {
      bufferAmount = config.minBuffer;
    }
    if (bufferAmount > config.maxBuffer) {
      bufferAmount = config.maxBuffer;
    }
    
    const actualPercentage = (bufferAmount / estimatedFee) * 100;
    
    return {
      bufferAmount: parseFloat(bufferAmount.toFixed(2)),
      bufferPercentage: parseFloat(actualPercentage.toFixed(2)),
      chargedAmount: parseFloat((estimatedFee + bufferAmount).toFixed(2)),
      minBuffer: config.minBuffer,
      maxBuffer: config.maxBuffer
    };
  },
  
  /**
   * Check if artisan should be asked to absorb cost increase
   * @param {Number} excessAmount - The amount exceeding the buffer
   * @returns {Boolean} Whether to ask artisan or auto-decline
   */
  shouldAskArtisan(excessAmount) {
    const config = this.delivery.professionalDelivery;
    
    // If under auto-approve threshold, auto-approve
    if (excessAmount <= config.autoApproveThreshold) {
      return { ask: false, autoApprove: true };
    }
    
    // If over absorption limit, auto-decline (cancel order)
    if (excessAmount > config.artisanAbsorptionLimit) {
      return { ask: false, autoDecline: true };
    }
    
    // Otherwise, ask artisan
    return { ask: true };
  },
  
  /**
   * Check if refund should be processed
   * @param {Number} refundAmount - The amount to refund
   * @returns {Boolean} Whether to process the refund
   */
  shouldRefund(refundAmount) {
    return refundAmount >= this.delivery.professionalDelivery.refundThreshold;
  }
};

