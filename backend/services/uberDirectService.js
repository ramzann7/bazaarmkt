/**
 * Uber Direct Delivery Service
 * Handles integration with Uber Direct API for professional delivery
 */

const axios = require('axios');

class UberDirectService {
  constructor() {
    this.baseURL = process.env.UBER_DIRECT_BASE_URL || 'https://api.uber.com';
    // Support both UBER_DIRECT_* and UBER_* variable names for backwards compatibility
    this.clientId = process.env.UBER_DIRECT_CLIENT_ID || process.env.UBER_CLIENT_ID;
    this.clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET || process.env.UBER_CLIENT_SECRET;
    this.customerId = process.env.UBER_DIRECT_CUSTOMER_ID || process.env.UBER_CUSTOMER_ID;
    this.serverToken = process.env.UBER_DIRECT_SERVER_TOKEN || process.env.UBER_SERVER_TOKEN;
  }

  /**
   * Get OAuth token for Uber Direct API
   */
  async getAccessToken() {
    try {
      if (this.serverToken) {
        // Use server token if provided (faster, no OAuth needed)
        return this.serverToken;
      }

      if (!this.clientId || !this.clientSecret) {
        throw new Error('Uber Direct credentials not configured');
      }

      const response = await axios.post(`${this.baseURL}/oauth/v2/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'eats.deliveries'
      });

      return response.data.access_token;
    } catch (error) {
      console.error('❌ Error getting Uber Direct access token:', error.message);
      throw new Error('Failed to authenticate with Uber Direct');
    }
  }

  /**
   * Get delivery quote from Uber Direct
   */
  async getDeliveryQuote(pickupLocation, dropoffLocation, packageDetails = {}) {
    // Check if required credentials are available
    if (!this.clientId || !this.clientSecret || (!this.customerId && !this.serverToken)) {
      console.log('⚠️ Uber Direct credentials not configured, using fallback pricing');
      return this.getFallbackQuote(pickupLocation, dropoffLocation, packageDetails);
    }

    try {
      const token = await this.getAccessToken();

      const requestBody = {
        pickup_address: pickupLocation.address,
        pickup_name: pickupLocation.contactName || 'Pickup',
        pickup_phone_number: pickupLocation.phone || '',
        pickup_latitude: pickupLocation.latitude,
        pickup_longitude: pickupLocation.longitude,
        dropoff_address: dropoffLocation.address,
        dropoff_name: dropoffLocation.contactName || 'Customer',
        dropoff_phone_number: dropoffLocation.phone || '',
        dropoff_latitude: dropoffLocation.latitude,
        dropoff_longitude: dropoffLocation.longitude,
        manifest: {
          total_value: packageDetails.price || 0
        },
        package_size: packageDetails.size || 'medium', // small, medium, large
        dropoff_verification: {
          picture: false,
          signature: false
        }
      };

      console.log('🚛 Requesting Uber Direct quote:', {
        pickup: pickupLocation.address,
        dropoff: dropoffLocation.address
      });

      const response = await axios.post(
        `${this.baseURL}/v1/customers/${this.customerId}/delivery_quotes`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const quote = response.data;

      return {
        success: true,
        quoteId: quote.id,
        fee: (quote.fee / 100).toFixed(2), // Convert cents to dollars
        currency: quote.currency,
        duration: quote.dropoff_deadline ? this.calculateDuration(quote) : 45,
        pickup_eta: quote.pickup_eta || 15,
        dropoff_eta: quote.dropoff_eta,
        expires_at: quote.expires_at,
        raw: quote
      };
    } catch (error) {
      console.error('❌ Error getting Uber Direct quote:', error.response?.data || error.message);
      
      // Return fallback quote based on distance
      return this.getFallbackQuote(pickupLocation, dropoffLocation, packageDetails);
    }
  }

  /**
   * Create a delivery request
   */
  async createDelivery(quoteId, orderDetails, pickupLocation, dropoffLocation) {
    try {
      const token = await this.getAccessToken();

      const requestBody = {
        quote_id: quoteId,
        pickup_address: pickupLocation.address,
        pickup_name: pickupLocation.contactName || 'Pickup',
        pickup_phone_number: pickupLocation.phone || '',
        pickup_latitude: pickupLocation.latitude,
        pickup_longitude: pickupLocation.longitude,
        pickup_notes: orderDetails.pickupInstructions || '',
        dropoff_address: dropoffLocation.address,
        dropoff_name: dropoffLocation.contactName || 'Customer',
        dropoff_phone_number: dropoffLocation.phone || '',
        dropoff_latitude: dropoffLocation.latitude,
        dropoff_longitude: dropoffLocation.longitude,
        dropoff_notes: orderDetails.deliveryInstructions || '',
        manifest: {
          reference: orderDetails.orderNumber || '',
          description: orderDetails.description || 'Order delivery',
          total_value: orderDetails.totalAmount || 0
        },
        dropoff_verification: {
          picture: false,
          signature: false
        }
      };

      console.log('🚛 Creating Uber Direct delivery for order:', orderDetails.orderNumber);

      const response = await axios.post(
        `${this.baseURL}/v1/customers/${this.customerId}/deliveries`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const delivery = response.data;

      return {
        success: true,
        deliveryId: delivery.id,
        trackingUrl: delivery.tracking_url,
        status: delivery.status,
        courier: delivery.courier,
        raw: delivery
      };
    } catch (error) {
      console.error('❌ Error creating Uber Direct delivery:', error.response?.data || error.message);
      throw new Error('Failed to create delivery request');
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(deliveryId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseURL}/v1/customers/${this.customerId}/deliveries/${deliveryId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        courier: response.data.courier,
        tracking_url: response.data.tracking_url,
        raw: response.data
      };
    } catch (error) {
      console.error('❌ Error getting delivery status:', error.message);
      throw new Error('Failed to get delivery status');
    }
  }

  /**
   * Cancel a delivery
   */
  async cancelDelivery(deliveryId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/v1/customers/${this.customerId}/deliveries/${deliveryId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status
      };
    } catch (error) {
      console.error('❌ Error cancelling delivery:', error.message);
      throw new Error('Failed to cancel delivery');
    }
  }

  /**
   * Calculate fallback quote when API is unavailable
   */
  getFallbackQuote(pickupLocation, dropoffLocation, packageDetails) {
    const distance = this.calculateDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      dropoffLocation.latitude,
      dropoffLocation.longitude
    );

    const baseFee = 8; // Base fee in CAD
    const perKmFee = 1.5; // Per km fee
    
    // Use default distance if calculation failed
    const safeDistance = (distance && distance > 0) ? distance : 10; // Default 10km
    const fee = (baseFee + (safeDistance * perKmFee)).toFixed(2);

    return {
      success: false,
      fallback: true,
      fee: fee,
      currency: 'CAD',
      duration: Math.max(30, safeDistance * 3), // 3 minutes per km
      pickup_eta: 15,
      estimated: true,
      error: 'Using fallback pricing - Uber Direct API unavailable'
    };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Validate coordinates
    if (!lat1 || !lon1 || !lat2 || !lon2 || 
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.warn('⚠️ Invalid coordinates for distance calculation:', { lat1, lon1, lat2, lon2 });
      return 0; // Return 0 to trigger fallback
    }
    
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Calculate delivery duration from quote
   */
  calculateDuration(quote) {
    if (quote.dropoff_deadline) {
      const now = new Date();
      const deadline = new Date(quote.dropoff_deadline);
      const durationMs = deadline - now;
      return Math.ceil(durationMs / 60000); // Convert to minutes
    }
    return 45; // Default 45 minutes
  }

  /**
   * Get delivery quote with buffer for surge protection
   * @param {Object} pickupLocation - Pickup location details
   * @param {Object} dropoffLocation - Dropoff location details
   * @param {Object} packageDetails - Package details
   * @param {Number} bufferPercentage - Buffer percentage (default 20%)
   * @returns {Object} Quote with buffer information
   */
  async getQuoteWithBuffer(pickupLocation, dropoffLocation, packageDetails = {}, bufferPercentage = 20) {
    try {
      console.log('🚛 Getting Uber Direct quote with buffer:', { bufferPercentage });

      // Get base quote from Uber
      const baseQuote = await this.getDeliveryQuote(pickupLocation, dropoffLocation, packageDetails);
      
      if (!baseQuote.success && !baseQuote.fallback) {
        throw new Error('Unable to get delivery quote');
      }
      
      const estimatedFee = baseQuote.success 
        ? parseFloat(baseQuote.fee) 
        : parseFloat(baseQuote.fallback?.fee || baseQuote.fee);
      
      // Calculate buffer
      const buffer = estimatedFee * (bufferPercentage / 100);
      const chargedAmount = estimatedFee + buffer;
      
      console.log('💰 Buffer calculation:', {
        estimatedFee: estimatedFee.toFixed(2),
        bufferPercentage,
        buffer: buffer.toFixed(2),
        chargedAmount: chargedAmount.toFixed(2)
      });

      return {
        success: true,
        estimatedFee: estimatedFee.toFixed(2),
        buffer: buffer.toFixed(2),
        bufferPercentage: bufferPercentage,
        chargedAmount: chargedAmount.toFixed(2),
        quoteId: baseQuote.quoteId || `fallback_${Date.now()}`,
        expiresAt: baseQuote.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        duration: baseQuote.duration || (baseQuote.fallback?.duration),
        pickupEta: baseQuote.pickup_eta || (baseQuote.fallback?.pickup_eta),
        dropoffEta: baseQuote.dropoff_eta,
        currency: baseQuote.currency || 'CAD',
        explanation: `Delivery fee includes ${bufferPercentage}% buffer for surge protection. Any unused amount will be refunded.`,
        raw: baseQuote
      };
    } catch (error) {
      console.error('❌ Error getting quote with buffer:', error);
      throw error;
    }
  }

  /**
   * Process order ready for delivery
   * Gets fresh quote, compares with charged amount, handles refund/excess
   * @param {Object} order - Order document
   * @param {Object} db - Database connection
   * @returns {Object} Processing result with action taken
   */
  async processReadyForDelivery(order, db) {
    try {
      console.log('🚛 Processing ready for delivery for order:', order._id.toString());
      
      // Get fresh Uber quote
      const pickupLocation = this.extractPickupLocation(order);
      const dropoffLocation = this.extractDropoffLocation(order);
      const packageDetails = this.extractPackageDetails(order);
      
      console.log('📍 Extracted locations:', {
        pickup: pickupLocation.address,
        dropoff: dropoffLocation.address
      });

      const freshQuote = await this.getDeliveryQuote(pickupLocation, dropoffLocation, packageDetails);
      
      if (!freshQuote.success && !freshQuote.fallback) {
        throw new Error('Unable to get delivery quote at ready_for_delivery time');
      }
      
      const actualFee = freshQuote.success 
        ? parseFloat(freshQuote.fee) 
        : parseFloat(freshQuote.fallback?.fee || freshQuote.fee);
      
      const chargedAmount = order.deliveryPricing?.chargedAmount || order.deliveryFee || 0;
      const estimatedFee = order.deliveryPricing?.estimatedFee || chargedAmount;
      
      console.log('💰 Delivery pricing comparison:', {
        estimatedFee,
        actualFee,
        chargedAmount,
        difference: (chargedAmount - actualFee).toFixed(2)
      });
      
      // Scenario A: Actual cost is lower - refund the difference
      if (actualFee < chargedAmount) {
        const refundAmount = chargedAmount - actualFee;
        
        console.log(`✅ Delivery cost lower. Refunding $${refundAmount.toFixed(2)} to buyer`);
        
        // Process refund (only if significant amount)
        const userId = order.userId?.toString() || order.user?.toString();
        
        if (userId && refundAmount >= 0.25) { // Don't refund tiny amounts
          const WalletService = require('./WalletService');
          const walletService = new WalletService(db);
          
          await walletService.addFunds(
            userId,
            refundAmount,
            'delivery_refund',
            {
              orderId: order._id,
              orderNumber: order._id.toString().slice(-8),
              reason: 'Delivery cost was lower than estimated',
              estimatedFee,
              actualFee,
              chargedAmount,
              refundAmount
            }
          );
        }
        
        // Create Uber delivery
        const delivery = await this.createDelivery(
          freshQuote.quoteId,
          {
            orderNumber: order._id.toString().slice(-8),
            description: `Order from ${order.artisan?.artisanName || 'artisan'}`,
            totalAmount: order.totalAmount,
            pickupInstructions: order.pickupInstructions || '',
            deliveryInstructions: order.deliveryInstructions || ''
          },
          pickupLocation,
          dropoffLocation
        );
        
        // Update order
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'deliveryPricing.actualFee': actualFee,
              'deliveryPricing.refundAmount': refundAmount,
              'deliveryPricing.actualUberQuoteId': freshQuote.quoteId,
              'deliveryPricing.lastUpdated': new Date(),
              'uberDelivery': {
                status: 'requested',
                deliveryId: delivery.deliveryId,
                trackingUrl: delivery.trackingUrl,
                courier: delivery.courier || {},
                createdAt: new Date(),
                updatedAt: new Date()
              },
              status: 'out_for_delivery',
              updatedAt: new Date()
            }
          }
        );
        
        return {
          success: true,
          action: 'refund_processed',
          refundAmount,
          delivery,
          actualFee,
          message: `Delivery created and $${refundAmount.toFixed(2)} refunded to buyer`
        };
      }
      
      // Scenario B: Actual cost is within charged amount - proceed
      else if (actualFee <= chargedAmount) {
        console.log(`✅ Delivery cost within budget. Creating delivery.`);
        
        // Create Uber delivery
        const delivery = await this.createDelivery(
          freshQuote.quoteId,
          {
            orderNumber: order._id.toString().slice(-8),
            description: `Order from ${order.artisan?.artisanName || 'artisan'}`,
            totalAmount: order.totalAmount,
            pickupInstructions: order.pickupInstructions || '',
            deliveryInstructions: order.deliveryInstructions || ''
          },
          pickupLocation,
          dropoffLocation
        );
        
        // Update order with delivery info and change status to out_for_delivery
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'deliveryPricing.actualFee': actualFee,
              'deliveryPricing.actualUberQuoteId': freshQuote.quoteId,
              'deliveryPricing.lastUpdated': new Date(),
              'uberDelivery': {
                status: 'requested',
                deliveryId: delivery.deliveryId,
                trackingUrl: delivery.trackingUrl,
                courier: delivery.courier || {},
                pickupEta: delivery.pickupEta || null,
                dropoffEta: delivery.dropoffEta || null,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              status: 'out_for_delivery',
              updatedAt: new Date()
            }
          }
        );
        
        return {
          success: true,
          action: 'delivery_created',
          delivery,
          actualFee,
          message: 'Delivery created successfully'
        };
      }
      
      // Scenario C: Actual cost exceeds charged amount - need artisan decision
      else {
        const excessAmount = actualFee - chargedAmount;
        
        console.log(`⚠️ Delivery cost increased by $${excessAmount.toFixed(2)}. Awaiting artisan response.`);
        
        // Update order with cost absorption requirement
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'deliveryPricing.actualFee': actualFee,
              'deliveryPricing.actualUberQuoteId': freshQuote.quoteId,
              'deliveryPricing.lastUpdated': new Date(),
              'costAbsorption': {
                required: true,
                amount: excessAmount,
                artisanResponse: 'pending',
                notifiedAt: new Date(),
                quoteId: freshQuote.quoteId,
                expiresAt: freshQuote.expires_at
              },
              status: 'ready_for_delivery', // Keep in this status until decision
              updatedAt: new Date()
            }
          }
        );
        
        return {
          success: true,
          action: 'awaiting_artisan_response',
          excessAmount,
          actualFee,
          message: `Delivery cost increased by $${excessAmount.toFixed(2)}. Awaiting artisan decision.`
        };
      }
      
    } catch (error) {
      console.error('❌ Error processing ready for delivery:', error);
      throw error;
    }
  }

  /**
   * Handle artisan response to cost absorption
   * @param {ObjectId} orderId - Order ID
   * @param {String} response - 'accepted' or 'declined'
   * @param {Object} db - Database connection
   * @returns {Object} Processing result
   */
  async handleArtisanCostResponse(orderId, response, db) {
    try {
      const ObjectId = require('mongodb').ObjectId;
      const order = await db.collection('orders').findOne({ _id: orderId });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (!order.costAbsorption || !order.costAbsorption.required) {
        throw new Error('No cost absorption pending for this order');
      }
      
      const excessAmount = order.costAbsorption.amount;
      
      if (response === 'accepted') {
        console.log(`✅ Artisan accepted to absorb $${excessAmount.toFixed(2)}`);
        
        // Create Uber delivery
        const pickupLocation = this.extractPickupLocation(order);
        const dropoffLocation = this.extractDropoffLocation(order);
        
        const delivery = await this.createDelivery(
          order.costAbsorption.quoteId,
          {
            orderNumber: order._id.toString().slice(-8),
            description: `Order from ${order.artisan?.artisanName || 'artisan'}`,
            totalAmount: order.totalAmount,
            pickupInstructions: order.pickupInstructions || '',
            deliveryInstructions: order.deliveryInstructions || ''
          },
          pickupLocation,
          dropoffLocation
        );
        
        // Deduct from artisan wallet/earnings
        const WalletService = require('./WalletService');
        const walletService = new WalletService(db);
        
        const artisan = await db.collection('artisans').findOne({ _id: order.artisan });
        const artisanUserId = artisan?.user?.toString();
        
        if (artisanUserId) {
          await walletService.deductFunds(
            artisanUserId,
            excessAmount,
            `Absorbed delivery cost increase for order #${order._id.toString().slice(-8)}`,
            {
              orderId: order._id,
              orderNumber: order._id.toString().slice(-8),
              reason: 'delivery_cost_absorption',
              excessAmount
            }
          );
        }
        
        // Update order
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'deliveryPricing.artisanAbsorbed': excessAmount,
              'costAbsorption.artisanResponse': 'accepted',
              'costAbsorption.respondedAt': new Date(),
              'uberDelivery': {
                status: 'requested',
                deliveryId: delivery.deliveryId,
                trackingUrl: delivery.trackingUrl,
                courier: delivery.courier || {},
                createdAt: new Date(),
                updatedAt: new Date()
              },
              status: 'out_for_delivery',
              updatedAt: new Date()
            }
          }
        );
        
        return {
          success: true,
          action: 'cost_absorbed',
          delivery,
          excessAmount,
          message: 'Delivery created. Cost absorbed by artisan.'
        };
      }
      
      else if (response === 'declined') {
        console.log(`❌ Artisan declined to absorb cost. Cancelling order.`);
        
        // Refund full amount to buyer
        const WalletService = require('./WalletService');
        const walletService = new WalletService(db);
        
        const userId = order.userId?.toString() || order.user?.toString();
        
        if (userId) {
          await walletService.addFunds(
            userId,
            order.totalAmount,
            'order_cancellation_refund',
            {
              orderId: order._id,
              orderNumber: order._id.toString().slice(-8),
              reason: 'Artisan declined to absorb delivery cost increase',
              refundAmount: order.totalAmount
            }
          );
        }
        
        // Restore inventory
        const InventoryService = require('./InventoryService');
        const inventoryService = new InventoryService(db);
        await inventoryService.restoreInventoryForOrder(order);
        
        // Update order
        await db.collection('orders').updateOne(
          { _id: order._id },
          {
            $set: {
              'costAbsorption.artisanResponse': 'declined',
              'costAbsorption.respondedAt': new Date(),
              status: 'cancelled',
              cancellationReason: 'Artisan declined to absorb delivery cost increase',
              paymentStatus: 'refunded',
              updatedAt: new Date()
            }
          }
        );
        
        return {
          success: true,
          action: 'order_cancelled',
          refundAmount: order.totalAmount,
          message: 'Order cancelled and refunded'
        };
      }
      
      else {
        throw new Error('Invalid response. Must be "accepted" or "declined"');
      }
      
    } catch (error) {
      console.error('❌ Error handling artisan cost response:', error);
      throw error;
    }
  }

  /**
   * Extract pickup location from order
   * @param {Object} order - Order document
   * @returns {Object} Pickup location details
   */
  extractPickupLocation(order) {
    const artisan = order.artisan || {};
    return {
      address: `${artisan.address?.street || ''}, ${artisan.address?.city || ''}, ${artisan.address?.state || ''}, ${artisan.address?.country || 'Canada'}`.trim(),
      latitude: artisan.address?.latitude || artisan.coordinates?.latitude,
      longitude: artisan.address?.longitude || artisan.coordinates?.longitude,
      phone: artisan.phone || '',
      contactName: artisan.artisanName || 'Artisan'
    };
  }

  /**
   * Extract dropoff location from order
   * @param {Object} order - Order document
   * @returns {Object} Dropoff location details
   */
  extractDropoffLocation(order) {
    const deliveryAddr = order.deliveryAddress || {};
    const guestInfo = order.guestInfo || {};
    
    return {
      address: `${deliveryAddr.street || ''}, ${deliveryAddr.city || ''}, ${deliveryAddr.state || ''}, ${deliveryAddr.country || 'Canada'}`.trim(),
      latitude: deliveryAddr.latitude,
      longitude: deliveryAddr.longitude,
      phone: deliveryAddr.phone || guestInfo.phone || '',
      contactName: `${deliveryAddr.firstName || ''} ${deliveryAddr.lastName || ''}`.trim() || 'Customer'
    };
  }

  /**
   * Extract package details from order
   * @param {Object} order - Order document
   * @returns {Object} Package details
   */
  extractPackageDetails(order) {
    const totalWeight = order.items?.reduce((sum, item) => sum + ((item.weight || 1) * item.quantity), 0) || 1;
    
    return {
      name: `Order #${order._id.toString().slice(-8)}`,
      quantity: order.items?.length || 1,
      weight: totalWeight,
      price: order.subtotal || order.totalAmount,
      size: totalWeight > 5 ? 'large' : totalWeight > 2 ? 'medium' : 'small'
    };
  }
}

module.exports = new UberDirectService();

