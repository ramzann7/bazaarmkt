/**
 * Notifications Feature Module
 * Handles user notifications functionality
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const axios = require('axios');

// Brevo configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';

// Helper function to generate subject line based on status
const generateSubjectLine = (status, orderNumber, deliveryMethod = 'pickup') => {
  const statusSubjects = {
    'pending': `📦 Order Placed - #${orderNumber}`,
    'confirmed': `✅ Order Confirmed - #${orderNumber}`,
    'preparing': `👨‍🍳 Order Being Prepared - #${orderNumber}`,
    'ready_for_pickup': `✨ Ready for Pickup - #${orderNumber}`,
    'ready_for_delivery': `✨ Ready for Delivery - #${orderNumber}`,
    'out_for_delivery': `🚚 Out for Delivery - #${orderNumber}`,
    'picked_up': `✅ Order Picked Up - #${orderNumber}`,
    'delivered': `📬 Order Delivered - #${orderNumber}`,
    'completed': `✅ Order Completed - #${orderNumber}`,
    'cancelled': `❌ Order Cancelled - #${orderNumber}`,
    'declined': `⚠️ Order Declined - #${orderNumber}`
  };
  
  return statusSubjects[status] || `📢 Order Update - #${orderNumber}`;
};

// Helper function to generate order timeline HTML
const generateOrderTimelineHTML = (currentStatus, deliveryMethod = 'pickup') => {
  const pickupSteps = [
    { id: 'pending', label: 'Order Placed', emoji: '📝' },
    { id: 'confirmed', label: 'Confirmed', emoji: '✅' },
    { id: 'preparing', label: 'Preparing', emoji: '👨‍🍳' },
    { id: 'ready_for_pickup', label: 'Ready for Pickup', emoji: '✨' },
    { id: 'picked_up', label: 'Picked Up', emoji: '📦' }
  ];
  
  const deliverySteps = [
    { id: 'pending', label: 'Order Placed', emoji: '📝' },
    { id: 'confirmed', label: 'Confirmed', emoji: '✅' },
    { id: 'preparing', label: 'Preparing', emoji: '👨‍🍳' },
    { id: 'ready_for_delivery', label: 'Ready', emoji: '✨' },
    { id: 'out_for_delivery', label: 'Out for Delivery', emoji: '🚚' },
    { id: 'delivered', label: 'Delivered', emoji: '📬' }
  ];
  
  const steps = deliveryMethod === 'pickup' ? pickupSteps : deliverySteps;
  const currentStepIndex = steps.findIndex(step => step.id === currentStatus);
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'declined';
  
  const stepsHTML = steps.map((step, index) => {
    const isCompleted = index < currentStepIndex;
    const isCurrent = index === currentStepIndex;
    const isPending = index > currentStepIndex;
    
    const bgColor = isCancelled && index === 0 ? '#fee2e2' :
                    isCompleted ? '#d1fae5' :
                    isCurrent ? '#dbeafe' :
                    '#f3f4f6';
    
    const borderColor = isCancelled && index === 0 ? '#dc2626' :
                        isCompleted ? '#10b981' :
                        isCurrent ? '#f59e0b' :
                        '#d1d5db';
    
    const textColor = isCancelled && index === 0 ? '#991b1b' :
                     isCompleted ? '#047857' :
                     isCurrent ? '#d97706' :
                     '#6b7280';
    
    const connector = index < steps.length - 1 ? `
      <div class="timeline-connector" style="flex: 1; height: 2px; background: ${isCompleted ? '#10b981' : '#d1d5db'}; margin: 0 5px; align-self: center;"></div>
    ` : '';
    
    return `
      <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
        <div class="timeline-icon" style="width: 40px; height: 40px; border-radius: 50%; background: ${bgColor}; border: 2px solid ${borderColor}; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 8px;">
          ${isCancelled && index === 0 ? '❌' : isCompleted ? '✓' : step.emoji}
        </div>
        <div class="timeline-step" style="text-align: center; font-size: 11px; color: ${textColor}; font-weight: ${isCurrent ? '600' : '400'}; max-width: 80px; line-height: 1.2;">
          ${step.label}
        </div>
      </div>
      ${connector}
    `;
  }).join('');
  
  return `
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Order Progress</h3>
      <div style="display: flex; align-items: flex-start; justify-content: space-between;">
        ${stepsHTML}
      </div>
    </div>
  `;
};

// Helper function to get next action message
const getNextActionMessage = (currentStatus, deliveryMethod = 'pickup', pickupTime = null, deliveryTime = null) => {
  const messages = {
    'pending': {
      title: 'What Happens Next?',
      message: 'The artisan will review and confirm your order shortly. You\'ll receive an email once confirmed.',
      action: 'Waiting for artisan confirmation'
    },
    'confirmed': {
      title: 'Order Confirmed!',
      message: deliveryMethod === 'pickup' 
        ? 'The artisan is preparing your order. You\'ll be notified when it\'s ready for pickup.'
        : 'The artisan is preparing your order. You\'ll be notified when it\'s ready for delivery.',
      action: 'Artisan is preparing your order'
    },
    'preparing': {
      title: 'Being Prepared',
      message: 'Your order is currently being prepared by the artisan.',
      action: 'Order in preparation'
    },
    'ready_for_pickup': {
      title: 'Ready for Pickup!',
      message: pickupTime 
        ? `Your order is ready! Please pick it up at: ${pickupTime}`
        : 'Your order is ready for pickup at the artisan\'s location.',
      action: 'Visit the artisan to collect your order'
    },
    'ready_for_delivery': {
      title: 'Ready for Delivery',
      message: deliveryTime
        ? `Your order is ready and will be delivered around: ${deliveryTime}`
        : 'Your order is ready and will be delivered soon.',
      action: 'Delivery will be scheduled shortly'
    },
    'out_for_delivery': {
      title: 'Out for Delivery',
      message: deliveryTime
        ? `Your order is on its way! Expected delivery: ${deliveryTime}`
        : 'Your order is on its way to you!',
      action: 'Please be available to receive your order'
    },
    'picked_up': {
      title: 'Order Picked Up',
      message: 'Thank you for your order! We hope you enjoy your products.',
      action: 'Enjoy your purchase!'
    },
    'delivered': {
      title: 'Order Delivered',
      message: 'Your order has been delivered. We hope you enjoy your products!',
      action: 'Enjoy your purchase!'
    },
    'cancelled': {
      title: 'Order Cancelled',
      message: 'This order has been cancelled. If you have questions, please contact us.',
      action: 'Contact support if you need assistance'
    },
    'declined': {
      title: 'Order Declined',
      message: 'Unfortunately, the artisan had to decline this order. You have not been charged.',
      action: 'Browse other artisans and products'
    }
  };
  
  return messages[currentStatus] || messages.pending;
};

// Generate order update HTML template (enhanced with timeline and details)
const generateOrderUpdateHTML = (recipientName, orderData, updateType, updateDetails) => {
  const currentStatus = updateDetails.newStatus || orderData.status || 'pending';
  const isDeclined = currentStatus === 'declined' || currentStatus === 'cancelled';
  const hasReason = updateDetails.reason && updateDetails.reason.trim().length > 0;
  
  // Choose header color based on status using platform design system
  const headerGradient = isDeclined 
    ? 'background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);' 
    : 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);'; // Amber gradient - platform primary color
  
  // Generate product items HTML if available
  const productsHTML = orderData.items && orderData.items.length > 0 ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0;">Order Items</h3>
      ${orderData.items.map(item => `
        <div class="product-item responsive-flex" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #333;">${item.productName || item.product?.name || 'Product'}</div>
            <div style="font-size: 14px; color: #666;">Quantity: ${item.quantity}</div>
          </div>
          <div class="product-price" style="font-weight: 600; color: #f59e0b; white-space: nowrap;">$${((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</div>
        </div>
      `).join('')}
      <div class="responsive-flex" style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #333;">
        <div style="font-weight: bold; font-size: 16px;">Total</div>
        <div style="font-weight: bold; font-size: 16px; color: #f59e0b;">$${(orderData.totalAmount || 0).toFixed(2)}</div>
      </div>
    </div>
  ` : '';
  
  // Generate pickup/delivery info
  const deliveryInfoHTML = orderData.deliveryMethod === 'pickup' ? `
    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="color: #047857; margin-top: 0;">📍 Pickup Information</h3>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${orderData.artisanName || 'Artisan Location'}</p>
      ${orderData.pickupAddress ? `
        <p style="margin: 5px 0; color: #666;">
          ${orderData.pickupAddress.street}<br>
          ${orderData.pickupAddress.city}, ${orderData.pickupAddress.state} ${orderData.pickupAddress.zipCode}
        </p>
      ` : ''}
      ${orderData.pickupTime ? `
        <p style="margin: 5px 0;"><strong>Pickup Time:</strong> ${orderData.pickupTime}</p>
      ` : ''}
    </div>
  ` : orderData.deliveryAddress ? `
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #d97706; margin-top: 0;">🚚 Delivery Information</h3>
      <p style="margin: 5px 0;"><strong>Delivery Address:</strong></p>
      <p style="margin: 5px 0; color: #666;">
        ${orderData.deliveryAddress.street}<br>
        ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.zipCode}
      </p>
      ${orderData.estimatedDeliveryTime ? `
        <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${orderData.estimatedDeliveryTime}</p>
      ` : ''}
    </div>
  ` : '';
  
  // Build reason section if applicable
  const reasonSection = (isDeclined && hasReason) ? `
    <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <h3 style="color: #991b1b; margin-top: 0;">Reason for ${currentStatus === 'declined' ? 'Decline' : 'Cancellation'}</h3>
      <p style="margin: 0; color: #7f1d1d; font-style: italic;">"${updateDetails.reason}"</p>
    </div>
  ` : '';
  
  // Get next action
  const nextAction = getNextActionMessage(currentStatus, orderData.deliveryMethod, orderData.pickupTime, orderData.estimatedDeliveryTime);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update</title>
      <style>
        /* Mobile-friendly styles */
        @media only screen and (max-width: 600px) {
          .email-container { padding: 10px !important; }
          .header { padding: 20px !important; font-size: 14px !important; }
          .header h1 { font-size: 24px !important; }
          .content { padding: 15px !important; }
          .timeline-step { font-size: 9px !important; max-width: 60px !important; }
          .timeline-icon { width: 32px !important; height: 32px !important; font-size: 16px !important; }
          .product-item { flex-direction: column !important; align-items: flex-start !important; }
          .product-price { margin-top: 8px !important; }
          h2 { font-size: 20px !important; }
          h3 { font-size: 16px !important; }
        }
        
        /* Print-friendly styles */
        @media print {
          body { background: white !important; }
          .email-container { max-width: 100% !important; padding: 0 !important; }
          .header { 
            background: #f59e0b !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .no-print { display: none !important; }
          .timeline-connector { background: #000 !important; }
          a { text-decoration: none !important; color: #000 !important; }
          .page-break { page-break-after: always; }
        }
        
        /* General responsive utilities */
        .responsive-table { width: 100%; border-collapse: collapse; }
        .responsive-flex { display: flex; flex-wrap: wrap; }
      </style>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;" class="email-container">
      <div class="header" style="${headerGradient} padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">${isDeclined ? '⚠️' : '📢'} Order Update</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Hello ${recipientName}!</p>
        <p style="color: white; margin: 5px 0; font-size: 14px;">Order #${orderData.orderNumber}</p>
      </div>
      
      <div class="content" style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        ${reasonSection}
        
        ${!isDeclined ? generateOrderTimelineHTML(currentStatus, orderData.deliveryMethod) : ''}
        
        ${productsHTML}
        
        ${deliveryInfoHTML}
        
        <div style="background: ${isDeclined ? '#fee2e2' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isDeclined ? '#dc2626' : '#f59e0b'};">
          <h3 style="color: ${isDeclined ? '#991b1b' : '#d97706'}; margin-top: 0;">${nextAction.title}</h3>
          <p style="margin: 5px 0 10px 0; color: ${isDeclined ? '#7f1d1d' : '#92400e'};">${nextAction.message}</p>
          <div style="background: ${isDeclined ? '#fef2f2' : '#fef3c7'}; padding: 12px; border-radius: 6px; font-weight: 600; color: ${isDeclined ? '#7f1d1d' : '#d97706'};">
            ${nextAction.action}
          </div>
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 25px;">
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

// Generate order confirmation HTML template (enhanced version)
const generateOrderConfirmationHTML = (recipientName, orderData) => {
  const orderItems = orderData.items?.map(item => 
    `<div class="product-item responsive-flex" style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee;">
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${item.productName || item.product?.name || item.name || 'Item'}</div>
        <div style="font-size: 14px; color: #666;">Quantity: ${item.quantity} × $${(item.unitPrice || 0).toFixed(2)}</div>
      </div>
      <div class="product-price" style="font-weight: 600; color: #333; align-self: center; white-space: nowrap;">$${((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</div>
    </div>`
  ).join('') || '<p style="text-align: center; color: #666;">No items</p>';

  const isPickupOrder = orderData.deliveryMethod === 'pickup';
  
  // Enhanced delivery/pickup info
  const deliveryInfo = isPickupOrder ? `
    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="color: #047857; margin-top: 0;">📍 Pickup Information</h3>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${orderData.artisanName || 'Artisan Location'}</p>
      ${orderData.pickupAddress ? `
        <p style="margin: 5px 0; color: #666;">
          ${orderData.pickupAddress.street}<br>
          ${orderData.pickupAddress.city}, ${orderData.pickupAddress.state} ${orderData.pickupAddress.zipCode}
        </p>
      ` : ''}
      ${orderData.pickupTime ? `
        <p style="margin: 5px 0;"><strong>Pickup Time:</strong> ${orderData.pickupTime}</p>
      ` : ''}
    </div>
  ` : orderData.deliveryAddress ? `
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #d97706; margin-top: 0;">🚚 Delivery Information</h3>
      <p style="margin: 5px 0;"><strong>Delivery Address:</strong></p>
      <p style="margin: 5px 0; color: #666;">
        ${orderData.deliveryAddress.street}<br>
        ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.zipCode}
      </p>
      ${orderData.estimatedDeliveryTime ? `
        <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${orderData.estimatedDeliveryTime}</p>
      ` : ''}
    </div>
  ` : '';
  
  // Get initial status (pending or confirmed)
  const initialStatus = orderData.status || 'pending';
  const nextAction = getNextActionMessage(initialStatus, orderData.deliveryMethod, orderData.pickupTime, orderData.estimatedDeliveryTime);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        /* Mobile-friendly styles */
        @media only screen and (max-width: 600px) {
          .email-container { padding: 10px !important; }
          .header { padding: 20px !important; font-size: 14px !important; }
          .header h1 { font-size: 24px !important; }
          .content { padding: 15px !important; }
          .timeline-step { font-size: 9px !important; max-width: 60px !important; }
          .timeline-icon { width: 32px !important; height: 32px !important; font-size: 16px !important; }
          .product-item { flex-direction: column !important; align-items: flex-start !important; }
          .product-price { margin-top: 8px !important; }
          .order-summary { flex-direction: column !important; }
          .order-summary p { margin: 3px 0 !important; }
          h2 { font-size: 20px !important; }
          h3 { font-size: 16px !important; }
        }
        
        /* Print-friendly styles */
        @media print {
          body { background: white !important; }
          .email-container { max-width: 100% !important; padding: 0 !important; }
          .header { 
            background: #f59e0b !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .no-print { display: none !important; }
          .timeline-connector { background: #000 !important; }
          a { text-decoration: none !important; color: #000 !important; }
          .page-break { page-break-after: always; }
        }
        
        /* General responsive utilities */
        .responsive-table { width: 100%; border-collapse: collapse; }
        .responsive-flex { display: flex; flex-wrap: wrap; }
      </style>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;" class="email-container">
      <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order, ${recipientName}!</p>
      </div>
      
      <div class="content" style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Order Details</h2>
        <div class="order-summary" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Order Number:</strong> #${orderData.orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #f59e0b; font-size: 18px; font-weight: bold;">$${(orderData.totalAmount || 0).toFixed(2)}</span></p>
        </div>
        
        ${generateOrderTimelineHTML(initialStatus, orderData.deliveryMethod)}
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Order Items</h3>
          ${orderItems}
          <div class="responsive-flex" style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #333;">
            <div style="font-weight: bold; font-size: 16px;">Total</div>
            <div style="font-weight: bold; font-size: 16px; color: #f59e0b;">$${(orderData.totalAmount || 0).toFixed(2)}</div>
          </div>
        </div>
        
        ${deliveryInfo}
        
        <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #3730a3; margin-top: 0;">${nextAction.title}</h3>
          <p style="margin: 5px 0 10px 0; color: #312e81;">${nextAction.message}</p>
          <div style="background: #eef2ff; padding: 12px; border-radius: 6px; font-weight: 600; color: #4338ca;">
            ${nextAction.action}
          </div>
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #2d5a2d; margin-top: 0;">Need Help?</h3>
          <p style="margin: 0;">If you have any questions about your order, please contact us at bazaar@bazaarmkt.ca</p>
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

// Send email via Brevo (for registered users)
const sendBrevoEmail = async (userId, notificationData) => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not configured, skipping email');
    return;
  }

  const db = req.db; // Use shared connection from middleware
  
  // Get user email
  const user = await db.collection('users').findOne({ 
    _id: new (require('mongodb')).ObjectId(userId) 
  });
  
  // Get order details if orderId is provided
  let order = null;
  if (notificationData.orderId) {
    order = await db.collection('orders').findOne({ 
      _id: new (require('mongodb')).ObjectId(notificationData.orderId) 
    });
  }
  
  // Connection managed by middleware - no close needed
  
  if (!user || !user.email) {
    throw new Error('User email not found');
  }

  const { title, message, orderNumber, updateDetails, type, updateType, status } = notificationData;
  const recipientName = `${user.firstName} ${user.lastName}`;
  
  // Prepare order data for templates with all necessary information
  const orderData = order ? {
    orderNumber: orderNumber || order._id.toString().slice(-8).toUpperCase(),
    totalAmount: order.totalAmount,
    items: order.items,
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    artisanName: order.artisan?.artisanName,
    pickupAddress: order.artisan?.pickupAddress,
    pickupTime: order.pickupTimeWindow?.timeSlotLabel || order.pickupTime,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    status: order.status
  } : {
    orderNumber: orderNumber,
    totalAmount: updateDetails?.totalAmount || 0,
    items: [],
    deliveryMethod: 'pickup',
    status: status || updateDetails?.newStatus || 'pending'
  };
  
  // Choose template based on notification type
  let htmlContent;
  if (type === 'order_completion' || type === 'new_order') {
    htmlContent = generateOrderConfirmationHTML(recipientName, orderData);
  } else {
    htmlContent = generateOrderUpdateHTML(recipientName, orderData, updateType || 'status_change', updateDetails || {});
  }
  
  // Generate dynamic subject line based on status
  const currentStatus = orderData.status || updateDetails?.newStatus || status || 'pending';
  const dynamicSubject = generateSubjectLine(currentStatus, orderData.orderNumber, orderData.deliveryMethod);
  
  const emailData = {
    sender: {
      name: 'bazaar',
      email: 'bazaar@bazaarmkt.ca'
    },
    to: [{
      email: user.email,
      name: recipientName
    }],
    subject: dynamicSubject,
    htmlContent: htmlContent,
    textContent: message
  };

  const response = await axios.post(
    `${BREVO_API_URL}/smtp/email`,
    emailData,
    {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );

  return response.data;
};

// Send email to guest (no user account) - uses same templates as registered users
const sendGuestEmail = async (guestEmail, guestName, notificationData) => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not configured, skipping guest email');
    return;
  }

  const { title, message, orderNumber, updateDetails, type, updateType, orderId, status } = notificationData;
  
  // Get order details if orderId is provided
  let order = null;
  if (orderId) {
    const db = req.db; // Use shared connection from middleware
    order = await db.collection('orders').findOne({ 
      _id: new (require('mongodb')).ObjectId(orderId) 
    });
    // Connection managed by middleware - no close needed
  }
  
  // Prepare order data for templates with all necessary information
  const orderData = order ? {
    orderNumber: orderNumber || order._id.toString().slice(-8).toUpperCase(),
    totalAmount: order.totalAmount,
    items: order.items,
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    artisanName: order.artisan?.artisanName,
    pickupAddress: order.artisan?.pickupAddress,
    pickupTime: order.pickupTimeWindow?.timeSlotLabel || order.pickupTime,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    status: order.status
  } : {
    orderNumber: orderNumber,
    totalAmount: updateDetails?.totalAmount || 0,
    items: [],
    deliveryMethod: 'pickup',
    status: status || updateDetails?.newStatus || 'pending'
  };
  
  // Choose template based on notification type
  let htmlContent;
  if (type === 'order_completion') {
    htmlContent = generateOrderConfirmationHTML(guestName, orderData);
  } else {
    htmlContent = generateOrderUpdateHTML(guestName, orderData, updateType || 'status_change', updateDetails || {});
  }
  
  // Generate dynamic subject line based on status
  const currentStatus = orderData.status || updateDetails?.newStatus || status || 'pending';
  const dynamicSubject = generateSubjectLine(currentStatus, orderData.orderNumber, orderData.deliveryMethod);
  
  const emailData = {
    sender: {
      name: 'bazaar',
      email: 'bazaar@bazaarmkt.ca'
    },
    to: [{
      email: guestEmail,
      name: guestName
    }],
    subject: dynamicSubject,
    htmlContent: htmlContent,
    textContent: message
  };

  const response = await axios.post(
    `${BREVO_API_URL}/smtp/email`,
    emailData,
    {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );

  return response.data;
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const notificationsCollection = db.collection('notifications');
    
    const notifications = await notificationsCollection
      .find({ userId: new (require('mongodb')).ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const notificationsCollection = db.collection('notifications');
    
    const result = await notificationsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.notificationId),
        userId: new (require('mongodb')).ObjectId(decoded.userId)
      },
      { $set: { isRead: true, readAt: new Date() } }
    );
    
    // Connection managed by middleware - no close needed
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const notificationsCollection = db.collection('notifications');
    
    await notificationsCollection.updateMany(
      { userId: new (require('mongodb')).ObjectId(decoded.userId) },
      { $set: { isRead: true, readAt: new Date() } }
    );
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const notificationsCollection = db.collection('notifications');
    
    const result = await notificationsCollection.deleteOne({
      _id: new (require('mongodb')).ObjectId(req.params.notificationId),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    // Connection managed by middleware - no close needed
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Send notification (enhanced for order system)
const sendNotification = async (req, res) => {
  try {
    // Support both old format (userId, title, message) and new format (notificationData object)
    const notificationData = req.body;
    const userId = notificationData.userId;
    const title = notificationData.title || `Order Update - ${notificationData.orderDetails?.orderNumber || ''}`;
    const message = notificationData.message || 'Your order has been updated';
    const type = notificationData.type || 'info';
    
    // For guest users, skip platform notification (they don't have an account to log into)
    if (notificationData.isGuest) {
      console.log('⏭️ Skipping platform notification for guest user');
      return res.json({
        success: true,
        message: 'Notification logged (guest - no platform notification)',
        data: { isGuest: true }
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required for platform notifications'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const notificationsCollection = db.collection('notifications');
    
    const notification = {
      userId: new (require('mongodb')).ObjectId(userId),
      title,
      message,
      type,
      orderId: notificationData.orderId || null,
      orderNumber: notificationData.orderDetails?.orderNumber || notificationData.orderNumber || null,
      status: notificationData.orderDetails?.orderStatus || notificationData.status || null,
      updateType: notificationData.updateType || null,
      updateDetails: notificationData.orderDetails || notificationData.updateDetails || null,
      isRead: false,
      createdAt: new Date()
    };
    
    await notificationsCollection.insertOne(notification);
    // Connection managed by middleware - no close needed
    
    console.log('✅ Platform notification saved for user:', userId);
    
    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

// Send bulk notifications (for order updates)
const sendBulkNotifications = async (req, res) => {
  try {
    const { notifications } = req.body;
    
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notifications array is required'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const notificationsCollection = db.collection('notifications');
    
    const notificationDocs = notifications.map(notif => ({
      userId: new (require('mongodb')).ObjectId(notif.userId),
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      orderId: notif.orderId || null,
      orderNumber: notif.orderNumber || null,
      status: notif.status || null,
      updateType: notif.updateType || null,
      updateDetails: notif.updateDetails || null,
      isRead: false,
      createdAt: new Date()
    }));
    
    const result = await notificationsCollection.insertMany(notificationDocs);
    
    res.json({
      success: true,
      message: `Successfully sent ${result.insertedCount} notifications`,
      data: { insertedCount: result.insertedCount }
    });
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications',
      error: error.message
    });
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    // Use the user ID from the JWT middleware (req.user.userId)
    const userId = req.user.userId;
    
    // Use shared database connection from main server
    const db = req.db;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user preferences and ensure they match the simplified structure
    const userPrefs = user.notificationPreferences || {};
    
    const preferences = {
      email: {
        marketing: userPrefs.email?.marketing ?? true,           // Marketing emails
        orderUpdates: userPrefs.email?.orderUpdates ?? true,     // Order status changes
        promotions: userPrefs.email?.promotions ?? true,         // Special offers and discounts
        security: userPrefs.email?.security ?? true              // Security alerts
      },
      push: {
        orderUpdates: userPrefs.push?.orderUpdates ?? true,      // Order status changes
        promotions: userPrefs.push?.promotions ?? true,          // Special offers and discounts
        newArtisans: userPrefs.push?.newArtisans ?? true,        // New artisan notifications
        nearbyOffers: userPrefs.push?.nearbyOffers ?? true       // Nearby offers
      }
    };
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
};

// Check if user wants to receive a specific type of notification
const checkNotificationPreference = async (userId, notificationType, channel = 'email') => {
  try {
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(userId) 
    });
    
    // Connection managed by middleware - no close needed
    
    if (!user) {
      return false; // User not found, don't send notification
    }
    
    const preferences = user.notificationPreferences || {
      email: {
        marketing: true,           // Marketing emails
        orderUpdates: true,        // Order status changes
        promotions: true,          // Special offers and discounts
        security: true             // Account security alerts
      },
      push: {
        orderUpdates: true,        // Order status changes
        promotions: true,          // Special offers and discounts
        newArtisans: true,         // New artisan notifications
        nearbyOffers: true         // Nearby offers
      }
    };
    
    // Check if the specific notification type is enabled for the channel
    return preferences[channel] && preferences[channel][notificationType] === true;
  } catch (error) {
    console.error('Error checking notification preference:', error);
    return false; // Default to not sending if there's an error
  }
};

// Send notification based on user preferences
const sendPreferenceBasedNotification = async (userId, notificationData) => {
  try {
    const { type, title, message, orderId, orderNumber, status, updateType, updateDetails } = notificationData;
    
    // Get user to check role
    const db = req.db; // Use shared connection from middleware
    const user = await db.collection('users').findOne({ 
      _id: new (require('mongodb')).ObjectId(userId) 
    });
    // Connection managed by middleware - no close needed
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const userRole = user.role || user.userType;
    
    // Determine notification type for preference checking
    let preferenceType = 'promotions'; // default
    if (type === 'order_update' || type === 'order_completion') {
      preferenceType = 'orderUpdates';
    } else if (type === 'promotion' || type === 'seasonal_offer' || type === 'discount') {
      preferenceType = 'promotions';
    } else if (type === 'new_artisan' || type === 'artisan_joined') {
      preferenceType = 'newArtisans';
    } else if (type === 'nearby_offer' || type === 'local_deal') {
      preferenceType = 'nearbyOffers';
    } else if (type === 'marketing' || type === 'newsletter') {
      preferenceType = 'marketing';
    } else if (type === 'security' || type === 'account_alert') {
      preferenceType = 'security';
    }
    
    // Email sending logic based on user role and notification type
    let shouldSendEmail = false;
    
    if (userRole === 'artisan') {
      // ARTISANS: Only send email for NEW orders, everything else is in-app only
      shouldSendEmail = type === 'new_order';
      console.log(`📧 Artisan notification: type=${type}, sendEmail=${shouldSendEmail}`);
    } else if (userRole === 'patron' || userRole === 'customer' || userRole === 'buyer') {
      // PATRONS: Send email for order CONFIRMATION only, updates are in-app only
      shouldSendEmail = type === 'order_completion';
      console.log(`📧 Patron notification: type=${type}, sendEmail=${shouldSendEmail}`);
    } else {
      // For other types, check preferences
      shouldSendEmail = await checkNotificationPreference(userId, preferenceType, 'email');
    }
    
    if (shouldSendEmail) {
      // Send email notification via Brevo
      try {
        await sendBrevoEmail(userId, notificationData);
        console.log(`✅ Email sent to user ${userId} (${userRole}): ${title}`);
      } catch (error) {
        console.error(`❌ Failed to send email to user ${userId}:`, error.message);
      }
    } else {
      console.log(`⏭️ Skipping email for user ${userId} (${userRole}, type=${type})`);
    }
    
    // Check push preferences for in-app notifications
    const pushAllowed = await checkNotificationPreference(userId, preferenceType, 'push');
    
    if (pushAllowed) {
      // Send platform notification
      const db = req.db; // Use shared connection from middleware
      const notificationsCollection = db.collection('notifications');
      
      const notification = {
        userId: new (require('mongodb')).ObjectId(userId),
        title,
        message,
        type,
        orderId: orderId || null,
        orderNumber: orderNumber || null,
        status: status || null,
        updateType: updateType || null,
        updateDetails: updateDetails || null,
        isRead: false,
        createdAt: new Date()
      };
      
      await notificationsCollection.insertOne(notification);
      // Connection managed by middleware - no close needed
      
      console.log(`🔔 Platform notification sent to user ${userId}: ${title}`);
    }
    
    return {
      emailSent: emailAllowed,
      pushSent: pushAllowed,
      preferenceType
    };
  } catch (error) {
    console.error('Error sending preference-based notification:', error);
    return {
      emailSent: false,
      pushSent: false,
      error: error.message
    };
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    // Use the user ID from the JWT middleware (req.user.userId)
    const userId = req.user.userId;
    
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences are required'
      });
    }
    
    // Use shared database connection from main server
    const db = req.db;
    const usersCollection = db.collection('users');
    
    // Keep the current database structure
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(userId) },
      { 
        $set: { 
          notificationPreferences: preferences,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
};

// Send preference-based notification endpoint
const sendPreferenceBasedNotificationEndpoint = async (req, res) => {
  try {
    const { userId, notificationData } = req.body;
    
    if (!userId || !notificationData) {
      return res.status(400).json({
        success: false,
        message: 'userId and notificationData are required'
      });
    }
    
    const result = await sendPreferenceBasedNotification(userId, notificationData);
    
    res.json({
      success: true,
      message: 'Notification processed based on user preferences',
      data: result
    });
  } catch (error) {
    console.error('Send preference-based notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send preference-based notification',
      error: error.message
    });
  }
};

// Import JWT middleware
const verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Send guest email notification endpoint
const sendGuestEmailEndpoint = async (req, res) => {
  try {
    const { guestEmail, guestName, notificationData } = req.body;
    
    if (!guestEmail || !notificationData) {
      return res.status(400).json({
        success: false,
        message: 'guestEmail and notificationData are required'
      });
    }
    
    await sendGuestEmail(guestEmail, guestName || 'Customer', notificationData);
    
    res.json({
      success: true,
      message: 'Guest email sent successfully'
    });
  } catch (error) {
    console.error('Send guest email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send guest email',
      error: error.message
    });
  }
};

// Send email notification (for order completion)
const sendEmailNotification = async (req, res) => {
  try {
    const { to, subject, template, data } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Email recipient and subject are required'
      });
    }
    
    console.log('📧 Email notification request:', { to, subject, template, dataKeys: Object.keys(data || {}) });
    
    // If this is an order completion email, send via appropriate method
    if (template === 'order_completion' || data?.isGuest !== undefined) {
      const userName = data.userName || 'Customer';
      const isGuest = data.isGuest === true;
      
      // Prepare order data
      const orderData = {
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
        items: data.items || [],
        deliveryMethod: data.deliveryMethod || 'pickup',
        deliveryAddress: data.deliveryAddress,
        artisanName: data.artisanName
      };
      
      const notificationData = {
        title: subject,
        message: `Your order #${data.orderNumber} has been confirmed!`,
        type: 'order_completion',
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        updateDetails: data
      };
      
      if (isGuest) {
        // Send guest email
        await sendGuestEmail(to, userName, notificationData);
      } else if (data.userId) {
        // Send registered user email
        await sendBrevoEmail(data.userId, notificationData);
      }
      
      return res.json({
        success: true,
        message: 'Email sent successfully'
      });
    }
    
    // For other email types, use simple Brevo send
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY not configured, email not sent');
      return res.json({
        success: false,
        message: 'Email service not configured'
      });
    }
    
    const emailData = {
      sender: {
        name: 'bazaar',
        email: 'bazaar@bazaarmkt.ca'
      },
      to: [{
        email: to,
        name: data.userName || 'Customer'
      }],
      subject: subject,
      htmlContent: data.htmlContent || `<p>${data.message || 'You have a notification from bazaar'}</p>`,
      textContent: data.message || subject
    };
    
    await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      emailData,
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Send email notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
};

// Routes
router.get('/', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.post('/send', sendNotification);
router.post('/email', sendEmailNotification);  // Add email endpoint
router.post('/send-bulk', sendBulkNotifications);
router.post('/send-preference-based', sendPreferenceBasedNotificationEndpoint);
router.post('/send-guest-email', sendGuestEmailEndpoint);
router.get('/preferences', verifyJWT, getNotificationPreferences);
router.put('/preferences', verifyJWT, updateNotificationPreferences);

module.exports = router;
