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
    { id: 'pending', label: 'Order Placed', number: '1' },
    { id: 'confirmed', label: 'Confirmed', number: '2' },
    { id: 'preparing', label: 'Preparing', number: '3' },
    { id: 'ready_for_pickup', label: 'Ready for Pickup', number: '4' },
    { id: 'picked_up', label: 'Picked Up', number: '5' }
  ];
  
  const deliverySteps = [
    { id: 'pending', label: 'Order Placed', number: '1' },
    { id: 'confirmed', label: 'Confirmed', number: '2' },
    { id: 'preparing', label: 'Preparing', number: '3' },
    { id: 'ready_for_delivery', label: 'Ready', number: '4' },
    { id: 'out_for_delivery', label: 'Out for Delivery', number: '5' },
    { id: 'delivered', label: 'Delivered', number: '6' }
  ];
  
  const steps = deliveryMethod === 'pickup' ? pickupSteps : deliverySteps;
  const currentStepIndex = steps.findIndex(step => step.id === currentStatus);
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'declined';
  
  const stepsHTML = steps.map((step, index) => {
    const isCompleted = index <= currentStepIndex;
    const isCurrent = index === currentStepIndex;
    const isPending = index > currentStepIndex;
    
    const bgColor = isCancelled && index === 0 ? '#fee2e2' :
                    isCompleted ? '#10b981' :
                    isPending ? '#f3f4f6' :
                    '#dbeafe';
    
    const textColor = isCancelled && index === 0 ? '#991b1b' :
                     isCompleted ? '#ffffff' :
                     '#6b7280';
    
    const connector = index < steps.length - 1 ? `
      <div class="timeline-connector" style="flex: 1; height: 2px; background: ${isCompleted ? '#10b981' : '#d1d5db'}; margin: 0 5px; align-self: center;"></div>
    ` : '';
    
    const displayIcon = isCancelled && index === 0 ? 'X' : isCompleted ? '✓' : step.number;
    
    return `
      <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
        <div class="timeline-icon" style="width: 40px; height: 40px; border-radius: 50%; background: ${bgColor}; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; margin-bottom: 8px; color: ${textColor};">
          ${displayIcon}
        </div>
        <div class="timeline-step" style="text-align: center; font-size: 11px; color: #6b7280; font-weight: ${isCurrent ? '600' : '400'}; max-width: 80px; line-height: 1.2;">
          ${step.label}
        </div>
      </div>
      ${connector}
    `;
  }).join('');
  
  return `
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Order Status</h3>
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
      ${orderData.deliveryFee && orderData.deliveryFee > 0 ? `
      <div class="responsive-flex" style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 10px; border-top: 1px solid #e5e5e5;">
        <div style="font-size: 14px; color: #666;">
          Delivery Fee ${orderData.deliveryMethod === 'personalDelivery' ? '(Personal)' : orderData.deliveryMethod === 'professionalDelivery' ? '(Professional)' : ''}
        </div>
        <div style="font-size: 14px; color: #666;">$${orderData.deliveryFee.toFixed(2)}</div>
      </div>
      ` : ''}
      <div class="responsive-flex" style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #333;">
        <div style="font-weight: bold; font-size: 16px;">Total</div>
        <div style="font-weight: bold; font-size: 16px; color: #f59e0b;">$${(orderData.totalAmount || 0).toFixed(2)}</div>
      </div>
    </div>
  ` : '';
  
  // Generate pickup/delivery info with artisan information and customer information
  const deliveryInfoHTML = orderData.deliveryMethod === 'pickup' ? `
    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="color: #047857; margin-top: 0;">📍 Pickup Information</h3>
      ${orderData.pickupAddress ? `
        <p style="margin: 5px 0; color: #666;">
          ${typeof orderData.pickupAddress === 'string' 
            ? orderData.pickupAddress 
            : `${orderData.pickupAddress.street}<br>${orderData.pickupAddress.city}, ${orderData.pickupAddress.state} ${orderData.pickupAddress.zipCode}`
          }
        </p>
      ` : '<p style="margin: 5px 0;">Pickup location will be confirmed by the artisan</p>'}
      ${orderData.pickupTime ? `
        <p style="margin: 5px 0;"><strong>Pickup Time:</strong> ${orderData.pickupTime}</p>
      ` : ''}
      ${orderData.artisanInfo ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1fae5;">
          <p style="margin: 5px 0; color: #047857;"><strong>Artisan:</strong> ${orderData.artisanInfo.name}</p>
          ${orderData.artisanInfo.phone ? `<p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${orderData.artisanInfo.phone}</p>` : ''}
        </div>
      ` : ''}
      ${orderData.patronInfo || orderData.customerInfo || orderData.guestInfo ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1fae5;">
          <h4 style="color: #047857; margin: 0 0 10px 0;">Customer Information</h4>
          ${(orderData.patronInfo?.isArtisan || orderData.customerInfo?.isArtisan) ? `
            <p style="margin: 5px 0; color: #047857;"><strong>Business:</strong> ${(orderData.patronInfo || orderData.customerInfo).businessName || (orderData.patronInfo || orderData.customerInfo).artisanName} ✨</p>
          ` : ''}
          <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${(orderData.patronInfo || orderData.customerInfo || orderData.guestInfo).firstName} ${(orderData.patronInfo || orderData.customerInfo || orderData.guestInfo).lastName}</p>
          ${(orderData.patronInfo || orderData.customerInfo || orderData.guestInfo).email ? `<p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${(orderData.patronInfo || orderData.customerInfo || orderData.guestInfo).email}</p>` : ''}
          ${(orderData.patronInfo || orderData.customerInfo || orderData.guestInfo).phone ? `<p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${(orderData.patronInfo || orderData.customerInfo || orderData.guestInfo).phone}</p>` : ''}
        </div>
      ` : ''}
    </div>
  ` : orderData.deliveryAddress ? `
    <div style="background: ${orderData.deliveryMethod === 'professionalDelivery' ? '#dbeafe' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${orderData.deliveryMethod === 'professionalDelivery' ? '#2563eb' : '#f59e0b'};">
      <h3 style="color: ${orderData.deliveryMethod === 'professionalDelivery' ? '#1e40af' : '#d97706'}; margin-top: 0;">
        ${orderData.deliveryMethod === 'professionalDelivery' ? '🚚 Professional Courier Delivery' : '🚚 Delivery Information'}
      </h3>
      
      ${orderData.deliveryMethod === 'professionalDelivery' && orderData.deliveryInfo?.trackingUrl ? `
        <!-- Uber Tracking Section -->
        <div style="background: #3b82f6; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
          <a href="${orderData.deliveryInfo.trackingUrl}" 
             style="display: inline-block; background: white; color: #1e40af; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
            🗺️ Track Your Delivery Live
          </a>
        </div>
        
        ${orderData.deliveryInfo.dropoffEta ? `
          <div style="background: #bfdbfe; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>⏰ Estimated Arrival:</strong> <span style="font-size: 18px; font-weight: bold;">${orderData.deliveryInfo.dropoffEta} minutes</span>
            </p>
          </div>
        ` : ''}
        
        ${orderData.deliveryInfo.courier ? `
          <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: bold;">Courier Details:</p>
            ${orderData.deliveryInfo.courier.name ? `<p style="margin: 3px 0; color: #1e3a8a;">👤 <strong>Name:</strong> ${orderData.deliveryInfo.courier.name}</p>` : ''}
            ${orderData.deliveryInfo.courier.phone ? `<p style="margin: 3px 0; color: #1e3a8a;">📱 <strong>Phone:</strong> ${orderData.deliveryInfo.courier.phone}</p>` : ''}
            ${orderData.deliveryInfo.courier.vehicle ? `<p style="margin: 3px 0; color: #1e3a8a;">🚗 <strong>Vehicle:</strong> ${orderData.deliveryInfo.courier.vehicle}</p>` : ''}
          </div>
        ` : ''}
        
        ${orderData.deliveryInfo.deliveryId ? `
          <p style="margin: 5px 0; color: #64748b; font-size: 12px; text-align: center;">
            Delivery ID: ${orderData.deliveryInfo.deliveryId}
          </p>
        ` : ''}
      ` : ''}
      
      <p style="margin: 5px 0;"><strong>Delivery Address:</strong></p>
      <p style="margin: 5px 0; color: #666;">
        ${orderData.deliveryAddress.street}<br>
        ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.zipCode}
      </p>
      
      ${!orderData.deliveryInfo?.trackingUrl && orderData.deliveryInfo ? `
        <div style="margin-top: 15px; padding: 15px; background: #fff7ed; border-radius: 6px;">
          <p style="margin: 5px 0; color: #d97706;"><strong>📏 Distance:</strong> ${orderData.deliveryInfo.formattedDistance}</p>
          <p style="margin: 5px 0; color: #d97706;"><strong>⏱️ Estimated Time:</strong> ${orderData.deliveryInfo.formattedEstimatedTime}</p>
          ${orderData.deliveryInfo.estimatedArrivalTime ? `
            <p style="margin: 5px 0; color: #d97706;"><strong>🕐 Expected Arrival:</strong> ${new Date(orderData.deliveryInfo.estimatedArrivalTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
          ` : ''}
        </div>
      ` : !orderData.deliveryInfo?.trackingUrl && orderData.estimatedDeliveryTime ? `
        <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${orderData.estimatedDeliveryTime}</p>
      ` : ''}
      
      ${orderData.artisanInfo ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${orderData.deliveryMethod === 'professionalDelivery' ? '#bfdbfe' : '#fde68a'};">
          <p style="margin: 5px 0; color: ${orderData.deliveryMethod === 'professionalDelivery' ? '#1e40af' : '#d97706'};"><strong>Artisan:</strong> ${orderData.artisanInfo.name}</p>
          ${orderData.artisanInfo.phone ? `<p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${orderData.artisanInfo.phone}</p>` : ''}
        </div>
      ` : ''}
      ${orderData.patronInfo || orderData.guestInfo ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${orderData.deliveryMethod === 'professionalDelivery' ? '#bfdbfe' : '#fde68a'};">
          <h4 style="color: ${orderData.deliveryMethod === 'professionalDelivery' ? '#1e40af' : '#d97706'}; margin: 0 0 10px 0;">Customer Information</h4>
          <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${(orderData.patronInfo || orderData.guestInfo).firstName} ${(orderData.patronInfo || orderData.guestInfo).lastName}</p>
          ${(orderData.patronInfo || orderData.guestInfo).email ? `<p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${(orderData.patronInfo || orderData.guestInfo).email}</p>` : ''}
          ${(orderData.patronInfo || orderData.guestInfo).phone ? `<p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${(orderData.patronInfo || orderData.guestInfo).phone}</p>` : ''}
        </div>
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
          <p style="color: #666; font-size: 14px;">Thank you for choosing BazaarMkt!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate order confirmation HTML template (enhanced version for handmade marketplace)
const generateOrderConfirmationHTML = (recipientName, orderData) => {
  const orderItems = orderData.items?.map(item => 
    `<div class="product-item responsive-flex" style="display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #e7e5e4;">
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #292524; margin-bottom: 6px; font-size: 15px;">${item.productName || item.product?.name || item.name || 'Item'}</div>
        <div style="font-size: 13px; color: #78716c;">
          Quantity: ${item.quantity} × $${(item.unitPrice || item.price || 0).toFixed(2)}
          ${item.productType === 'made_to_order' ? ' <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Handcrafted</span>' : ''}
        </div>
      </div>
      <div class="product-price" style="font-weight: 700; color: #78350f; align-self: center; white-space: nowrap; font-size: 15px;">$${((item.unitPrice || item.price || 0) * (item.quantity || 0)).toFixed(2)}</div>
    </div>`
  ).join('') || '<p style="text-align: center; color: #78716c;">No items</p>';

  const isPickupOrder = orderData.deliveryMethod === 'pickup';
  const orderNumber = orderData.orderNumber || orderData.orderId?.slice(-8) || 'N/A';
  const artisanName = orderData.artisanInfo?.name || orderData.artisanName || 'Local Artisan';
  
  // Enhanced delivery/pickup info with artisan marketplace styling
  const deliveryInfo = isPickupOrder ? `
    <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #d1fae5;">
      <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">Pickup Details</h3>
      ${orderData.pickupAddress ? `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; color: #14532d; font-weight: 600; font-size: 14px;">Location:</p>
          <p style="margin: 0; color: #166534; line-height: 1.6;">
            ${typeof orderData.pickupAddress === 'string' 
              ? orderData.pickupAddress 
              : `${orderData.pickupAddress.street}<br>${orderData.pickupAddress.city}, ${orderData.pickupAddress.state} ${orderData.pickupAddress.zipCode}`
            }
          </p>
        </div>
      ` : '<p style="margin: 0; color: #166534;">Pickup location will be confirmed by your artisan</p>'}
      ${orderData.pickupTime ? `
        <div style="background: #dcfce7; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; color: #166534;"><strong>Pickup Time:</strong> ${orderData.pickupTime}</p>
        </div>
      ` : ''}
      ${orderData.artisanInfo ? `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1fae5;">
          <p style="margin: 0 0 12px 0; color: #14532d; font-weight: 600;">Artisan Contact:</p>
          <p style="margin: 6px 0; color: #166534;">${orderData.artisanInfo.name}</p>
          ${orderData.artisanInfo.phone ? `<p style="margin: 6px 0; color: #166534;">Phone: ${orderData.artisanInfo.phone}</p>` : ''}
          ${orderData.artisanInfo.email ? `<p style="margin: 6px 0; color: #166534;">Email: ${orderData.artisanInfo.email}</p>` : ''}
          ${orderData.artisanInfo.pickupInstructions ? `
          <div style="background: #dcfce7; padding: 12px; border-radius: 6px; margin-top: 12px;">
            <p style="margin: 0; color: #166534; font-size: 13px;"><strong>Special Instructions:</strong> ${orderData.artisanInfo.pickupInstructions}</p>
          </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  ` : orderData.deliveryAddress ? `
    <div style="background: #fef7ed; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #fed7aa;">
      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Delivery Details</h3>
      <div style="margin-bottom: 15px;">
        <p style="margin: 0 0 8px 0; color: #78350f; font-weight: 600; font-size: 14px;">Delivery Address:</p>
        <p style="margin: 0; color: #92400e; line-height: 1.6;">
          ${orderData.deliveryAddress.street}<br>
          ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.zipCode}
        </p>
      </div>
      ${orderData.estimatedDeliveryTime ? `
        <div style="background: #fed7aa; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; color: #78350f;"><strong>Estimated Delivery:</strong> ${orderData.estimatedDeliveryTime}</p>
        </div>
      ` : ''}
      ${orderData.artisanInfo ? `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #fed7aa;">
          <p style="margin: 0 0 12px 0; color: #78350f; font-weight: 600;">Artisan Contact:</p>
          <p style="margin: 6px 0; color: #92400e;">${orderData.artisanInfo.name}</p>
          ${orderData.artisanInfo.phone ? `<p style="margin: 6px 0; color: #92400e;">Phone: ${orderData.artisanInfo.phone}</p>` : ''}
          ${orderData.artisanInfo.email ? `<p style="margin: 6px 0; color: #92400e;">Email: ${orderData.artisanInfo.email}</p>` : ''}
        </div>
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
      <title>Order Confirmation - BazaarMkt</title>
      <style>
        @media only screen and (max-width: 600px) {
          .email-container { padding: 10px !important; }
          .header { padding: 20px !important; }
          .content { padding: 15px !important; }
          .product-item { flex-direction: column !important; }
          .product-price { margin-top: 8px !important; }
        }
      </style>
    </head>
    <body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #292524; max-width: 600px; margin: 0 auto; padding: 0; background: #fafaf9;">
      
      <!-- Header with artisan marketplace feel -->
      <div class="header" style="background: linear-gradient(to right, #78350f, #92400e); padding: 40px 30px; text-align: center;">
        <h1 style="color: #fef3c7; margin: 0; font-size: 32px; font-weight: 400; letter-spacing: 1px; font-family: Georgia, serif;">BazaarMkt</h1>
        <p style="color: #fde68a; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase;">Handcrafted with Care</p>
        <div style="background: #fef3c7; color: #78350f; padding: 10px 20px; margin: 20px auto 0; display: inline-block; border-radius: 6px; font-weight: 600;">
          Order #${orderNumber}
        </div>
      </div>
      
      <!-- Content Section -->
      <div class="content" style="background: #fafaf9; padding: 35px 30px;">
        
        <!-- Greeting -->
        <p style="color: #57534e; font-size: 16px; margin: 0 0 25px 0;">
          Hello ${recipientName},
        </p>
        <p style="color: #57534e; font-size: 15px; margin: 0 0 30px 0; line-height: 1.8;">
          Thank you for supporting local artisans! Your order from <strong style="color: #78350f;">${artisanName}</strong> has been confirmed and is being prepared with care.
        </p>
        
        <!-- Order Summary Card -->
        <div style="background: #ffffff; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e7e5e4; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #78350f; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #fef3c7; padding-bottom: 12px;">Order Summary</h2>
          <div style="margin-bottom: 15px;">
            <p style="margin: 8px 0; color: #57534e;"><span style="color: #78716c;">Order Number:</span> <strong>#${orderNumber}</strong></p>
            <p style="margin: 8px 0; color: #57534e;"><span style="color: #78716c;">Date:</span> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 8px 0; color: #57534e;"><span style="color: #78716c;">Artisan:</span> <strong>${artisanName}</strong></p>
          </div>
        </div>
        
        <!-- Order Status Timeline -->
        ${generateOrderTimelineHTML(initialStatus, orderData.deliveryMethod)}
        
        <!-- Order Items Card -->
        <div style="background: #ffffff; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e7e5e4; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: #78350f; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #fef3c7; padding-bottom: 12px;">Your Handcrafted Items</h3>
          ${orderItems}
          
          <!-- Pricing Breakdown -->
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e7e5e4;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #78716c; font-size: 14px;">Subtotal:</span>
              <span style="color: #57534e; font-weight: 600;">$${(orderData.subtotal || orderData.totalAmount || 0).toFixed(2)}</span>
            </div>
            ${orderData.deliveryFee && orderData.deliveryFee > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #78716c; font-size: 14px;">
                Delivery Fee ${orderData.deliveryMethod === 'personalDelivery' ? '(Personal)' : orderData.deliveryMethod === 'professionalDelivery' ? '(Professional)' : ''}
              </span>
              <span style="color: #57534e; font-weight: 600;">$${orderData.deliveryFee.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #78350f;">
              <span style="font-weight: 700; font-size: 18px; color: #292524;">Total</span>
              <span style="font-weight: 700; font-size: 20px; color: #78350f;">$${(orderData.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        ${deliveryInfo}
        
        <!-- Next Steps -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0;">
          <h3 style="color: #78350f; margin: 0 0 12px 0; font-size: 18px;">${nextAction.title}</h3>
          <p style="margin: 0 0 15px 0; color: #57534e; line-height: 1.7;">${nextAction.message}</p>
          <div style="background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #78350f;">
            <p style="margin: 0; color: #78350f; font-weight: 600; font-size: 14px;">${nextAction.action}</p>
          </div>
        </div>
        
        <!-- Support Section -->
        <div style="background: #ffffff; padding: 25px; border-radius: 12px; margin-top: 30px; border: 1px solid #e7e5e4; text-align: center;">
          <h3 style="color: #78350f; margin: 0 0 15px 0;">Questions About Your Order?</h3>
          <p style="margin: 0 0 15px 0; color: #57534e; line-height: 1.7;">
            Our team is here to help! Reach out anytime.
          </p>
          <a href="mailto:bazaar@bazaarmkt.ca" style="display: inline-block; background: #78350f; color: #fef3c7; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;">
            Contact Support
          </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e7e5e4;">
          <p style="color: #78716c; font-size: 13px; margin: 8px 0; font-style: italic;">
            "Supporting Local Artisans, One Handcrafted Product at a Time"
          </p>
          <p style="color: #a8a29e; font-size: 12px; margin: 20px 0 5px 0;">
            © ${new Date().getFullYear()} BazaarMkt - Handmade Marketplace
          </p>
          <p style="color: #a8a29e; font-size: 12px; margin: 5px 0;">
            <a href="mailto:bazaar@bazaarmkt.ca" style="color: #78350f; text-decoration: none;">bazaar@bazaarmkt.ca</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email via Brevo (for registered users)
const sendBrevoEmail = async (userId, notificationData, db) => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not configured, skipping email');
    return;
  }

  if (!db) {
    console.error('❌ Database connection not provided to sendBrevoEmail');
    throw new Error('Database connection required');
  }
  
  // Get user email
  const user = await db.collection('users').findOne({ 
    _id: new (require('mongodb')).ObjectId(userId) 
  });
  
  // Get order details if orderId is provided
  let order = null;
  let artisan = null;
  if (notificationData.orderId) {
    order = await db.collection('orders').findOne({ 
      _id: new (require('mongodb')).ObjectId(notificationData.orderId) 
    });
    
    // Get artisan details for pickup/delivery information
    if (order && order.artisan) {
      const artisanId = typeof order.artisan === 'object' ? order.artisan._id : order.artisan;
      artisan = await db.collection('artisans').findOne({
        _id: new (require('mongodb')).ObjectId(artisanId)
      });
    }
  }
  
  // Connection managed by middleware - no close needed
  
  if (!user || !user.email) {
    throw new Error('User email not found');
  }

  const { title, message, orderNumber, updateDetails, type, updateType, status } = notificationData;
  const recipientName = `${user.firstName} ${user.lastName}`;
  
  // Use orderData from notificationData if provided (already has artisan info), otherwise build it
  let orderData;
  if (notificationData.orderData && notificationData.orderData.artisanInfo) {
    // Use the pre-built orderData from order creation (has artisan info already)
    console.log('✅ Using pre-built orderData from notification (includes artisan info)');
    console.log('📋 Artisan info details:', {
      hasArtisanInfo: !!notificationData.orderData.artisanInfo,
      artisanName: notificationData.orderData.artisanInfo?.name,
      artisanEmail: notificationData.orderData.artisanInfo?.email,
      artisanPhone: notificationData.orderData.artisanInfo?.phone,
      hasPickupAddress: !!notificationData.orderData.artisanInfo?.pickupAddress,
      pickupAddressType: typeof notificationData.orderData.artisanInfo?.pickupAddress,
      pickupAddress: notificationData.orderData.artisanInfo?.pickupAddress,
      hasPickupInstructions: !!notificationData.orderData.artisanInfo?.pickupInstructions
    });
    orderData = notificationData.orderData;
  } else if (order) {
    // Build orderData from fetched order
    console.log('⚠️ Building orderData from database (notification missing artisan info)');
    orderData = {
      orderNumber: orderNumber || order._id.toString().slice(-8),
      orderId: order._id.toString(),
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      items: order.items,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      artisanName: artisan?.businessName || artisan?.artisanName || order.artisanName,
      // Use artisan's pickup address from fulfillment structure
      pickupAddress: (() => {
        if (!artisan) return order.pickupAddress;
        let addr = null;
        if (artisan.fulfillment?.methods?.pickup?.enabled) {
          addr = artisan.fulfillment.methods.pickup.useBusinessAddress ? 
                 artisan.address : artisan.fulfillment.methods.pickup.location;
        }
        return addr || artisan.pickupAddress || artisan.address || order.pickupAddress;
      })(),
      pickupTime: order.pickupTimeWindows ? 
        Object.values(order.pickupTimeWindows)[0]?.fullLabel : 
        (order.pickupTimeWindow?.timeSlotLabel || order.pickupTime),
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      status: order.status,
      // Artisan information for customer emails
      artisanInfo: artisan ? {
        name: artisan.businessName || artisan.artisanName,
        email: artisan.email || artisan.contactInfo?.email,
        phone: artisan.phone || artisan.contactInfo?.phone,
        pickupAddress: (() => {
          let addr = null;
          if (artisan.fulfillment?.methods?.pickup?.enabled) {
            addr = artisan.fulfillment.methods.pickup.useBusinessAddress ? 
                   artisan.address : artisan.fulfillment.methods.pickup.location;
          }
          return addr || artisan.pickupAddress || artisan.address;
        })(),
        pickupInstructions: artisan.fulfillment?.methods?.pickup?.instructions || 
                          artisan.fulfillment?.pickupInstructions || 
                          artisan.pickupInstructions
      } : null,
      // Customer/Guest information for artisan emails
      customerName: order.isGuestOrder 
        ? `${order.guestInfo?.firstName || ''} ${order.guestInfo?.lastName || ''}`.trim()
        : recipientName,
      customerEmail: order.isGuestOrder ? order.guestInfo?.email : user.email,
      guestInfo: order.isGuestOrder ? order.guestInfo : null,
      patronInfo: order.patron || (user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null),
      customerPhone: order.isGuestOrder ? order.guestInfo?.phone : user.phone,
      isGuest: order.isGuestOrder || false
    };
  } else {
    // Fallback minimal orderData
    orderData = {
      orderNumber: orderNumber,
      totalAmount: updateDetails?.totalAmount || 0,
      items: [],
      deliveryMethod: 'pickup',
      status: status || updateDetails?.newStatus || 'pending',
      customerName: recipientName,
      customerEmail: user.email,
      isGuest: false
    };
  }
  
  // Use basic template (frontend imports cause module errors in backend context)
  // The basic template is comprehensive and includes all order details
  let htmlContent;
  if (type === 'order_completion' || type === 'new_order' || type === 'order_placed' || type === 'order_confirmed') {
    htmlContent = generateOrderConfirmationHTML(recipientName, orderData);
  } else if (type === 'new_order_pending') {
    // For artisans receiving new pending orders
    htmlContent = generateOrderUpdateHTML(recipientName, orderData, 'new_pending_order', updateDetails || {});
  } else if (type === 'order_declined') {
    // For customers receiving order decline notifications
    htmlContent = generateOrderUpdateHTML(recipientName, orderData, 'order_declined', updateDetails || {});
  } else if (type === 'order_preparing' || type === 'order_ready' || type === 'order_completed') {
    // For order status updates
    htmlContent = generateOrderUpdateHTML(recipientName, orderData, 'status_update', updateDetails || {});
  } else {
    htmlContent = generateOrderUpdateHTML(recipientName, orderData, updateType || 'status_change', updateDetails || {});
  }
  
  // Generate dynamic subject line based on status
  const currentStatus = orderData.status || updateDetails?.newStatus || status || 'pending';
  const dynamicSubject = generateSubjectLine(currentStatus, orderData.orderNumber, orderData.deliveryMethod);
  
  const emailData = {
    sender: {
      name: 'BazaarMkt',
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
const sendGuestEmail = async (guestEmail, guestName, notificationData, db) => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not configured, skipping guest email');
    return;
  }

  const { title, message, orderNumber, updateDetails, type, updateType, orderId, status } = notificationData;
  
  // Use orderData from notificationData if provided (already has artisan info), otherwise build it
  let orderData;
  if (notificationData.orderData && notificationData.orderData.artisanInfo) {
    // Use the pre-built orderData from order creation (has artisan info already)
    console.log('✅ Using pre-built orderData from notification for guest (includes artisan info)');
    orderData = notificationData.orderData;
  } else {
    // Get order details if orderId is provided and build orderData
    let order = null;
    let artisan = null;
    if (orderId && db) {
      order = await db.collection('orders').findOne({ 
        _id: new (require('mongodb')).ObjectId(orderId) 
      });
      
      // Get artisan details for pickup/delivery information
      if (order && order.artisan) {
        const artisanId = typeof order.artisan === 'object' ? order.artisan._id : order.artisan;
        artisan = await db.collection('artisans').findOne({
          _id: new (require('mongodb')).ObjectId(artisanId)
        });
        
        // Map fulfillment data to artisan for email template
        if (artisan && artisan.fulfillment?.methods) {
          if (artisan.fulfillment.methods.pickup && !artisan.pickupAddress) {
            artisan.pickupAddress = artisan.fulfillment.methods.pickup.useBusinessAddress ? 
              artisan.address : artisan.fulfillment.methods.pickup.location;
          }
          if (!artisan.pickupInstructions && artisan.fulfillment.methods.pickup?.instructions) {
            artisan.pickupInstructions = artisan.fulfillment.methods.pickup.instructions;
          }
        }
      }
    }
    
    console.log('⚠️ Building orderData from database for guest (notification missing artisan info)');
    // Prepare comprehensive order data for templates with all necessary information
    orderData = order ? {
      orderNumber: orderNumber || order._id.toString().slice(-8),
      orderId: order._id.toString(),
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      items: order.items,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      artisanName: artisan?.businessName || artisan?.artisanName || order.artisanName,
      pickupAddress: (() => {
        if (!artisan) return order.pickupAddress;
        let addr = null;
        if (artisan.fulfillment?.methods?.pickup?.enabled) {
          addr = artisan.fulfillment.methods.pickup.useBusinessAddress ? 
                 artisan.address : artisan.fulfillment.methods.pickup.location;
        }
        return addr || artisan.pickupAddress || artisan.address || order.pickupAddress;
      })(),
      pickupTime: order.pickupTimeWindows ? 
        Object.values(order.pickupTimeWindows)[0]?.fullLabel : 
        (order.pickupTimeWindow?.timeSlotLabel || order.pickupTime),
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      status: order.status,
      // Artisan information for customer/guest emails
      artisanInfo: artisan ? {
        name: artisan.businessName || artisan.artisanName,
        email: artisan.email || artisan.contactInfo?.email,
        phone: artisan.phone || artisan.contactInfo?.phone,
        pickupAddress: (() => {
          let addr = null;
          if (artisan.fulfillment?.methods?.pickup?.enabled) {
            addr = artisan.fulfillment.methods.pickup.useBusinessAddress ? 
                   artisan.address : artisan.fulfillment.methods.pickup.location;
          }
          return addr || artisan.pickupAddress || artisan.address;
        })(),
        pickupInstructions: artisan.fulfillment?.methods?.pickup?.instructions || 
                          artisan.fulfillment?.pickupInstructions || 
                          artisan.pickupInstructions
      } : null,
      // Customer/Guest information
      customerName: order.isGuestOrder 
        ? `${order.guestInfo?.firstName || ''} ${order.guestInfo?.lastName || ''}`.trim()
        : guestName,
      customerEmail: order.isGuestOrder ? order.guestInfo?.email : guestEmail,
      customerPhone: order.isGuestOrder ? order.guestInfo?.phone : null,
      guestInfo: order.guestInfo,
      isGuest: order.isGuestOrder || true
    } : {
      orderNumber: orderNumber,
      totalAmount: updateDetails?.totalAmount || 0,
      items: [],
      deliveryMethod: 'pickup',
      status: status || updateDetails?.newStatus || 'pending',
      customerName: guestName,
      customerEmail: guestEmail,
      isGuest: true
    };
  }
  
  // Use backend email templates (comprehensive with all order details)
  let htmlContent;
  if (type === 'order_completion' || type === 'order_placed' || type === 'order_confirmed') {
    htmlContent = generateOrderConfirmationHTML(guestName, orderData);
  } else if (type === 'new_order_pending') {
    // For artisans receiving new pending guest orders
    htmlContent = generateOrderUpdateHTML(guestName, orderData, 'new_pending_order', updateDetails || {});
  } else if (type === 'order_declined') {
    // For guests receiving order decline notifications
    htmlContent = generateOrderUpdateHTML(guestName, orderData, 'order_declined', updateDetails || {});
  } else if (type === 'order_preparing' || type === 'order_ready' || type === 'order_completed') {
    // For order status updates
    htmlContent = generateOrderUpdateHTML(guestName, orderData, 'status_update', updateDetails || {});
  } else {
    htmlContent = generateOrderUpdateHTML(guestName, orderData, updateType || 'status_change', updateDetails || {});
  }
  
  // Generate dynamic subject line based on status
  const currentStatus = orderData.status || updateDetails?.newStatus || status || 'pending';
  const dynamicSubject = generateSubjectLine(currentStatus, orderData.orderNumber, orderData.deliveryMethod);
  
  const emailData = {
    sender: {
      name: 'BazaarMkt',
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
    
    // For guest orders (no userId), only send email notifications, skip platform notifications
    if (!userId) {
      console.log('📧 Guest order notification - skipping platform notification, sending email only');
      // Continue to email notification logic below
    }
    
    // Only create platform notifications for registered users (not guests)
    if (userId) {
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
    }
    
    res.json({
      success: true,
      message: userId ? 'Notification sent successfully' : 'Email notification sent (guest order)',
      data: userId ? { userId, type, orderId: notificationData.orderId } : { isGuest: true, type, orderId: notificationData.orderId }
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
const checkNotificationPreference = async (userId, notificationType, channel = 'email', db) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not provided to checkNotificationPreference, skipping check');
      return true; // Default to allowing notification
    }
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
const sendPreferenceBasedNotification = async (userId, notificationData, db) => {
  try {
    const { type, title, message, orderId, orderNumber, status, updateType, updateDetails } = notificationData;
    
    if (!db) {
      console.error('❌ Database connection not provided to sendPreferenceBasedNotification');
      throw new Error('Database connection required');
    }
    
    // Get user to check role
    const user = await db.collection('users').findOne({ 
      _id: new (require('mongodb')).ObjectId(userId) 
    });
    // Connection managed by middleware - no close needed
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const userRole = user.role || user.userType;
    
    // Check if this is a guest order (from notification data)
    const isGuestOrder = notificationData.userInfo?.isGuest || 
                        notificationData.orderData?.isGuestOrder || 
                        false;
    
    // Determine notification type for preference checking
    let preferenceType = 'promotions'; // default
    if (type === 'order_update' || type === 'order_completion' || type === 'order_placed' || type === 'new_order_pending' || 
        type === 'order_declined' || type === 'order_confirmed' || type === 'order_preparing' || type === 'order_ready' || 
        type === 'order_completed') {
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
    
    // Determine if this is a seller or buyer notification for artisans (used for both email and push)
    const isSellerNotification = type === 'new_order' || 
                                 type === 'new_order_pending' ||
                                 type === 'order_created_seller' ||
                                 type === 'order_cancelled' ||  // Seller gets email when buyer cancels
                                 type === 'courier_on_way' ||
                                 type === 'delivery_cost_increase';
    
    const isBuyerNotification = type === 'order_created_buyer' ||
                               type === 'order_confirmed' ||
                               type === 'order_preparing' ||
                               type === 'order_ready_for_pickup' ||
                               type === 'order_ready_for_delivery' ||
                               type === 'order_out_for_delivery' ||
                               type === 'order_picked_up' ||
                               type === 'order_delivered' ||
                               type === 'order_declined';
    
    // Email sending logic based on user role and notification type
    let shouldSendEmail = false;
    
    if (userRole === 'artisan') {
      // ARTISANS AS SELLERS: Send email for orders they're selling
      // ARTISANS AS BUYERS: Send email for orders they're buying (treat as patron)
      shouldSendEmail = isSellerNotification || isBuyerNotification || type === 'order_completed';
      
      console.log(`📧 Artisan notification: type=${type}, isSeller=${isSellerNotification}, isBuyer=${isBuyerNotification}, sendEmail=${shouldSendEmail}`);
    } else if (isGuestOrder) {
      // GUESTS: Send email for ALL status changes (they can't see in-app notifications)
      shouldSendEmail = true;
      console.log(`📧 Guest order notification: type=${type}, sendEmail=true (guest gets all emails)`);
    } else if (userRole === 'patron' || userRole === 'customer' || userRole === 'buyer') {
      // PATRONS (REGISTERED): Send email ONLY for key events
      // They get in-app notifications for everything else (notification bell)
      shouldSendEmail = type === 'order_placed' ||           // Initial confirmation
                       type === 'order_confirmed' ||         // Artisan accepted
                       type === 'order_preparing' ||         // Order being prepared
                       type === 'order_ready_for_pickup' ||  // Ready for pickup
                       type === 'order_ready_for_delivery' || // Ready for delivery
                       type === 'order_out_for_delivery' ||  // With tracking info
                       type === 'order_picked_up' ||         // Picked up
                       type === 'order_delivered' ||         // Delivered
                       type === 'order_completed' ||         // Completed
                       type === 'delivery_refund' ||         // Refund processed
                       type === 'order_declined' ||          // Order rejected
                       type === 'order_cancelled';           // Order cancelled
      console.log(`📧 Patron (registered) notification: type=${type}, sendEmail=${shouldSendEmail}`);
    } else {
      // For other types, check preferences
      shouldSendEmail = await checkNotificationPreference(userId, preferenceType, 'email', db);
    }
    
    if (shouldSendEmail) {
      // Send email notification via Brevo
      try {
        await sendBrevoEmail(userId, notificationData, db);
        console.log(`✅ Email sent to user ${userId} (${userRole}): ${title}`);
      } catch (error) {
        console.error(`❌ Failed to send email to user ${userId}:`, error.message);
      }
    } else {
      console.log(`⏭️ Skipping email for user ${userId} (${userRole}, type=${type})`);
    }
    
    // Check push preferences for in-app notifications
    // For critical order updates, always send push notifications (buyers need to know!)
    let shouldSendPush = false;
    
    if (userRole === 'artisan') {
      // Artisans as buyers ALWAYS get in-app notifications for their purchases
      shouldSendPush = isBuyerNotification || isSellerNotification || type === 'order_completed';
      console.log(`🔔 Artisan push notification: type=${type}, shouldSendPush=${shouldSendPush}`);
    } else if (isGuestOrder) {
      // Guests don't have in-app access, so no push notification
      shouldSendPush = false;
    } else if (userRole === 'patron' || userRole === 'customer' || userRole === 'buyer') {
      // Patrons ALWAYS get in-app notifications for order updates
      shouldSendPush = type === 'order_placed' ||
                       type === 'order_confirmed' ||
                       type === 'order_preparing' ||
                       type === 'order_ready_for_pickup' ||
                       type === 'order_ready_for_delivery' ||
                       type === 'order_out_for_delivery' ||
                       type === 'order_picked_up' ||
                       type === 'order_delivered' ||
                       type === 'order_completed' ||
                       type === 'order_declined' ||
                       type === 'order_cancelled';
      console.log(`🔔 Patron push notification: type=${type}, shouldSendPush=${shouldSendPush}`);
    } else {
      // For other types, check preferences
      shouldSendPush = await checkNotificationPreference(userId, preferenceType, 'push', db);
    }
    
    if (shouldSendPush && userId) {
      // Send platform notification
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
    } else {
      console.log(`⏭️ Skipping push notification for user ${userId} (${userRole}, type=${type})`);
    }
    
    return {
      emailSent: shouldSendEmail,
      pushSent: shouldSendPush,
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
    
    const result = await sendPreferenceBasedNotification(userId, notificationData, req.db);
    
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
    
    await sendGuestEmail(guestEmail, guestName || 'Customer', notificationData, req.db);
    
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
    
    // If this is an order-related email, send via appropriate method
    if (template === 'order_completion' || template === 'order_status_update' || data?.isGuest !== undefined || data?.orderId) {
      const userName = data.userName || 'Customer';
      const isGuest = data.isGuest === true;
      
      // Prepare order data
      const orderData = {
        _id: data.orderId,
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        items: data.items || [],
        deliveryMethod: data.deliveryMethod || 'pickup',
        deliveryAddress: data.deliveryAddress,
        deliveryInstructions: data.deliveryInstructions,
        pickupTimeWindows: data.pickupTimeWindows,
        selectedPickupTimes: data.selectedPickupTimes,
        artisan: data.artisan,
        artisanName: data.artisan?.artisanName || data.artisanName,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const notificationData = {
        title: subject,
        message: data.message || `Your order #${data.orderNumber} has been updated!`,
        type: template || 'order_status_update',
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        updateDetails: {
          newStatus: data.status || data.newStatus,
          status: data.status || data.newStatus,
          reason: data.reason,
          ...data
        }
      };
      
      if (isGuest) {
        // Send guest email
        await sendGuestEmail(to, userName, notificationData, req.db);
      } else if (data.userId) {
        // Send registered user email
        await sendBrevoEmail(data.userId, notificationData, req.db);
      }
      
      return res.json({
        success: true,
        message: 'Email notification sent successfully',
        data: { template, recipient: to, status: data.status || data.newStatus }
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
        name: 'BazaarMkt',
        email: 'bazaar@bazaarmkt.ca'
      },
      to: [{
        email: to,
        name: data.userName || 'Customer'
      }],
      subject: subject,
      htmlContent: data.htmlContent || `<p>${data.message || 'You have a notification from BazaarMkt'}</p>`,
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
module.exports.sendNotification = sendNotification;
module.exports.sendEmailNotification = sendEmailNotification;
module.exports.sendPreferenceBasedNotification = sendPreferenceBasedNotification;
