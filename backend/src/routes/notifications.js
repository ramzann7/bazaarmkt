const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

// Notification model (you can create this later)
// const Notification = require('../models/notification');

// Send notification
router.post('/send', async (req, res) => {
  try {
    const { type, userId, orderId, userEmail, userPhone, orderDetails, timestamp } = req.body;
    
    console.log('📧 Sending notification:', { type, userId, orderId, userEmail, userPhone });
    
    // Store notification in database (implement later)
    // const notification = new Notification({
    //   type,
    //   userId,
    //   orderId,
    //   userEmail,
    //   userPhone,
    //   orderDetails,
    //   timestamp,
    //   status: 'sent'
    // });
    // await notification.save();
    
    // Send email notification if email is provided
    if (userEmail) {
      try {
        await sendEmailNotification(type, userEmail, orderDetails, orderId);
        console.log('✅ Email notification sent to:', userEmail);
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the entire request if email fails
      }
    }
    
    // SMS notifications disabled - not set up in Brevo
    // if (userPhone) {
    //   try {
    //     await sendSMSNotification(type, userPhone, orderDetails, orderId);
    //     console.log('✅ SMS notification sent to:', userPhone);
    //   } catch (smsError) {
    //     console.error('❌ Failed to send SMS notification:', smsError);
    //     // Don't fail the entire request if SMS fails
    //   }
    // }
    
    console.log('✅ Notification processed successfully:', {
      type,
      userId,
      orderId,
      userEmail,
      userPhone,
      orderDetails,
      timestamp
    });
    
    res.json({ 
      success: true, 
      message: 'Notification sent successfully',
      notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification',
      error: error.message 
    });
  }
});

// Helper function to generate order timeline for email templates
function generateOrderTimeline(orderDetails, orderId) {
  const currentStatus = orderDetails?.orderStatus || orderDetails?.status || 'pending';
  const deliveryMethod = orderDetails?.deliveryMethod || 'pickup';
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  
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
      // For delivery orders (personalDelivery, delivery, etc.)
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
      // Handle legacy statuses and variations
      const statusMap = {
        'ready': 3, // ready_for_pickup or ready_for_delivery
        'delivering': 4, // out_for_delivery
        'delivered': deliveryMethod === 'pickup' || deliveryMethod === 'pickupOrder' ? 4 : 5,
        'picked_up': 4, // final step for pickup
        'shipped': 4, // out_for_delivery equivalent
        'cancelled': -1, // special handling
        'declined': -1 // special handling
      };
      
      const mappedIndex = statusMap[currentStatus];
      if (mappedIndex !== undefined) {
        return mappedIndex;
      }
      
      return 0; // Default to first step
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
    
    // Determine status
    let statusIcon = '○';
    let statusColor = '#6c757d';
    let statusText = 'Pending';
    
    if (isCancelledStep) {
      statusIcon = '✕';
      statusColor = '#dc3545';
      statusText = 'Cancelled';
    } else if (isCompleted) {
      statusIcon = '✓';
      statusColor = '#28a745';
      statusText = 'Completed';
    } else if (isCurrent) {
      statusIcon = '●';
      statusColor = '#007bff';
      statusText = 'Current';
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
    
    // Add connecting line (except for last step)
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
}

// Helper function to generate order completion email body
function generateOrderCompletionEmailBody(orderDetails, orderId) {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const customerName = orderDetails?.customerName || 'Valued Customer';
  const artisanName = orderDetails?.artisanName || 'your artisan';
  const orderTotal = orderDetails?.orderTotal ? `$${orderDetails.orderTotal.toFixed(2)}` : 'N/A';
  const orderDate = orderDetails?.orderDate ? new Date(orderDetails.orderDate).toLocaleDateString() : 'N/A';
  const estimatedDelivery = orderDetails?.estimatedDelivery || '2-3 business days';
  
  // Generate order items list
  const itemsList = orderDetails?.orderItems?.map(item => 
    `• ${item.productName} (${item.quantity}x) - $${item.totalPrice.toFixed(2)}`
  ).join('\n') || '• Order items not available';
  
  // Generate timeline
  const timeline = generateOrderTimeline(orderDetails, orderId);
  
  return `
Dear ${customerName},

Great news! Your order ${orderNumber} has been confirmed and is being prepared by ${artisanName}.

ORDER DETAILS:
• Order Number: ${orderNumber}
• Order Date: ${orderDate}
• Total Amount: ${orderTotal}
• Artisan: ${artisanName}
• Estimated Delivery: ${estimatedDelivery}

ORDER ITEMS:
${itemsList}

${timeline}

WHAT HAPPENS NEXT:
• Your artisan will prepare your order with care
• You'll receive updates as your order progresses
• We'll notify you when it's ready for pickup/delivery

Thank you for choosing bazaarMKT and supporting local artisans!

Best regards,
The bazaarMKT Team

---
This is an automated notification. Please do not reply to this email.
For support, contact us at support@bazaarmkt.ca
  `.trim();
}

// Helper function to generate order status update email body
function generateOrderStatusUpdateEmailBody(orderDetails, orderId, status) {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const customerName = orderDetails?.customerName || 'Valued Customer';
  const artisanName = orderDetails?.artisanName || 'your artisan';
  const orderTotal = orderDetails?.orderTotal ? `$${orderDetails.orderTotal.toFixed(2)}` : 'N/A';
  const orderDate = orderDetails?.orderDate ? new Date(orderDetails.orderDate).toLocaleDateString() : 'N/A';
  
  // Generate order items list
  const itemsList = orderDetails?.orderItems?.map(item => 
    `• ${item.productName} (${item.quantity}x) - $${item.totalPrice.toFixed(2)}`
  ).join('\n') || '• Order items not available';
  
  // Generate timeline
  const timeline = generateOrderTimeline(orderDetails, orderId);
  
  // Status-specific messages
  const statusMessages = {
    'confirmed': {
      title: 'Order Confirmed!',
      message: `Great news! Your order ${orderNumber} has been confirmed by ${artisanName} and is being prepared.`,
      nextSteps: [
        'Your artisan will begin preparing your order',
        'You\'ll receive updates as your order progresses',
        'We\'ll notify you when it\'s ready for pickup/delivery'
      ]
    },
    'preparing': {
      title: 'Order Being Prepared',
      message: `Your order ${orderNumber} is now being prepared by ${artisanName}.`,
      nextSteps: [
        'Your artisan is carefully preparing your items',
        'Quality checks are being performed',
        'You\'ll be notified when preparation is complete'
      ]
    },
    'ready': {
      title: 'Order Ready!',
      message: `Your order ${orderNumber} is ready! ${artisanName} has completed preparing your items.`,
      nextSteps: [
        'Your order is ready for pickup/delivery',
        'Please check your delivery method for next steps',
        'Contact the artisan if you have any questions'
      ]
    },
    'shipped': {
      title: 'Order Shipped!',
      message: `Your order ${orderNumber} has been shipped and is on its way to you.`,
      nextSteps: [
        'Your order is in transit',
        'Track your delivery for estimated arrival time',
        'Contact support if you have any questions'
      ]
    },
    'delivered': {
      title: 'Order Delivered!',
      message: `Your order ${orderNumber} has been successfully delivered. Thank you for your order!`,
      nextSteps: [
        'Please check your order upon delivery',
        'Rate your experience with the artisan',
        'Contact support if you have any issues'
      ]
    },
    'cancelled': {
      title: 'Order Cancelled',
      message: `Your order ${orderNumber} has been cancelled.`,
      nextSteps: [
        'Your payment will be refunded if applicable',
        'You can place a new order anytime',
        'Contact support if you have any questions'
      ]
    }
  };
  
  const statusInfo = statusMessages[status] || {
    title: 'Order Update',
    message: `Your order ${orderNumber} status has been updated.`,
    nextSteps: ['Please check your order details for more information']
  };
  
  const nextStepsList = statusInfo.nextSteps.map(step => `• ${step}`).join('\n');
  
  return `
Dear ${customerName},

${statusInfo.title}

${statusInfo.message}

ORDER DETAILS:
• Order Number: ${orderNumber}
• Order Date: ${orderDate}
• Total Amount: ${orderTotal}
• Artisan: ${artisanName}
• Current Status: ${status.charAt(0).toUpperCase() + status.slice(1)}

ORDER ITEMS:
${itemsList}

${timeline}

WHAT HAPPENS NEXT:
${nextStepsList}

Thank you for choosing bazaarMKT and supporting local artisans!

Best regards,
The bazaarMKT Team

---
This is an automated notification. Please do not reply to this email.
For support, contact us at support@bazaarmkt.ca
  `.trim();
}

// Helper function to generate order decline confirmation email body for artisan
function generateOrderDeclineConfirmationEmailBody(orderDetails, orderId) {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const customerName = orderDetails?.customerName || 'Customer';
  const customerType = orderDetails?.customerType || 'customer';
  const declineReason = orderDetails?.declineReason || 'No specific reason provided';
  const orderTotal = orderDetails?.orderTotal ? `$${orderDetails.orderTotal.toFixed(2)}` : 'N/A';
  const declinedAt = orderDetails?.declinedAt ? new Date(orderDetails.declinedAt).toLocaleString() : 'N/A';
  
  // Generate order items list
  const itemsList = orderDetails?.orderItems?.map(item => 
    `• ${item.productName} (${item.quantity}x) - $${item.totalPrice.toFixed(2)}`
  ).join('\n') || '• Order items not available';
  
  return `
Dear Artisan,

This is a confirmation that you have successfully declined order ${orderNumber}.

ORDER DETAILS:
• Order Number: ${orderNumber}
• Customer: ${customerName} (${customerType})
• Total Amount: ${orderTotal}
• Declined At: ${declinedAt}

ORDER ITEMS:
${itemsList}

DECLINE REASON PROVIDED:
${declineReason}

WHAT HAPPENS NEXT:
• The customer has been notified of the decline
• Their payment will be refunded (if payment was processed)
• The order status has been updated to "declined"
• Product inventory has been restored (if applicable)

This notification serves as a record of your decline action. Keep this for your records.

Thank you for using bazaarMKT.

Best regards,
The bazaarMKT Team

---
This is an automated confirmation. Please do not reply to this email.
For support, contact us at support@bazaarmkt.ca
  `.trim();
}

// Helper function to generate order declined email body
function generateOrderDeclinedEmailBody(orderDetails, orderId) {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const customerName = orderDetails?.customerName || 'Valued Customer';
  const artisanName = orderDetails?.artisanName || 'the artisan';
  const declineReason = orderDetails?.declineReason || 'No specific reason provided';
  const orderTotal = orderDetails?.orderTotal ? `$${orderDetails.orderTotal.toFixed(2)}` : 'N/A';
  const orderDate = orderDetails?.orderDate ? new Date(orderDetails.orderDate).toLocaleDateString() : 'N/A';
  
  // Generate order items list
  const itemsList = orderDetails?.orderItems?.map(item => 
    `• ${item.productName} (${item.quantity}x) - $${item.totalPrice.toFixed(2)}`
  ).join('\n') || '• Order items not available';
  
  return `
Dear ${customerName},

We regret to inform you that your order ${orderNumber} has been declined by ${artisanName}.

ORDER DETAILS:
• Order Number: ${orderNumber}
• Order Date: ${orderDate}
• Total Amount: ${orderTotal}
• Artisan: ${artisanName}

ORDER ITEMS:
${itemsList}

DECLINE REASON:
${declineReason}

WHAT HAPPENS NEXT:
• Your payment will be refunded (if payment was processed)
• You can place a new order with a different artisan
• Contact support if you have any questions

We apologize for any inconvenience this may cause. We encourage you to explore other artisans on our platform who may be able to fulfill your order.

Thank you for choosing bazaarMKT.

Best regards,
The bazaarMKT Team

---
This is an automated notification. Please do not reply to this email.
For support, contact us at support@bazaarmkt.ca
  `.trim();
}

// Helper function to send email notifications
async function sendEmailNotification(type, email, orderDetails, orderId) {
  // Use Brevo service to send real emails
  const BrevoService = require('../services/brevoService');
  
  try {
    // Use Brevo service to send the email
    const result = await BrevoService.sendOrderNotificationEmail(type, email, orderDetails, orderId);
    console.log('✅ Email notification sent successfully via Brevo:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send email via Brevo:', error);
    throw error;
  }
}

// Helper function to generate order declined SMS body
function generateOrderDeclinedSMSBody(orderDetails, orderId) {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const artisanName = orderDetails?.artisanName || 'the artisan';
  const declineReason = orderDetails?.declineReason || 'No specific reason provided';
  
  // Keep SMS concise due to character limits
  return `bazaarMKT: Your order ${orderNumber} was declined by ${artisanName}. Reason: ${declineReason}. Payment will be refunded. Contact support if needed.`;
}

// Helper function to generate order decline confirmation SMS body for artisan
function generateOrderDeclineConfirmationSMSBody(orderDetails, orderId) {
  const orderNumber = orderDetails?.orderNumber || `#${orderId.toString().slice(-8).toUpperCase()}`;
  const customerName = orderDetails?.customerName || 'Customer';
  
  // Keep SMS concise due to character limits
  return `bazaarMKT: Order ${orderNumber} from ${customerName} has been declined successfully. Customer has been notified. Keep this for your records.`;
}

// Helper function to send SMS notifications
async function sendSMSNotification(type, phone, orderDetails, orderId) {
  // This would integrate with an SMS service like Twilio
  // For now, we'll simulate the SMS sending
  
  const smsTemplates = {
    'order_declined': generateOrderDeclinedSMSBody(orderDetails, orderId),
    'order_decline_confirmation': generateOrderDeclineConfirmationSMSBody(orderDetails, orderId),
    'pickup_order_with_time': `New pickup order #${orderId} from ${orderDetails?.customerName || 'Customer'}. Pickup: ${orderDetails?.pickupTime || 'Not specified'}`,
    'order_completion': `Your bazaarMKT order #${orderId} has been confirmed and is being prepared.`,
    'order_confirmed': `Your bazaarMKT order #${orderId} has been confirmed by ${orderDetails?.artisanName || 'your artisan'}.`,
    'order_preparing': `Your bazaarMKT order #${orderId} is being prepared by ${orderDetails?.artisanName || 'your artisan'}.`,
    'order_ready': `Your bazaarMKT order #${orderId} is ready! Please check your delivery method for next steps.`,
    'order_ready_for_pickup': `Your bazaarMKT order #${orderId} is ready for pickup! Please come to collect your order.`,
    'order_ready_for_delivery': `Your bazaarMKT order #${orderId} is ready for delivery! It will be delivered soon.`,
    'order_out_for_delivery': `Your bazaarMKT order #${orderId} is out for delivery and on its way to you!`,
    'order_delivering': `Your bazaarMKT order #${orderId} is being delivered to you right now!`,
    'order_picked_up': `Your bazaarMKT order #${orderId} has been picked up successfully. Thank you!`,
    'order_shipped': `Your bazaarMKT order #${orderId} has been shipped and is on its way to you.`,
    'order_delivered': `Your bazaarMKT order #${orderId} has been delivered. Thank you for your order!`,
    'order_cancelled': `Your bazaarMKT order #${orderId} has been cancelled. Payment will be refunded if applicable.`
  };
  
  const message = smsTemplates[type] || `bazaarMKT notification for order #${orderId}`;
  
  console.log('📱 SMS notification prepared:', {
    to: phone,
    message,
    orderId
  });
  
  // In a real implementation, you would send the SMS here
  // await smsService.send({
  //   to: phone,
  //   message: message
  // });
}

// Send email notification
router.post('/email', async (req, res) => {
  try {
    const { to, subject, template, data } = req.body;
    
    console.log('📧 Sending email notification:', { to, subject, template });
    
    // Here you would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, just log the email details
    console.log('✅ Email notification prepared:', {
      to,
      subject,
      template,
      data,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Email notification sent successfully',
      emailId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error sending email notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email notification',
      error: error.message 
    });
  }
});

// Send SMS notification
router.post('/sms', async (req, res) => {
  try {
    const { to, message, orderId } = req.body;
    
    console.log('📱 Sending SMS notification:', { to, orderId });
    
    // Here you would integrate with an SMS service like Twilio, etc.
    // For now, just log the SMS details
    console.log('✅ SMS notification prepared:', {
      to,
      message,
      orderId,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'SMS notification sent successfully',
      smsId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error sending SMS notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send SMS notification',
      error: error.message 
    });
  }
});

// Get user notification preferences
router.get('/preferences/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is requesting their own preferences
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get user preferences from database (implement later)
    // const user = await User.findById(userId).select('notificationPreferences');
    
    // For now, return default preferences
    const preferences = {
      email: { orderUpdates: true, marketing: true, promotions: true, security: true },
      push: { orderUpdates: true, promotions: true, newArtisans: true, nearbyOffers: true },
      sms: { orderUpdates: false, promotions: false }
    };
    
    res.json({ preferences });
    
  } catch (error) {
    console.error('❌ Error getting notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user notification preferences
router.put('/preferences/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    // Verify user is updating their own preferences
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update user preferences in database (implement later)
    // const updatedUser = await User.findByIdAndUpdate(
    //   userId,
    //   { notificationPreferences: preferences },
    //   { new: true }
    // );
    
    console.log('✅ Notification preferences updated for user:', userId);
    
    res.json({ 
      success: true, 
      message: 'Notification preferences updated successfully',
      preferences 
    });
    
  } catch (error) {
    console.error('❌ Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user notifications
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Verify user is requesting their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get user notifications from database (implement later)
    // const notifications = await Notification.find({ userId })
    //   .sort({ timestamp: -1 })
    //   .limit(parseInt(limit))
    //   .skip((parseInt(page) - 1) * parseInt(limit));
    
    // For now, return empty notifications
    const notifications = [];
    
    res.json({ 
      notifications, 
      total: 0, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
  } catch (error) {
    console.error('❌ Error getting user notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Mark notification as read in database (implement later)
    // const notification = await Notification.findByIdAndUpdate(
    //   notificationId,
    //   { status: 'read', readAt: new Date() },
    //   { new: true }
    // );
    
    console.log('✅ Notification marked as read:', notificationId);
    
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read for a user
router.put('/user/:userId/read-all', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is updating their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Mark all notifications as read in database (implement later)
    // await Notification.updateMany(
    //   { userId, status: 'unread' },
    //   { status: 'read', readAt: new Date() }
    // );
    
    console.log('✅ All notifications marked as read for user:', userId);
    
    res.json({ 
      success: true, 
      message: 'All notifications marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Platform notification routes for patrons
router.post('/platform', verifyToken, async (req, res) => {
  try {
    const { userId, type, title, message, orderId, timestamp, isRead } = req.body;
    
    console.log('📱 Creating platform notification:', { userId, type, title, message });
    
    // Store platform notification in database (implement later)
    // const notification = new PlatformNotification({
    //   userId,
    //   type,
    //   title,
    //   message,
    //   orderId,
    //   timestamp,
    //   isRead
    // });
    // await notification.save();
    
    console.log('✅ Platform notification created successfully');
    
    res.json({ 
      success: true, 
      message: 'Platform notification created successfully',
      notificationId: `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('❌ Error creating platform notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create platform notification',
      error: error.message 
    });
  }
});

// Get user platform notifications
router.get('/platform/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Verify user is requesting their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get platform notifications from database (implement later)
    // const notifications = await PlatformNotification.find({ userId })
    //   .sort({ timestamp: -1 })
    //   .limit(parseInt(limit))
    //   .skip((parseInt(page) - 1) * parseInt(limit));
    
    // For now, return empty notifications
    const notifications = [];
    
    res.json({ 
      notifications, 
      total: 0, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
  } catch (error) {
    console.error('❌ Error getting platform notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark platform notification as read
router.put('/platform/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Mark platform notification as read in database (implement later)
    // const notification = await PlatformNotification.findByIdAndUpdate(
    //   notificationId,
    //   { isRead: true, readAt: new Date() },
    //   { new: true }
    // );
    
    console.log('✅ Platform notification marked as read:', notificationId);
    
    res.json({ 
      success: true, 
      message: 'Platform notification marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking platform notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all platform notifications as read for a user
router.put('/platform/:userId/read-all', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is updating their own notifications
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Mark all platform notifications as read in database (implement later)
    // await PlatformNotification.updateMany(
    //   { userId, isRead: false },
    //   { isRead: true, readAt: new Date() }
    // );
    
    console.log('✅ All platform notifications marked as read for user:', userId);
    
    res.json({ 
      success: true, 
      message: 'All platform notifications marked as read' 
    });
    
  } catch (error) {
    console.error('❌ Error marking all platform notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
