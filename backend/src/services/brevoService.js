const axios = require('axios');
require('dotenv').config();

// Brevo API configuration
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Get Brevo API headers
const getBrevoHeaders = () => {
  if (!BREVO_API_KEY) {
    throw new Error('Brevo API key not found in environment variables');
  }
  
  return {
    'api-key': BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

// Send transactional email via Brevo
const sendTransactionalEmail = async (emailData) => {
  try {
    console.log('📧 Sending email via Brevo:', {
      to: emailData.to,
      subject: emailData.subject,
      templateId: emailData.templateId || 'none'
    });

    const payload = {
      sender: {
        name: 'bazaar',
        email: 'noreply@bazaarmkt.ca'
      },
      to: [
        {
          email: emailData.to,
          name: emailData.toName || emailData.to
        }
      ],
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      textContent: emailData.textContent || emailData.subject
    };

    // Add reply-to if provided
    if (emailData.replyTo) {
      payload.replyTo = {
        email: emailData.replyTo,
        name: 'bazaar Support'
      };
    }

    const response = await axios.post(BREVO_API_URL, payload, {
      headers: getBrevoHeaders()
    });

    console.log('✅ Email sent successfully via Brevo:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error.response?.data || error.message);
    throw error;
  }
};

// Send order notification email
const sendOrderNotificationEmail = async (type, email, orderDetails, orderId) => {
  try {
    // Generate email content based on type
    const emailContent = generateOrderEmailContent(type, orderDetails, orderId);
    
    const emailData = {
      to: email,
      toName: orderDetails?.customerName || 'Customer',
      subject: emailContent.subject,
      htmlContent: emailContent.htmlBody,
      textContent: emailContent.textBody,
      replyTo: 'support@bazaarmkt.ca'
    };

    return await sendTransactionalEmail(emailData);

  } catch (error) {
    console.error('❌ Error sending order notification email:', error);
    throw error;
  }
};

// Generate email content for order notifications
const generateOrderEmailContent = (type, orderDetails, orderId) => {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const customerName = orderDetails?.customerName || 'Customer';
  const artisanName = orderDetails?.artisanName || 'Your artisan';
  const orderTotal = orderDetails?.orderTotal || 0;
  const orderDate = orderDetails?.orderDate ? new Date(orderDetails.orderDate).toLocaleDateString() : 'N/A';
  
  // Generate timeline HTML
  const timeline = generateOrderTimeline(orderDetails, orderId);
  
  // Generate order items list
  const itemsList = orderDetails?.orderItems?.map(item => 
    `• ${item.productName} x${item.quantity} - $${item.totalPrice}`
  ).join('\n') || '• Order items not available';

  // Status-specific content
  const statusContent = getStatusSpecificContent(type, orderDetails);

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${statusContent.subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #007bff; margin: 0 0 10px 0;">bazaar</h1>
        <p style="margin: 0; color: #666;">Supporting Local Artisans</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin: 0 0 20px 0;">${statusContent.title}</h2>
        
        <p>Dear ${customerName},</p>
        
        <p>${statusContent.message}</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Order Details:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Order Number:</strong> ${orderNumber}</li>
            <li><strong>Order Date:</strong> ${orderDate}</li>
            <li><strong>Product Total:</strong> $${(orderTotal - (orderDetails?.deliveryFee || 0)).toFixed(2)}</li>
            ${orderDetails?.deliveryFee && orderDetails.deliveryFee > 0 ? `<li><strong>Delivery Fee:</strong> $${orderDetails.deliveryFee.toFixed(2)}</li>` : ''}
            <li><strong>Total Amount:</strong> $${orderTotal}</li>
            <li><strong>Artisan:</strong> ${artisanName}</li>
            <li><strong>Current Status:</strong> ${statusContent.currentStatus}</li>
            <li><strong>Delivery Method:</strong> ${orderDetails?.deliveryMethod === 'pickup' || orderDetails?.deliveryMethod === 'pickupOrder' ? 'Pickup' : orderDetails?.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : 'Professional Delivery'}</li>
            ${orderDetails?.deliveryInstructions ? `<li><strong>Delivery Instructions:</strong> ${orderDetails.deliveryInstructions}</li>` : ''}
            ${orderDetails?.deliveryAddress ? `
              <li><strong>Delivery Address:</strong><br>
                ${orderDetails.deliveryAddress.street}<br>
                ${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.state} ${orderDetails.deliveryAddress.zipCode}<br>
                ${orderDetails.deliveryAddress.country}
              </li>
            ` : ''}
          </ul>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Order Items:</h3>
          <pre style="margin: 0; white-space: pre-wrap; font-family: Arial, sans-serif;">${itemsList}</pre>
        </div>
        
        ${timeline}
        
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">What Happens Next:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${statusContent.nextSteps.map(step => `<li>${step}</li>`).join('')}
          </ul>
        </div>
        
        <p>Thank you for choosing bazaar and supporting local artisans!</p>
        
        <p>Best regards,<br>The bazaar Team</p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          This is an automated notification. Please do not reply to this email.<br>
          For support, contact us at <a href="mailto:support@bazaarmkt.ca">support@bazaarmkt.ca</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
Dear ${customerName},

${statusContent.message}

ORDER DETAILS:
• Order Number: ${orderNumber}
• Order Date: ${orderDate}
• Product Total: $${(orderTotal - (orderDetails?.deliveryFee || 0)).toFixed(2)}
${orderDetails?.deliveryFee && orderDetails.deliveryFee > 0 ? `• Delivery Fee: $${orderDetails.deliveryFee.toFixed(2)}` : ''}
• Total Amount: $${orderTotal}
• Artisan: ${artisanName}
• Current Status: ${statusContent.currentStatus}
• Delivery Method: ${orderDetails?.deliveryMethod === 'pickup' || orderDetails?.deliveryMethod === 'pickupOrder' ? 'Pickup' : orderDetails?.deliveryMethod === 'personalDelivery' ? 'Personal Delivery' : 'Professional Delivery'}
${orderDetails?.deliveryInstructions ? `• Delivery Instructions: ${orderDetails.deliveryInstructions}` : ''}
${orderDetails?.deliveryAddress ? `• Delivery Address: ${orderDetails.deliveryAddress.street}, ${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.state} ${orderDetails.deliveryAddress.zipCode}, ${orderDetails.deliveryAddress.country}` : ''}

ORDER ITEMS:
${itemsList}

${statusContent.nextSteps.map(step => `• ${step}`).join('\n')}

Thank you for choosing bazaar and supporting local artisans!

Best regards,
The bazaar Team

---
This is an automated notification. Please do not reply to this email.
For support, contact us at support@bazaarmkt.ca
  `.trim();

  return {
    subject: statusContent.subject,
    htmlBody,
    textBody
  };
};

// Get status-specific content
const getStatusSpecificContent = (type, orderDetails) => {
  const orderNumber = orderDetails?.orderNumber || 'Your order';
  const artisanName = orderDetails?.artisanName || 'your artisan';
  const deliveryMethod = orderDetails?.deliveryMethod;
  const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'pickupOrder';
  
  const statusMap = {
    'order_confirmed': {
      subject: `Order Confirmed - ${orderNumber} - bazaar`,
      title: 'Order Confirmed!',
      message: `Great news! Your order ${orderNumber} has been confirmed and is being prepared by ${artisanName}.`,
      currentStatus: 'Confirmed',
      nextSteps: [
        'Your artisan will prepare your order with care',
        'You\'ll receive updates as your order progresses',
        isPickup ? 'We\'ll notify you when it\'s ready for pickup' : 'We\'ll notify you when it\'s ready for delivery'
      ]
    },
    'order_preparing': {
      subject: `Order Being Prepared - ${orderNumber} - bazaar`,
      title: 'Order Being Prepared',
      message: `Your order ${orderNumber} is now being prepared by ${artisanName}.`,
      currentStatus: 'Preparing',
      nextSteps: [
        'Your artisan is carefully preparing your order',
        'You\'ll receive updates as your order progresses',
        isPickup ? 'We\'ll notify you when it\'s ready for pickup' : 'We\'ll notify you when it\'s ready for delivery'
      ]
    },
    'order_ready_for_pickup': {
      subject: `Order Ready for Pickup - ${orderNumber} - bazaar`,
      title: 'Order Ready for Pickup!',
      message: `Your order ${orderNumber} is ready for pickup! Please come to collect your order from ${artisanName}.`,
      currentStatus: 'Ready for Pickup',
      nextSteps: [
        'Please come to the artisan\'s location to pick up your order',
        'Bring a valid ID for verification',
        'Contact the artisan if you have any questions'
      ]
    },
    'order_ready_for_delivery': {
      subject: `Order Ready for Delivery - ${orderNumber} - bazaar`,
      title: 'Order Ready for Delivery!',
      message: `Your order ${orderNumber} is ready for delivery! ${artisanName} will deliver it to you soon.${orderDetails?.travelTimeInfo ? ` Estimated travel time: ${orderDetails.travelTimeInfo.estimatedTravelTime}.` : ' You should expect your product soon.'}`,
      currentStatus: 'Ready for Delivery',
      nextSteps: [
        orderDetails?.travelTimeInfo 
          ? `Your order will be delivered in approximately ${orderDetails.travelTimeInfo.estimatedTravelTime}`
          : 'Your order is ready and will be delivered soon',
        'You\'ll receive updates when it\'s out for delivery',
        'Please ensure someone is available to receive the order'
      ]
    },
    'order_out_for_delivery': {
      subject: `Order Out for Delivery - ${orderNumber} - bazaar`,
      title: 'Order Out for Delivery!',
      message: `Your order ${orderNumber} is out for delivery and on its way to you! ${artisanName} is bringing your order.${orderDetails?.travelTimeInfo ? ` Estimated travel time: ${orderDetails.travelTimeInfo.estimatedTravelTime}.` : ' You should expect your product soon.'}`,
      currentStatus: 'Out for Delivery',
      nextSteps: [
        orderDetails?.travelTimeInfo 
          ? `Your order should arrive in approximately ${orderDetails.travelTimeInfo.estimatedTravelTime}`
          : 'Your order is on its way to you',
        'Please ensure someone is available to receive it',
        'You\'ll be notified when it\'s delivered'
      ]
    },
    'order_delivering': {
      subject: `Order Being Delivered - ${orderNumber} - bazaar`,
      title: 'Order Being Delivered!',
      message: `Your order ${orderNumber} is currently being delivered by ${artisanName}.${orderDetails?.travelTimeInfo ? ` Estimated travel time: ${orderDetails.travelTimeInfo.estimatedTravelTime}.` : ' You should expect your product soon.'}`,
      currentStatus: 'Being Delivered',
      nextSteps: [
        orderDetails?.travelTimeInfo 
          ? `Your order should arrive in approximately ${orderDetails.travelTimeInfo.estimatedTravelTime}`
          : 'Your order is on its way to you',
        'Please ensure someone is available to receive it',
        'You\'ll be notified when it\'s delivered'
      ]
    },
    'order_delivered': {
      subject: `Order Delivered - ${orderNumber} - bazaar`,
      title: 'Order Delivered!',
      message: `Your order ${orderNumber} has been delivered successfully by ${artisanName}. Thank you for your order!`,
      currentStatus: 'Delivered',
      nextSteps: [
        'Please check your order upon delivery',
        'Rate your experience with the artisan',
        'Contact support if you have any issues'
      ]
    },
    'order_picked_up': {
      subject: `Order Picked Up - ${orderNumber} - bazaar`,
      title: 'Order Picked Up!',
      message: `Your order ${orderNumber} has been picked up successfully from ${artisanName}. Thank you for your order!`,
      currentStatus: 'Picked Up',
      nextSteps: [
        'Your order has been successfully picked up',
        'Rate your experience with the artisan',
        'Contact support if you have any issues'
      ]
    },
    'order_ready': {
      subject: `Order Ready - ${orderNumber} - bazaar`,
      title: 'Order Ready!',
      message: `Your order ${orderNumber} is ready! ${isPickup ? 'Please come to pick it up from ' + artisanName : artisanName + ' will deliver it to you soon'}.`,
      currentStatus: 'Ready',
      nextSteps: isPickup ? [
        'Please come to the artisan\'s location to pick up your order',
        'Bring a valid ID for verification',
        'Contact the artisan if you have any questions'
      ] : [
        'Your order is ready and will be delivered soon',
        'You\'ll receive updates when it\'s out for delivery',
        'Please ensure someone is available to receive the order'
      ]
    },
    // New confirmation and dispute notification types
    'pickup_confirmation': {
      subject: `Pickup Confirmed - Please Confirm Receipt - ${orderNumber} - bazaar`,
      title: 'Pickup Confirmed by Artisan!',
      message: `${artisanName} has confirmed that your order ${orderNumber} has been picked up. Please confirm that you have received your order within 24 hours.`,
      currentStatus: 'Pickup Confirmed',
      nextSteps: [
        'Please confirm that you have received your order',
        'You have 24 hours to confirm receipt',
        'If you don\'t confirm, the order will be automatically completed',
        'Contact support if you have any issues'
      ]
    },
    'delivery_confirmation': {
      subject: `Delivery Confirmed - Please Confirm Receipt - ${orderNumber} - bazaar`,
      title: 'Delivery Confirmed by Artisan!',
      message: `${artisanName} has confirmed that your order ${orderNumber} has been delivered. Please confirm that you have received your order within 24 hours.`,
      currentStatus: 'Delivery Confirmed',
      nextSteps: [
        'Please confirm that you have received your order',
        'You have 24 hours to confirm receipt',
        'If you don\'t confirm, the order will be automatically completed',
        'Contact support if you have any issues'
      ]
    },
    'dispute_reported': {
      subject: `Dispute Reported - ${orderNumber} - bazaar`,
      title: 'New Dispute Reported',
      message: `A dispute has been reported for order ${orderNumber}. Immediate attention required.`,
      currentStatus: 'Dispute Reported',
      nextSteps: [
        'Review the dispute details and evidence',
        'Contact both parties if necessary',
        'Resolve the dispute according to platform policies',
        'Update dispute status in admin dashboard'
      ]
    },
    'dispute_status_update_buyer': {
      subject: `Dispute Status Update - ${orderNumber} - bazaar`,
      title: 'Dispute Status Updated',
      message: `The status of your dispute for order ${orderNumber} has been updated by our support team.`,
      currentStatus: 'Dispute Status Updated',
      nextSteps: [
        'Review the status update and admin notes',
        'Provide additional information if requested',
        'Contact support if you have questions',
        'Wait for final resolution'
      ]
    },
    'dispute_status_update_artisan': {
      subject: `Dispute Status Update - ${orderNumber} - bazaar`,
      title: 'Dispute Status Updated',
      message: `The status of the dispute for order ${orderNumber} has been updated by our support team.`,
      currentStatus: 'Dispute Status Updated',
      nextSteps: [
        'Review the status update and admin notes',
        'Provide additional information if requested',
        'Contact support if you have questions',
        'Wait for final resolution'
      ]
    },
    'dispute_resolved_buyer': {
      subject: `Dispute Resolved - ${orderNumber} - bazaar`,
      title: 'Dispute Resolved',
      message: `Your dispute for order ${orderNumber} has been resolved by our support team.`,
      currentStatus: 'Dispute Resolved',
      nextSteps: [
        'Review the resolution details',
        'Contact support if you have questions about the resolution',
        'Rate your experience if applicable',
        'Continue shopping on bazaar'
      ]
    },
    'dispute_resolved_artisan': {
      subject: `Dispute Resolved - ${orderNumber} - bazaar`,
      title: 'Dispute Resolved',
      message: `The dispute for order ${orderNumber} has been resolved by our support team.`,
      currentStatus: 'Dispute Resolved',
      nextSteps: [
        'Review the resolution details',
        'Contact support if you have questions about the resolution',
        'Continue serving customers on bazaar',
        'Learn from the experience to improve service'
      ]
    }
  };

  return statusMap[type] || {
    subject: `Order Update - ${orderNumber} - bazaar`,
    title: 'Order Update',
    message: `Your order ${orderNumber} status has been updated.`,
    currentStatus: 'Updated',
    nextSteps: [
      'Please check your order status',
      'Contact support if you have any questions'
    ]
  };
};

// Generate order timeline (reuse from notifications.js)
const generateOrderTimeline = (orderDetails, orderId) => {
  const currentStatus = orderDetails?.orderStatus || orderDetails?.status || 'pending';
  const deliveryMethod = orderDetails?.deliveryMethod || 'pickup';
  
  // Define timeline steps based on delivery method
  const getTimelineSteps = (method) => {
    if (method === 'pickup' || method === 'pickupOrder') {
      return [
        { id: 'pending', label: 'Order Placed', description: 'Your order has been received' },
        { id: 'confirmed', label: 'Confirmed', description: 'Order confirmed by artisan' },
        { id: 'preparing', label: 'Preparing', description: 'Artisan is preparing your order' },
        { id: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Your order is ready for pickup' },
        { id: 'picked_up', label: 'Picked Up', description: 'Order has been picked up' }
      ];
    } else {
      return [
        { id: 'pending', label: 'Order Placed', description: 'Your order has been received' },
        { id: 'confirmed', label: 'Confirmed', description: 'Order confirmed by artisan' },
        { id: 'preparing', label: 'Preparing', description: 'Artisan is preparing your order' },
        { id: 'ready_for_delivery', label: 'Ready for Delivery', description: 'Your order is ready for delivery' },
        { id: 'out_for_delivery', label: 'Out for Delivery', description: 'Your order is on its way' },
        { id: 'delivered', label: 'Delivered', description: 'Order has been delivered' }
      ];
    }
  };

  const steps = getTimelineSteps(deliveryMethod);
  
  // Determine current step index
  const getCurrentStepIndex = () => {
    const stepIndex = steps.findIndex(step => step.id === currentStatus);
    if (stepIndex === -1) {
      const statusMap = {
        'ready': 3,
        'delivering': 4,
        'delivered': deliveryMethod === 'pickup' || deliveryMethod === 'pickupOrder' ? 4 : 5,
        'picked_up': 4,
        'shipped': 4,
        'cancelled': -1,
        'declined': -1
      };
      
      const mappedIndex = statusMap[currentStatus];
      if (mappedIndex !== undefined) {
        return mappedIndex;
      }
      
      return 0;
    }
    return stepIndex;
  };

  const currentStepIndex = getCurrentStepIndex();
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'declined';
  
  // Generate timeline HTML
  let timelineHtml = `
    <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">Order Progress Timeline</h3>
      <div style="position: relative;">
  `;
  
  steps.forEach((step, index) => {
    const isCompleted = index < currentStepIndex;
    const isCurrent = index === currentStepIndex;
    const isCancelledStep = isCancelled && index === 0;
    
    let statusIcon = '○';
    let statusColor = '#6c757d';
    
    if (isCancelledStep) {
      statusIcon = '✕';
      statusColor = '#dc3545';
    } else if (isCompleted) {
      statusIcon = '✓';
      statusColor = '#28a745';
    } else if (isCurrent) {
      statusIcon = '●';
      statusColor = '#007bff';
    }
    
    timelineHtml += `
      <div style="display: flex; align-items: center; margin-bottom: 12px; position: relative;">
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${statusColor};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          margin-right: 12px;
          flex-shrink: 0;
        ">${statusIcon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${step.label}</div>
          <div style="font-size: 12px; color: #666;">${step.description}</div>
        </div>
      </div>
    `;

    if (index < steps.length - 1) {
      timelineHtml += `
        <div style="
          position: absolute;
          left: 11px;
          top: 36px;
          width: 2px;
          height: 12px;
          background-color: ${isCompleted ? '#28a745' : '#dee2e6'};
        "></div>
      `;
    }
  });

  timelineHtml += `
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
        <div style="font-size: 12px; color: #666;">
          <strong>Current Status:</strong> ${steps[currentStepIndex]?.label || currentStatus}
          ${isCancelled ? '(Order Cancelled)' : ''}
        </div>
      </div>
    </div>
  `;

  return timelineHtml;
};

module.exports = {
  sendTransactionalEmail,
  sendOrderNotificationEmail
};
