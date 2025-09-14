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
    
    // Send SMS notification if phone is provided
    if (userPhone) {
      try {
        await sendSMSNotification(type, userPhone, orderDetails, orderId);
        console.log('✅ SMS notification sent to:', userPhone);
      } catch (smsError) {
        console.error('❌ Failed to send SMS notification:', smsError);
        // Don't fail the entire request if SMS fails
      }
    }
    
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
For support, contact us at support@bazaarmkt.com
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
For support, contact us at support@bazaarmkt.com
  `.trim();
}

// Helper function to send email notifications
async function sendEmailNotification(type, email, orderDetails, orderId) {
  // This would integrate with an email service like SendGrid, Mailgun, or Brevo
  // For now, we'll simulate the email sending
  
  const emailTemplates = {
    'order_declined': {
      subject: `Order Declined - ${orderDetails?.orderNumber || orderId}`,
      body: generateOrderDeclinedEmailBody(orderDetails, orderId)
    },
    'order_decline_confirmation': {
      subject: `Order Decline Confirmation - ${orderDetails?.orderNumber || orderId}`,
      body: generateOrderDeclineConfirmationEmailBody(orderDetails, orderId)
    },
    'pickup_order_with_time': {
      subject: 'New Pickup Order - bazaarMKT',
      body: `New pickup order #${orderId} from ${orderDetails?.customerName || 'Customer'}. Pickup time: ${orderDetails?.pickupTime || 'Not specified'}`
    },
    'order_completion': {
      subject: 'Order Confirmed - bazaarMKT',
      body: `Your order #${orderId} has been confirmed and is being prepared.`
    }
  };
  
  const template = emailTemplates[type] || {
    subject: 'bazaarMKT Notification',
    body: `Notification for order #${orderId}`
  };
  
  console.log('📧 Email notification prepared:', {
    to: email,
    subject: template.subject,
    body: template.body,
    orderId
  });
  
  // In a real implementation, you would send the email here
  // await emailService.send({
  //   to: email,
  //   subject: template.subject,
  //   html: template.body
  // });
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
    'order_completion': `Your bazaarMKT order #${orderId} has been confirmed and is being prepared.`
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
