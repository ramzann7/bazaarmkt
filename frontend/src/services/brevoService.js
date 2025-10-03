import axios from 'axios';
import { getBrevoConfig, getBrevoApiKey } from '../config/brevoConfig';

// Brevo API configuration
const BREVO_CONFIG = getBrevoConfig();
const BREVO_API_URL = BREVO_CONFIG.API_URL;
let BREVO_API_KEY = null;

// Initialize the Brevo service with API key
export const initializeBrevo = (apiKey) => {
  // First try to get from environment variable
  const envApiKey = getBrevoApiKey();
  
  if (envApiKey) {
    BREVO_API_KEY = envApiKey.trim();
    console.log('🔧 Brevo service initialized with environment API key:', `***${envApiKey.slice(-4)}`);
    console.log('🔧 API key length:', envApiKey.length);
    return;
  }
  
  // Fall back to provided API key
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('Invalid API key provided and no environment variable found');
  }
  
  BREVO_API_KEY = apiKey.trim();
  console.log('🔧 Brevo service initialized with provided API key:', `***${apiKey.slice(-4)}`);
  console.log('🔧 API key length:', apiKey.length);
};

// Get Brevo API headers
const getBrevoHeaders = () => {
  if (!BREVO_API_KEY) {
    throw new Error('Brevo API key not initialized. Call initializeBrevo() first.');
  }
  
  return {
    'api-key': BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

// Send transactional email
export const sendTransactionalEmail = async (emailData) => {
  try {
    console.log('🔍 sendTransactionalEmail called');
    console.log('🔍 BREVO_API_KEY status:', BREVO_API_KEY ? 'Set' : 'Not set');
    console.log('🔍 API Key preview:', BREVO_API_KEY ? `***${BREVO_API_KEY.slice(-4)}` : 'None');
    
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not initialized');
    }

    const headers = getBrevoHeaders();
    console.log('🔍 Headers being sent:', headers);
    console.log('🔍 API URL:', `${BREVO_API_URL}/smtp/email`);
    console.log('🔍 Email data:', emailData);

    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      emailData,
      { headers }
    );

    console.log('✅ Brevo email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending Brevo email:', error.response?.data || error.message);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error headers:', error.response?.headers);
    throw error;
  }
};

// Create or update contact
export const createOrUpdateContact = async (contactData) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not initialized');
    }

    const response = await axios.post(
      `${BREVO_API_URL}/contacts`,
      contactData,
      { headers: getBrevoHeaders() }
    );

    console.log('✅ Brevo contact created/updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating/updating Brevo contact:', error.response?.data || error.message);
    throw error;
  }
};

// Get contact by email
export const getContactByEmail = async (email) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not initialized');
    }

    const response = await axios.get(
      `${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`,
      { headers: getBrevoHeaders() }
    );

    console.log('✅ Brevo contact retrieved successfully:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ Contact not found in Brevo:', email);
      return null;
    }
    console.error('❌ Error retrieving Brevo contact:', error.response?.data || error.message);
    throw error;
  }
};

// Delete contact
export const deleteContact = async (email) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not initialized');
    }

    const response = await axios.delete(
      `${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`,
      { headers: getBrevoHeaders() }
    );

    console.log('✅ Brevo contact deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting Brevo contact:', error.response?.data || error.message);
    throw error;
  }
};

// Send order completion email
export const sendOrderCompletionEmail = async (orderData, recipientEmail, recipientName) => {
  try {
    console.log('🔍 Brevo sendOrderCompletionEmail called with:', { orderData, recipientEmail, recipientName });
    console.log('🔍 BREVO_API_KEY status:', BREVO_API_KEY ? 'Set' : 'Not set');
    console.log('🔍 API Key preview:', BREVO_API_KEY ? `***${BREVO_API_KEY.slice(-4)}` : 'None');
    
    const emailData = {
      sender: {
        name: 'bazaar',
        email: 'bazaar@bazaarmkt.ca'
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName
        }
      ],
      subject: `Order Confirmed - #${orderData.orderNumber || orderData._id}`,
      htmlContent: generateOrderCompletionHTML(orderData, recipientName),
      textContent: generateOrderCompletionText(orderData, recipientName)
    };

    console.log('🔍 Email data prepared:', emailData);
    console.log('🔍 Headers to be sent:', getBrevoHeaders());
    
    return await sendTransactionalEmail(emailData);
  } catch (error) {
    console.error('❌ Error sending order completion email:', error);
    throw error;
  }
};

// Send order update email
export const sendOrderUpdateEmail = async (orderData, recipientEmail, recipientName, updateType, updateDetails) => {
  try {
    const emailData = {
      sender: {
        name: 'bazaar',
        email: 'bazaar@bazaarmkt.ca'
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName
        }
      ],
      subject: `Order Update - #${orderData.orderNumber || orderData._id}`,
      htmlContent: generateOrderUpdateHTML(orderData, recipientName, updateType, updateDetails),
      textContent: generateOrderUpdateText(orderData, recipientName, updateType, updateDetails)
    };

    return await sendTransactionalEmail(emailData);
  } catch (error) {
    console.error('❌ Error sending order update email:', error);
    throw error;
  }
};

// Generate HTML content for order completion email
const generateOrderCompletionHTML = (orderData, recipientName) => {
  const orderItems = orderData.items?.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.unitPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('') || '';

  const isPickupOrder = orderData.deliveryMethod === 'pickup';
  const deliveryInfo = isPickupOrder 
    ? `<p><strong>Pickup Location:</strong> ${orderData.artisan?.artisanName || 'Artisan Location'}</p>`
    : `<p><strong>Delivery Address:</strong><br>${orderData.deliveryAddress?.street}, ${orderData.deliveryAddress?.city}, ${orderData.deliveryAddress?.state} ${orderData.deliveryAddress?.zipCode}</p>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order, ${recipientName}!</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Order Details</h2>
        <p><strong>Order Number:</strong> #${orderData.orderNumber || orderData._id}</p>
        <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${orderData.totalAmount?.toFixed(2) || '0.00'}</p>
        
        <h3 style="color: #333; margin-top: 25px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems}
          </tbody>
        </table>
        
        <h3 style="color: #333; margin-top: 25px;">${isPickupOrder ? 'Pickup Information' : 'Delivery Information'}</h3>
        ${deliveryInfo}
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #2d5a2d; margin-top: 0;">What Happens Next?</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Your order has been received and confirmed</li>
            <li>${isPickupOrder ? 'The artisan will prepare your order' : 'The artisan will prepare and deliver your order'}</li>
            <li>You'll receive updates on your order status</li>
            <li>${isPickupOrder ? 'Visit the artisan to collect your order' : 'Your order will be delivered to your address'}</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 14px;">Thank you for choosing bazaar!</p>
          <p style="color: #666; font-size: 14px;">Contact: bazaar@bazaarmkt.ca</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate text content for order completion email
const generateOrderCompletionText = (orderData, recipientName) => {
  const orderItems = orderData.items?.map(item => 
    `${item.name} - Qty: ${item.quantity} - Price: $${item.unitPrice} - Total: $${(item.unitPrice * item.quantity).toFixed(2)}`
  ).join('\n') || '';

  const isPickupOrder = orderData.deliveryMethod === 'pickup';
  const deliveryInfo = isPickupOrder 
    ? `Pickup Location: ${orderData.artisan?.artisanName || 'Artisan Location'}`
    : `Delivery Address: ${orderData.deliveryAddress?.street}, ${orderData.deliveryAddress?.city}, ${orderData.deliveryAddress?.state} ${orderData.deliveryAddress?.zipCode}`;

  return `
Order Confirmed!

Thank you for your order, ${recipientName}!

Order Details:
Order Number: #${orderData.orderNumber || orderData._id}
Order Date: ${new Date(orderData.createdAt).toLocaleDateString()}
Total Amount: $${orderData.totalAmount?.toFixed(2) || '0.00'}

Order Items:
${orderItems}

${isPickupOrder ? 'Pickup Information' : 'Delivery Information'}:
${deliveryInfo}

What Happens Next?
1. Your order has been received and confirmed
2. ${isPickupOrder ? 'The artisan will prepare your order' : 'The artisan will prepare and deliver your order'}
3. You'll receive updates on your order status
4. ${isPickupOrder ? 'Visit the artisan to collect your order' : 'Your order will be delivered to your address'}

Thank you for choosing bazaar!
Contact: bazaar@bazaarmkt.ca
  `;
};

// Generate HTML content for order update email
const generateOrderUpdateHTML = (orderData, recipientName, updateType, updateDetails) => {
  const updateMessages = {
    'status_change': `Your order status has been updated to: <strong>${updateDetails.newStatus}</strong>`,
    'delivery_update': `Delivery update: <strong>${updateDetails.message}</strong>`,
    'pickup_ready': `Your order is ready for pickup at <strong>${orderData.artisan?.artisanName || 'the artisan location'}</strong>`,
    'delivery_scheduled': `Your delivery has been scheduled for <strong>${updateDetails.scheduledTime}</strong>`,
    'custom': updateDetails.message || 'Your order has been updated'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📢 Order Update</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Hello ${recipientName}, your order has been updated!</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Order Update</h2>
        <p><strong>Order Number:</strong> #${orderData.orderNumber || orderData._id}</p>
        <p><strong>Update Type:</strong> ${updateType.replace('_', ' ').toUpperCase()}</p>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Update Details</h3>
          <p style="margin: 0;">${updateMessages[updateType] || updateMessages.custom}</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #2d5a2d; margin-top: 0;">Need Help?</h3>
          <p style="margin: 0;">If you have any questions about this update, please contact us at bazaar@bazaarmkt.ca</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 14px;">Thank you for choosing bazaar!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate text content for order update email
const generateOrderUpdateText = (orderData, recipientName, updateType, updateDetails) => {
  const updateMessages = {
    'status_change': `Your order status has been updated to: ${updateDetails.newStatus}`,
    'delivery_update': `Delivery update: ${updateDetails.message}`,
    'pickup_ready': `Your order is ready for pickup at ${orderData.artisan?.artisanName || 'the artisan location'}`,
    'delivery_scheduled': `Your delivery has been scheduled for ${updateDetails.scheduledTime}`,
    'custom': updateDetails.message || 'Your order has been updated'
  };

  return `
Order Update

Hello ${recipientName}, your order has been updated!

Order Update:
Order Number: #${orderData.orderNumber || orderData._id}
Update Type: ${updateType.replace('_', ' ').toUpperCase()}

Update Details:
${updateMessages[updateType] || updateMessages.custom}

Need Help?
If you have any questions about this update, please contact us at bazaar@bazaarmkt.ca

Thank you for choosing bazaar!
  `;
};

// Check if Brevo is initialized
export const isBrevoInitialized = () => {
  return !!BREVO_API_KEY;
};

// Get Brevo API status
export const getBrevoStatus = () => {
  return {
    initialized: !!BREVO_API_KEY,
    apiKey: BREVO_API_KEY ? '***' + BREVO_API_KEY.slice(-4) : null
  };
};

// Test Brevo API connection
export const testBrevoConnection = async () => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not initialized');
    }

    console.log('🔍 Testing Brevo connection...');
    console.log('🔍 API Key preview:', `***${BREVO_API_KEY.slice(-4)}`);
    
    // Test with a simple API call to get account info
    const response = await axios.get(
      `${BREVO_API_URL}/account`,
      { headers: getBrevoHeaders() }
    );

    console.log('✅ Brevo connection test successful:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Brevo connection test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};
