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

// Helper function to format pickup time for email
const formatPickupTimeForEmail = (selectedPickupTimes) => {
  if (!selectedPickupTimes || typeof selectedPickupTimes !== 'object') {
    return 'Not specified';
  }
  
  // Handle different pickup time formats
  const timeEntries = Object.entries(selectedPickupTimes);
  if (timeEntries.length === 0) {
    return 'Not specified';
  }
  
  const [artisanId, timeWindow] = timeEntries[0];
  if (!timeWindow) {
    return 'Not specified';
  }
  
  // Format the time window
  if (timeWindow.date && timeWindow.timeSlot) {
    const date = new Date(timeWindow.date);
    return `${date.toLocaleDateString()} at ${timeWindow.timeSlot}`;
  } else if (timeWindow.date && timeWindow.startTime && timeWindow.endTime) {
    const date = new Date(timeWindow.date);
    return `${date.toLocaleDateString()} from ${timeWindow.startTime} to ${timeWindow.endTime}`;
  }
  
  return 'Not specified';
};

// Helper function to get status-specific information
const getStatusInfo = (status) => {
  const statusMap = {
    'pending': {
      icon: '📦',
      title: 'Order Received',
      message: 'Your order has been received and is being reviewed by the artisan.',
      color: '#6c757d',
      bgColor: '#f8f9fa'
    },
    'confirmed': {
      icon: '✅',
      title: 'Order Confirmed',
      message: 'Your order has been confirmed by the artisan and is being prepared.',
      color: '#28a745',
      bgColor: '#d4edda'
    },
    'preparing': {
      icon: '👨‍🍳',
      title: 'Order Being Prepared',
      message: 'Your order is currently being prepared by the artisan.',
      color: '#007bff',
      bgColor: '#d1ecf1'
    },
    'ready_for_pickup': {
      icon: '✨',
      title: 'Ready for Pickup',
      message: 'Your order is ready for pickup! Please visit the artisan to collect your items.',
      color: '#17a2b8',
      bgColor: '#d1ecf1'
    },
    'ready_for_delivery': {
      icon: '✨',
      title: 'Ready for Delivery',
      message: 'Your order is ready and will be delivered to you shortly.',
      color: '#17a2b8',
      bgColor: '#d1ecf1'
    },
    'out_for_delivery': {
      icon: '🚚',
      title: 'Out for Delivery',
      message: 'Your order is on its way! Please be available to receive your delivery.',
      color: '#fd7e14',
      bgColor: '#fff3cd'
    },
    'delivered': {
      icon: '📬',
      title: 'Order Delivered',
      message: 'Your order has been successfully delivered! We hope you enjoy your purchase.',
      color: '#28a745',
      bgColor: '#d4edda'
    },
    'picked_up': {
      icon: '✅',
      title: 'Order Picked Up',
      message: 'Your order has been successfully picked up! Thank you for your business.',
      color: '#28a745',
      bgColor: '#d4edda'
    },
    'completed': {
      icon: '🎉',
      title: 'Order Completed',
      message: 'Your order has been completed successfully! Thank you for choosing us.',
      color: '#28a745',
      bgColor: '#d4edda'
    },
    'cancelled': {
      icon: '❌',
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. Any payment will be refunded according to our refund policy.',
      color: '#dc3545',
      bgColor: '#f8d7da'
    },
    'declined': {
      icon: '⚠️',
      title: 'Order Declined',
      message: 'Unfortunately, your order has been declined by the artisan. Any payment will be refunded.',
      color: '#dc3545',
      bgColor: '#f8d7da'
    }
  };
  
  return statusMap[status] || {
    icon: '📦',
    title: 'Order Update',
    message: 'Your order status has been updated.',
    color: '#6c757d',
    bgColor: '#f8f9fa'
  };
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
  
  // Generate pickup information
  let pickupInfo = '';
  if (isPickupOrder) {
    pickupInfo = `
      <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="color: #2d5a2d; margin-top: 0;">📍 Pickup Location</h4>
        <p><strong>Artisan:</strong> ${orderData.artisan?.artisanName || 'Artisan Location'}</p>
        ${orderData.artisan?.pickupAddress ? `
          <p><strong>Address:</strong><br>
          ${orderData.artisan.pickupAddress.street}<br>
          ${orderData.artisan.pickupAddress.city}, ${orderData.artisan.pickupAddress.state} ${orderData.artisan.pickupAddress.zipCode}</p>
        ` : ''}
        ${orderData.artisan?.pickupHours ? `<p><strong>Pickup Hours:</strong> ${orderData.artisan.pickupHours}</p>` : ''}
        ${orderData.artisan?.pickupInstructions ? `<p><strong>Instructions:</strong> ${orderData.artisan.pickupInstructions}</p>` : ''}
        ${orderData.selectedPickupTimes ? `
          <p><strong>Scheduled Pickup Time:</strong> ${formatPickupTimeForEmail(orderData.selectedPickupTimes)}</p>
        ` : ''}
      </div>
    `;
  }
  
  // Generate delivery information
  let deliveryInfo = '';
  if (!isPickupOrder) {
    deliveryInfo = `
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="color: #856404; margin-top: 0;">🚚 Delivery Information</h4>
        <p><strong>Delivery Method:</strong> ${orderData.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : orderData.deliveryMethod === 'professionalDelivery' ? 'Professional Delivery' : 'Standard Delivery'}</p>
        <p><strong>Delivery Address:</strong><br>
        ${orderData.deliveryAddress?.street || 'Address not provided'}<br>
        ${orderData.deliveryAddress?.city || 'City'}, ${orderData.deliveryAddress?.state || 'State'} ${orderData.deliveryAddress?.zipCode || ''}</p>
        ${orderData.deliveryInstructions ? `<p><strong>Delivery Instructions:</strong> ${orderData.deliveryInstructions}</p>` : ''}
      </div>
    `;
  }

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
        
        <!-- Cost Breakdown -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #333; margin-top: 0;">💰 Cost Breakdown</h4>
          <p><strong>Subtotal:</strong> $${(orderData.subtotal || orderData.totalAmount || 0).toFixed(2)}</p>
          ${orderData.deliveryFee && orderData.deliveryFee > 0 ? `
            <p><strong>Delivery Fee:</strong> $${orderData.deliveryFee.toFixed(2)}</p>
          ` : ''}
          <p style="font-size: 18px; font-weight: bold; color: #2d5a2d; margin-bottom: 0;"><strong>Total Amount:</strong> $${orderData.totalAmount?.toFixed(2) || '0.00'}</p>
        </div>
        
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
        ${pickupInfo}
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
  
  let deliveryInfo = '';
  if (isPickupOrder) {
    deliveryInfo = `Pickup Location: ${orderData.artisan?.artisanName || 'Artisan Location'}`;
    if (orderData.artisan?.pickupAddress) {
      deliveryInfo += `\nAddress: ${orderData.artisan.pickupAddress.street}, ${orderData.artisan.pickupAddress.city}, ${orderData.artisan.pickupAddress.state} ${orderData.artisan.pickupAddress.zipCode}`;
    }
    if (orderData.artisan?.pickupHours) {
      deliveryInfo += `\nPickup Hours: ${orderData.artisan.pickupHours}`;
    }
    if (orderData.artisan?.pickupInstructions) {
      deliveryInfo += `\nInstructions: ${orderData.artisan.pickupInstructions}`;
    }
    if (orderData.selectedPickupTimes) {
      deliveryInfo += `\nScheduled Pickup Time: ${formatPickupTimeForEmail(orderData.selectedPickupTimes)}`;
    }
  } else {
    deliveryInfo = `Delivery Method: ${orderData.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : orderData.deliveryMethod === 'professionalDelivery' ? 'Professional Delivery' : 'Standard Delivery'}`;
    deliveryInfo += `\nDelivery Address: ${orderData.deliveryAddress?.street || 'Address not provided'}, ${orderData.deliveryAddress?.city || 'City'}, ${orderData.deliveryAddress?.state || 'State'} ${orderData.deliveryAddress?.zipCode || ''}`;
    if (orderData.deliveryInstructions) {
      deliveryInfo += `\nDelivery Instructions: ${orderData.deliveryInstructions}`;
    }
  }

  return `
Order Confirmed!

Thank you for your order, ${recipientName}!

Order Details:
Order Number: #${orderData.orderNumber || orderData._id}
Order Date: ${new Date(orderData.createdAt).toLocaleDateString()}

Cost Breakdown:
Subtotal: $${(orderData.subtotal || orderData.totalAmount || 0).toFixed(2)}
${orderData.deliveryFee && orderData.deliveryFee > 0 ? `Delivery Fee: $${orderData.deliveryFee.toFixed(2)}\n` : ''}Total Amount: $${orderData.totalAmount?.toFixed(2) || '0.00'}

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
  const status = updateDetails?.newStatus || updateDetails?.status || 'updated';
  const statusInfo = getStatusInfo(status);
  const isPickupOrder = orderData.deliveryMethod === 'pickup';
  
  const orderItems = orderData.items?.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || item.product?.name || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${((item.unitPrice || 0) * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('') || '';
  
  // Generate pickup information
  let pickupInfo = '';
  if (isPickupOrder && orderData.artisan) {
    pickupInfo = `
      <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="color: #2d5a2d; margin-top: 0;">📍 Pickup Location</h4>
        <p><strong>Artisan:</strong> ${orderData.artisan.artisanName || 'Artisan Location'}</p>
        ${orderData.artisan.pickupAddress ? `
          <p><strong>Address:</strong><br>
          ${orderData.artisan.pickupAddress.street}<br>
          ${orderData.artisan.pickupAddress.city}, ${orderData.artisan.pickupAddress.state} ${orderData.artisan.pickupAddress.zipCode}</p>
        ` : ''}
        ${orderData.artisan.pickupHours ? `<p><strong>Pickup Hours:</strong> ${orderData.artisan.pickupHours}</p>` : ''}
        ${orderData.artisan.pickupInstructions ? `<p><strong>Instructions:</strong> ${orderData.artisan.pickupInstructions}</p>` : ''}
        ${orderData.selectedPickupTimes ? `
          <p><strong>Scheduled Pickup Time:</strong> ${formatPickupTimeForEmail(orderData.selectedPickupTimes)}</p>
        ` : ''}
      </div>
    `;
  }
  
  // Generate delivery information
  let deliveryInfo = '';
  if (!isPickupOrder && orderData.deliveryAddress) {
    deliveryInfo = `
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="color: #856404; margin-top: 0;">🚚 Delivery Information</h4>
        <p><strong>Delivery Method:</strong> ${orderData.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : orderData.deliveryMethod === 'professionalDelivery' ? 'Professional Delivery' : 'Standard Delivery'}</p>
        <p><strong>Delivery Address:</strong><br>
        ${orderData.deliveryAddress.street || 'Address not provided'}<br>
        ${orderData.deliveryAddress.city || 'City'}, ${orderData.deliveryAddress.state || 'State'} ${orderData.deliveryAddress.zipCode || ''}</p>
        ${orderData.deliveryInstructions ? `<p><strong>Delivery Instructions:</strong> ${orderData.deliveryInstructions}</p>` : ''}
      </div>
    `;
  }
  
  // Status-specific content
  let statusContent = '';
  if (status === 'declined') {
    statusContent = `
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h3 style="color: #dc3545; margin-top: 0;">⚠️ Order Declined</h3>
        <p style="margin: 0;">Unfortunately, your order has been declined by the artisan.</p>
        ${updateDetails?.reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${updateDetails.reason}</p>` : ''}
        <p style="margin: 10px 0 0 0;">Any payment will be refunded according to our refund policy.</p>
      </div>
    `;
  } else if (status === 'cancelled') {
    statusContent = `
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h3 style="color: #dc3545; margin-top: 0;">❌ Order Cancelled</h3>
        <p style="margin: 0;">Your order has been cancelled.</p>
        ${updateDetails?.reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${updateDetails.reason}</p>` : ''}
        <p style="margin: 10px 0 0 0;">Any payment will be refunded according to our refund policy.</p>
      </div>
    `;
  } else {
    statusContent = `
      <div style="background: ${statusInfo.bgColor}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
        <h3 style="color: ${statusInfo.color}; margin-top: 0;">${statusInfo.icon} ${statusInfo.title}</h3>
        <p style="margin: 0;">${statusInfo.message}</p>
        ${updateDetails?.reason ? `<p style="margin: 10px 0 0 0;"><strong>Details:</strong> ${updateDetails.reason}</p>` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update - ${statusInfo.title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">${statusInfo.icon} ${statusInfo.title}</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Hello ${recipientName}, your order has been updated!</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Order Details</h2>
        <p><strong>Order Number:</strong> #${orderData.orderNumber || orderData._id}</p>
        <p><strong>Order Date:</strong> ${new Date(orderData.createdAt || orderData.updatedAt).toLocaleDateString()}</p>
        <p><strong>Current Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${statusInfo.title}</span></p>
        
        ${statusContent}
        
        <!-- Cost Breakdown -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #333; margin-top: 0;">💰 Cost Breakdown</h4>
          <p><strong>Subtotal:</strong> $${(orderData.subtotal || orderData.totalAmount || 0).toFixed(2)}</p>
          ${orderData.deliveryFee && orderData.deliveryFee > 0 ? `
            <p><strong>Delivery Fee:</strong> $${orderData.deliveryFee.toFixed(2)}</p>
          ` : ''}
          <p style="font-size: 18px; font-weight: bold; color: #2d5a2d; margin-bottom: 0;"><strong>Total Amount:</strong> $${orderData.totalAmount?.toFixed(2) || '0.00'}</p>
        </div>
        
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
        ${pickupInfo}
        ${deliveryInfo}
        
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
  const status = updateDetails?.newStatus || updateDetails?.status || 'updated';
  const statusInfo = getStatusInfo(status);
  const isPickupOrder = orderData.deliveryMethod === 'pickup';
  
  const orderItems = orderData.items?.map(item => 
    `${item.name || item.product?.name || 'Product'} - Qty: ${item.quantity} - Price: $${item.unitPrice || 0} - Total: $${((item.unitPrice || 0) * item.quantity).toFixed(2)}`
  ).join('\n') || '';
  
  let deliveryInfo = '';
  if (isPickupOrder && orderData.artisan) {
    deliveryInfo = `Pickup Location: ${orderData.artisan.artisanName || 'Artisan Location'}`;
    if (orderData.artisan.pickupAddress) {
      deliveryInfo += `\nAddress: ${orderData.artisan.pickupAddress.street}, ${orderData.artisan.pickupAddress.city}, ${orderData.artisan.pickupAddress.state} ${orderData.artisan.pickupAddress.zipCode}`;
    }
    if (orderData.artisan.pickupHours) {
      deliveryInfo += `\nPickup Hours: ${orderData.artisan.pickupHours}`;
    }
    if (orderData.artisan.pickupInstructions) {
      deliveryInfo += `\nInstructions: ${orderData.artisan.pickupInstructions}`;
    }
    if (orderData.selectedPickupTimes) {
      deliveryInfo += `\nScheduled Pickup Time: ${formatPickupTimeForEmail(orderData.selectedPickupTimes)}`;
    }
  } else if (!isPickupOrder && orderData.deliveryAddress) {
    deliveryInfo = `Delivery Method: ${orderData.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : orderData.deliveryMethod === 'professionalDelivery' ? 'Professional Delivery' : 'Standard Delivery'}`;
    deliveryInfo += `\nDelivery Address: ${orderData.deliveryAddress.street || 'Address not provided'}, ${orderData.deliveryAddress.city || 'City'}, ${orderData.deliveryAddress.state || 'State'} ${orderData.deliveryAddress.zipCode || ''}`;
    if (orderData.deliveryInstructions) {
      deliveryInfo += `\nDelivery Instructions: ${orderData.deliveryInstructions}`;
    }
  }

  return `
${statusInfo.icon} ${statusInfo.title}

Hello ${recipientName}, your order has been updated!

${statusInfo.message}

Order Details:
Order Number: #${orderData.orderNumber || orderData._id}
Order Date: ${new Date(orderData.createdAt || orderData.updatedAt).toLocaleDateString()}
Current Status: ${statusInfo.title}

Cost Breakdown:
Subtotal: $${(orderData.subtotal || orderData.totalAmount || 0).toFixed(2)}
${orderData.deliveryFee && orderData.deliveryFee > 0 ? `Delivery Fee: $${orderData.deliveryFee.toFixed(2)}` : ''}
Total Amount: $${orderData.totalAmount?.toFixed(2) || '0.00'}

Order Items:
${orderItems}

${isPickupOrder ? 'Pickup Information:' : 'Delivery Information:'}
${deliveryInfo}

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
