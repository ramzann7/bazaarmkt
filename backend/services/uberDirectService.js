/**
 * Uber Direct Delivery Service
 * Handles integration with Uber Direct API for professional delivery
 */

const axios = require('axios');

class UberDirectService {
  constructor() {
    this.baseURL = process.env.UBER_DIRECT_BASE_URL || 'https://api.uber.com';
    this.clientId = process.env.UBER_DIRECT_CLIENT_ID;
    this.clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;
    this.customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
    this.serverToken = process.env.UBER_DIRECT_SERVER_TOKEN;
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
    const fee = (baseFee + (distance * perKmFee)).toFixed(2);

    return {
      success: false,
      fallback: true,
      fee: fee,
      currency: 'CAD',
      duration: Math.max(30, distance * 3), // 3 minutes per km
      pickup_eta: 15,
      estimated: true,
      error: 'Using fallback pricing - Uber Direct API unavailable'
    };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
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
}

module.exports = new UberDirectService();

