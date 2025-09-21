const axios = require('axios');
const crypto = require('crypto');

class UberDirectService {
  constructor() {
    this.baseURL = process.env.UBER_DIRECT_BASE_URL || 'https://api.uber.com';
    this.sandboxURL = 'https://sandbox-api.uber.com';
    this.clientId = process.env.UBER_DIRECT_CLIENT_ID || 'YjCWnouSZ9vEKtMLLRx_EL0WPt8eOw85';
    this.clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;
    this.customerId = process.env.UBER_DIRECT_CUSTOMER_ID || '26513d78-04aa-4ed7-8340-a21b36398b4d';
    this.serverToken = process.env.UBER_DIRECT_SERVER_TOKEN;
    this.environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    
    // Use sandbox URL for development
    this.apiURL = this.environment === 'production' ? this.baseURL : this.sandboxURL;
    
    console.log('🚛 Uber Direct Service initialized:', {
      clientId: this.clientId,
      customerId: this.customerId,
      environment: this.environment,
      apiURL: this.apiURL,
      hasClientSecret: !!this.clientSecret,
      hasServerToken: !!this.serverToken
    });
  }

  /**
   * Get OAuth 2.0 access token for API authentication
   */
  async getAccessToken() {
    try {
      const response = await axios.post(`${this.apiURL}/oauth/v2/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'delivery'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('❌ Error getting Uber Direct access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Uber Direct API');
    }
  }

  /**
   * Create a delivery quote to estimate cost and check availability
   */
  async createQuote(pickupLocation, dropoffLocation, packageDetails = {}) {
    try {
      const accessToken = await this.getAccessToken();
      
      const quoteData = {
        pickup_address: pickupLocation.address,
        pickup_latitude: pickupLocation.latitude,
        pickup_longitude: pickupLocation.longitude,
        pickup_phone_number: pickupLocation.phone || '',
        dropoff_address: dropoffLocation.address,
        dropoff_latitude: dropoffLocation.latitude,
        dropoff_longitude: dropoffLocation.longitude,
        dropoff_phone_number: dropoffLocation.phone || '',
        // Package details
        manifest_items: [{
          name: packageDetails.name || 'Artisan Product',
          quantity: packageDetails.quantity || 1,
          size: packageDetails.size || 'small', // small, medium, large
          price: packageDetails.price || 0,
          dimensions: packageDetails.dimensions || {
            length: 10,
            width: 10,
            height: 10
          },
          weight: packageDetails.weight || 1
        }],
        // Delivery preferences
        delivery_options: {
          dropoff_verification: 'picture', // picture, signature, id_verification
          dropoff_instructions: dropoffLocation.instructions || '',
          pickup_instructions: pickupLocation.instructions || ''
        }
      };

      const response = await axios.post(`${this.apiURL}/v1/customers/${this.customerId}/delivery_quotes`, quoteData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        quote: {
          id: response.data.id,
          fee: response.data.fee,
          currency: response.data.currency_code,
          duration: response.data.duration,
          pickup_eta: response.data.pickup_eta,
          dropoff_eta: response.data.dropoff_eta,
          expires_at: response.data.expires_at,
          pickup_window: response.data.pickup_window,
          dropoff_window: response.data.dropoff_window
        }
      };
    } catch (error) {
      console.error('❌ Error creating Uber Direct quote:', error.response?.data || error.message);
      
      // Return fallback pricing if API fails
      const fallbackDistance = this.calculateDistance(
        pickupLocation.latitude, pickupLocation.longitude,
        dropoffLocation.latitude, dropoffLocation.longitude
      );
      
      return {
        success: false,
        error: error.response?.data?.message || 'Unable to get quote from Uber Direct',
        fallback: {
          fee: this.calculateFallbackFee(fallbackDistance, packageDetails),
          currency: 'CAD',
          duration: Math.max(30, fallbackDistance * 3), // 3 minutes per km, minimum 30 minutes
          pickup_eta: 15, // 15 minutes pickup ETA
          estimated: true
        }
      };
    }
  }

  /**
   * Create a delivery request
   */
  async createDelivery(quoteId, orderDetails, pickupLocation, dropoffLocation) {
    try {
      const accessToken = await this.getAccessToken();
      
      const deliveryData = {
        quote_id: quoteId,
        pickup_name: pickupLocation.contactName || 'Artisan',
        pickup_phone_number: pickupLocation.phone,
        pickup_address: pickupLocation.address,
        pickup_instructions: pickupLocation.instructions || '',
        pickup_reference_tag: `order-${orderDetails.orderId}`,
        dropoff_name: dropoffLocation.contactName,
        dropoff_phone_number: dropoffLocation.phone,
        dropoff_address: dropoffLocation.address,
        dropoff_instructions: dropoffLocation.instructions || '',
        dropoff_reference_tag: `delivery-${orderDetails.orderId}`,
        manifest_reference: orderDetails.orderNumber || orderDetails.orderId,
        // Notification preferences
        pickup_ready_dt: orderDetails.pickupReadyTime || new Date().toISOString(),
        dropoff_ready_dt: orderDetails.dropoffReadyTime || new Date().toISOString(),
        // Return details (if pickup fails)
        return_address: pickupLocation.address,
        return_name: pickupLocation.contactName || 'Artisan',
        return_phone_number: pickupLocation.phone
      };

      const response = await axios.post(`${this.apiURL}/v1/customers/${this.customerId}/deliveries`, deliveryData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        delivery: {
          id: response.data.id,
          status: response.data.status,
          tracking_url: response.data.tracking_url,
          pickup_eta: response.data.pickup_eta,
          dropoff_eta: response.data.dropoff_eta,
          courier: response.data.courier || null
        }
      };
    } catch (error) {
      console.error('❌ Error creating Uber Direct delivery:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create delivery request'
      };
    }
  }

  /**
   * Get delivery status and tracking information
   */
  async getDeliveryStatus(deliveryId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.apiURL}/v1/customers/${this.customerId}/deliveries/${deliveryId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        delivery: {
          id: response.data.id,
          status: response.data.status,
          tracking_url: response.data.tracking_url,
          pickup_eta: response.data.pickup_eta,
          dropoff_eta: response.data.dropoff_eta,
          courier: response.data.courier || null,
          pickup_time: response.data.pickup_time,
          dropoff_time: response.data.dropoff_time,
          live_location: response.data.live_location || null
        }
      };
    } catch (error) {
      console.error('❌ Error getting Uber Direct delivery status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get delivery status'
      };
    }
  }

  /**
   * Cancel a delivery request
   */
  async cancelDelivery(deliveryId, reason = 'Order cancelled') {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(`${this.apiURL}/v1/customers/${this.customerId}/deliveries/${deliveryId}/cancel`, {
        reason: reason
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        cancelled: true,
        refund_amount: response.data.refund_amount || 0
      };
    } catch (error) {
      console.error('❌ Error cancelling Uber Direct delivery:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel delivery'
      };
    }
  }

  /**
   * Check if Uber Direct is available for a location
   */
  async checkAvailability(location) {
    try {
      // For now, check against known coverage areas
      // In production, you might want to call Uber's coverage API
      const supportedCities = [
        'toronto', 'mississauga', 'brampton', 'vaughan', 'markham', 
        'richmond hill', 'scarborough', 'north york', 'etobicoke',
        'montreal', 'vancouver', 'calgary', 'ottawa', 'edmonton'
      ];
      
      const city = location.city?.toLowerCase() || '';
      const isAvailable = supportedCities.some(supportedCity => 
        city.includes(supportedCity) || supportedCity.includes(city)
      );

      return {
        available: isAvailable,
        city: location.city,
        reason: isAvailable ? 'Available in your area' : 'Not available in your area yet'
      };
    } catch (error) {
      return {
        available: false,
        reason: 'Unable to check availability'
      };
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate fallback fee when API is unavailable
   */
  calculateFallbackFee(distance, packageDetails = {}) {
    const baseFee = 8; // Base delivery fee
    const perKmFee = 1.5; // Per kilometer fee
    
    // Add package size/weight surcharge
    let surcharge = 0;
    if (packageDetails.weight > 5) {
      surcharge += 3;
    }
    if (packageDetails.size === 'large' || 
        (packageDetails.dimensions && 
         (packageDetails.dimensions.length > 50 || packageDetails.dimensions.width > 50))) {
      surcharge += 2;
    }
    
    return Math.round((baseFee + (distance * perKmFee) + surcharge) * 100) / 100;
  }

  /**
   * Handle webhook notifications from Uber Direct
   */
  validateWebhook(payload, signature, timestamp) {
    try {
      const webhookSecret = process.env.UBER_DIRECT_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('❌ Uber Direct webhook secret not configured');
        return false;
      }

      // Create expected signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(timestamp + payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('❌ Error validating Uber Direct webhook:', error);
      return false;
    }
  }
}

module.exports = new UberDirectService();
